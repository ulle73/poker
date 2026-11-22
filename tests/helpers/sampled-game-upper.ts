import { applyAction, legalActions } from "../../src/decision/betting";
import { settlePayoffs } from "../../src/decision/payoffs";
import type { BettingState, DecisionInput, DecisionPolicy } from "../../src/decision/types";

export interface EvaluationWorld {
  holes: number[][];
  runout: number[];
  scores: number[];
}

export type ContinuationChoices = Map<string, Map<number, number>>;
export type VisibleHandKey = (state: BettingState, hand: readonly number[], board: readonly number[]) => number;
type BucketPolicy = { key: (hand: readonly number[], board: readonly number[]) => number;
  bind: (state: BettingState) => readonly (readonly number[])[] };

export function completePublicTree(input: DecisionInput) {
  const tree: { state: BettingState; children: number[] }[] = [];
  const build = (state: BettingState): number => {
    const children = state.terminal ? [] : legalActions(state, input.rules)
      .filter((action) => state !== input.state || !input.rootKinds || input.rootKinds.includes(action.kind))
      .map((action) => build(applyAction(state, action, input.rules)));
    tree.push({ state, children });
    return tree.length - 1;
  };
  build(input.state);
  return tree;
}

/** Betting histories and streets that settle identically share a cache. */
export function terminalPayoffTables(tree: ReturnType<typeof completePublicTree>) {
  const bySettlement = new Map<string, Map<number, number[]>>();
  return tree.map(({ state }) => {
    if (!state.terminal) return undefined;
    const id = [state.dealer, state.deadPot, ...state.invested, ...state.folded].join("/");
    let cache = bySettlement.get(id);
    if (!cache) {
      cache = new Map();
      bySettlement.set(id, cache);
    }
    return cache;
  });
}

/** Sample-average optimization conditional on the deviator's own private pair.
 * A policy in this sampled game cannot choose a different action for two draws
 * with the same information. The expectation of the per-batch optimum bounds
 * the true legal optimum above, since every fixed legal policy is also feasible
 * in every sampled game. Opponents stay fixed to the exported average policy. */
export function sampledGameSeatUpper(
  input: DecisionInput,
  policy: DecisionPolicy,
  seat: number,
  batchCount: number,
  batchSize: number,
  nextBatch: () => EvaluationWorld[],
  bucketPolicy?: BucketPolicy,
) {
  return optimizeSampledGame(input, policy, seat, batchCount, batchSize, nextBatch, undefined, bucketPolicy);
}

/**
 * Same sampled game as sampledGameSeatUpper, with reach-weighted responses.
 * Only the current path and its immediate action values occupy scratch space.
 */
export function compactSampledGameSeatUpper(
  input: DecisionInput,
  seat: number,
  batchCount: number,
  batchSize: number,
  nextBatch: () => Iterable<EvaluationWorld>,
  policy: BucketPolicy,
  cutoff = 0,
) {
  const tree = completePublicTree(input);
  const stages = 3;
  const root = tree.length - 1;
  const maxActions = Math.max(...tree.map(({ children }) => children.length));
  const payoffs = terminalPayoffTables(tree);
  const strongest = input.seats.map((player) => Number(player !== seat));
  const weakest = input.seats.map((player) => Number(player === seat));
  const payoffLimits: { low: number; high: number }[] = [];
  for (const { state, children } of tree) {
    // A seat's pot award is monotone in its showdown rank. The tree is
    // postordered, so an interval can also enclose every child continuation.
    payoffLimits.push(state.terminal
      ? { low: settlePayoffs(state, weakest)[seat], high: settlePayoffs(state, strongest)[seat] }
      : { low: Math.min(...children.map((child) => payoffLimits[child].low)),
        high: Math.max(...children.map((child) => payoffLimits[child].high)) });
  }
  const rows = tree.map(({ state }) => state.terminal ? undefined : policy.bind(state));
  const handKeys = Array.from({ length: input.seats.length * stages }, () => new Uint16Array(batchSize));
  const turnKeys = new Uint16Array(batchSize), riverKeys = new Uint16Array(batchSize);
  const patterns = new Int32Array(batchSize);
  const showdownScores = new Float64Array(batchSize * input.seats.length);
  const vector = () => new Float64Array(batchSize);
  const ones = vector().fill(1), rootResponse = vector();
  const rootWorlds = Uint32Array.from({ length: batchSize }, (_, w) => w);
  const byDepth: ReturnType<typeof makeScratch>[] = [];
  function makeScratch() {
    return {
      active: new Uint32Array(batchSize), opponent: vector(), profile: vector(),
      values: Array.from({ length: maxActions }, vector),
      totals: Array.from({ length: maxActions }, () => new Float64Array(52 ** 2)),
      choices: new Uint8Array(52 ** 2),
    };
  }
  const gains: number[] = [];
  let sum = 0, squares = 0;
  let baseline = 0;

  function visit(index: number, depth: number, active: Uint32Array, count: number,
    opponent: Float64Array, profile: Float64Array, out: Float64Array) {
    const { state, children } = tree[index];
    const { low, high } = payoffLimits[index];
    if (low === high) {
      for (let i = 0; i < count; i++) {
        const w = active[i];
        out[w] = opponent[w] * low;
        baseline += profile[w] * low;
      }
      return;
    }
    if (state.terminal) {
      const cache = payoffs[index]!;
      for (let i = 0; i < count; i++) {
        const w = active[i];
        let value = cache.get(patterns[w])?.[seat];
        if (value === undefined) {
          const firstScore = w * input.seats.length;
          const settled = settlePayoffs(state, Array.from(showdownScores.subarray(firstScore, firstScore + input.seats.length)));
          cache.set(patterns[w], settled);
          value = settled[seat];
        }
        out[w] = opponent[w] * value;
        baseline += profile[w] * value;
      }
      return;
    }

    const work = byDepth[depth] ?? (byDepth[depth] = makeScratch());
    const stage = state.boardCount - 3;
    const keys = handKeys[state.actor * stages + stage];
    const mixes = rows[index]!;
    if (state.actor !== seat) {
      for (let i = 0; i < count; i++) out[active[i]] = 0;
      const childValue = work.values[0];
      for (let a = 0; a < children.length; a++) {
        const child = children[a];
        const limit = payoffLimits[child];
        let reached = 0;
        for (let i = 0; i < count; i++) {
          const w = active[i];
          const p = mixes[keys[w]][a];
          const mass = opponent[w] * p;
          if (!mass) continue;
          const baselineMass = profile[w] * p;
          // The stopped continuation is fixed by the world and the opponents'
          // strategy. Optimistic response and pessimistic baseline payouts
          // preserve an upper bound for every feasible deviation.
          if (mass < cutoff) {
            out[w] += mass * limit.high;
            baseline += baselineMass * limit.low;
            continue;
          }
          work.active[reached++] = w;
          work.opponent[w] = mass;
          work.profile[w] = baselineMass;
        }
        if (!reached) continue;
        visit(child, depth + 1, work.active, reached, work.opponent, work.profile, childValue);
        for (let i = 0; i < reached; i++) {
          const w = work.active[i];
          out[w] += childValue[w];
        }
      }
      return;
    }

    const groups = state.boardCount === input.board.length ? undefined : stage === 1 ? turnKeys : riverKeys;
    for (let a = 0; a < children.length; a++) {
      const values = work.values[a], totals = work.totals[a];
      for (let i = 0; i < count; i++) {
        const w = active[i];
        work.profile[w] = profile[w] * mixes[keys[w]][a];
      }
      visit(children[a], depth + 1, active, count, opponent, work.profile, values);
      totals.fill(0);
      if (groups) {
        for (let i = 0; i < count; i++) {
          const w = active[i];
          totals[groups[w]] += values[w];
        }
      } else {
        for (let i = 0; i < count; i++) totals[0] += values[active[i]];
      }
    }
    for (let group = 0; group < (groups ? (stage === 1 ? 52 : 52 ** 2) : 1); group++) {
      let best = 0;
      for (let a = 1; a < children.length; a++) {
        if (work.totals[a][group] > work.totals[best][group]) best = a;
      }
      work.choices[group] = best;
    }
    if (groups) {
      for (let i = 0; i < count; i++) {
        const w = active[i];
        out[w] = work.values[work.choices[groups[w]]][w];
      }
    } else {
      const values = work.values[work.choices[0]];
      for (let i = 0; i < count; i++) out[active[i]] = values[active[i]];
    }
  }

  for (let batch = 0; batch < batchCount; batch++) {
    let firstPair: number[] | undefined;
    let w = 0;
    baseline = 0;
    for (const { holes, runout, scores } of nextBatch()) {
      if (w >= batchSize) throw new Error("Sampled-game batch has wrong size");
      firstPair ??= [...holes[seat]];
      if (holes[seat][0] !== firstPair[0] || holes[seat][1] !== firstPair[1])
        throw new Error("Sampled-game batch must share the deviator's private pair");
      const boards = [runout.slice(0, 3), runout.slice(0, 4), runout];
      turnKeys[w] = runout[3];
      riverKeys[w] = runout[3] * 52 + runout[4];
      for (let player = 0; player < holes.length; player++) {
        for (let stage = input.board.length - 3; stage < stages; stage++) {
          handKeys[player * stages + stage][w] = policy.key(holes[player], boards[stage]);
        }
      }
      let pattern = 0;
      for (let a = 0; a < scores.length; a++) {
        for (let b = a + 1; b < scores.length; b++) {
          pattern = 3 * pattern + Math.sign(scores[a] - scores[b]) + 1;
        }
      }
      patterns[w] = pattern;
      showdownScores.set(scores, w * input.seats.length);
      w++;
    }
    if (w !== batchSize) throw new Error("Sampled-game batch has wrong size");
    visit(root, 0, rootWorlds, batchSize, ones, ones, rootResponse);
    const response = rootResponse.reduce((total, value) => total + value, 0);
    const gain = (response - baseline) / batchSize;
    if (gain < -1e-7) throw new Error("Sampled optimum underperforms a feasible profile");
    const sample = Math.max(0, gain);
    sum += sample;
    squares += sample * sample;
    gains.push(sample);
  }
  const mean = sum / batchCount;
  const variance = batchCount > 1 ? Math.max(0, squares - sum * mean) / (batchCount - 1) : 0;
  return { mean, variance, gains, publicNodes: tree.length };
}

/** Fit one feasible response from training worlds. The last option keeps the
 * frozen local mix, while allowing the fitted response at later decisions. */
export function fitContinuationResponse(input: DecisionInput, policy: DecisionPolicy, seat: number,
  worlds: EvaluationWorld[], key: VisibleHandKey, keep?: (state: BettingState) => boolean) {
  const choices: ContinuationChoices = new Map();
  optimizeSampledGame(input, policy, seat, 1, worlds.length, () => worlds, { key, choices, keep });
  return choices;
}

function optimizeSampledGame(
  input: DecisionInput,
  policy: DecisionPolicy,
  seat: number,
  batchCount: number,
  batchSize: number,
  nextBatch: () => EvaluationWorld[],
  fit?: { key: VisibleHandKey; choices: ContinuationChoices; keep?: (state: BettingState) => boolean },
  bucketPolicy?: BucketPolicy,
) {
  const tree = completePublicTree(input);
  const optimize = tree.map(({ state }) => !state.terminal && state.actor === seat && !fit?.keep?.(state));
  const root = tree.length - 1;
  const maxActions = Math.max(...tree.map(({ children }) => children.length));
  const cells = tree.length * batchSize;
  const probabilities = new Float64Array(cells * maxActions);
  const opponentReach = new Float64Array(cells);
  const best = new Float64Array(cells);
  const baseline = new Float64Array(cells);
  const keys = new Int32Array(batchSize);
  const terminalPayoffs = terminalPayoffTables(tree);
  const boundRows = bucketPolicy && tree.map(({ state }) => state.terminal ? [] : bucketPolicy.bind(state));
  const gains = [];
  let sum = 0, squares = 0;

  for (let batch = 0; batch < batchCount; batch++) {
    const worlds = nextBatch();
    if (worlds.length !== batchSize) throw new Error("Sampled-game batch has wrong size");
    const firstPair = worlds[0].holes[seat];
    if (!fit && worlds.some(({ holes }) => holes[seat].some((card, i) => card !== firstPair[i])))
      throw new Error("Sampled-game batch must share the deviator's private pair");
    const visible = worlds.map(({ runout }) => [runout.slice(0, 3), runout.slice(0, 4), runout]);
    const buckets = bucketPolicy && worlds.map(({ holes }, w) => holes.map((hand) =>
      visible[w].map((board) => bucketPolicy.key(hand, board))));
    const patterns = worlds.map(({ scores }) => {
      let pattern = 0;
      for (let a = 0; a < scores.length; a++) {
        for (let b = a + 1; b < scores.length; b++)
          pattern = 3 * pattern + Math.sign(scores[a] - scores[b]) + 1;
      }
      return pattern;
    });
    opponentReach.fill(1, root * batchSize);
    for (let node = root; node >= 0; node--) {
      const { state, children } = tree[node];
      for (let w = 0; w < batchSize; w++) {
        const cell = node * batchSize + w;
        if (state.terminal) {
          const cache = terminalPayoffs[node]!;
          let payoffs = cache.get(patterns[w]);
          if (!payoffs) {
            payoffs = settlePayoffs(state, worlds[w].scores);
            cache.set(patterns[w], payoffs);
          }
          baseline[cell] = best[cell] = payoffs[seat];
          continue;
        }
        const stage = state.boardCount - 3;
        const mix = boundRows && buckets ? boundRows[node][buckets[w][state.actor][stage]]
          : policy.query(state, worlds[w].holes[state.actor], visible[w][stage]).frequencies;
        for (let a = 0; a < children.length; a++) {
          const frequency = mix[a];
          probabilities[cell * maxActions + a] = frequency;
          opponentReach[children[a] * batchSize + w] = opponentReach[cell]
            * (optimize[node] ? 1 : frequency);
        }
      }
    }

    for (let node = 0; node <= root; node++) {
      const { state, children } = tree[node];
      if (state.terminal) continue;
      const groups = new Map<number, Float64Array>();
      const fixedBoardGroup = !fit && state.boardCount === input.board.length
        ? new Float64Array(children.length) : undefined;
      const groupKey = (w: number) => {
        if (fit) return fit.key(state, worlds[w].holes[seat], visible[w][state.boardCount - 3]);
        const [, , , turn, river] = worlds[w].runout;
        switch (state.boardCount) {
          case 3: return 0;
          case 4: return turn;
          default: return turn * 52 + river;
        }
      };
      for (let w = 0; w < batchSize; w++) {
        const cell = node * batchSize + w;
        let base = 0, response = 0;
        for (let a = 0; a < children.length; a++) {
          const child = children[a] * batchSize + w;
          const frequency = probabilities[cell * maxActions + a];
          base += frequency * baseline[child];
          response += frequency * best[child];
        }
        baseline[cell] = base;
        if (!optimize[node]) {
          best[cell] = response;
          continue;
        }
        const key = fixedBoardGroup ? 0 : groupKey(w);
        keys[w] = key;
        const totals = fixedBoardGroup ?? groups.get(key) ?? new Float64Array(children.length + Number(Boolean(fit)));
        for (let a = 0; a < children.length; a++) {
          totals[a] += opponentReach[cell] * best[children[a] * batchSize + w];
        }
        if (fit) {
          totals[children.length] += opponentReach[cell] * response;
          best[cell] = response;
        }
        if (!fixedBoardGroup) groups.set(key, totals);
      }
      if (optimize[node]) {
        if (fixedBoardGroup) {
          const bestAction = fixedBoardGroup.indexOf(Math.max(...fixedBoardGroup));
          for (let w = 0; w < batchSize; w++) {
            best[node * batchSize + w] = best[children[bestAction] * batchSize + w];
          }
          continue;
        }
        const choices = new Map<number, number>();
        for (const [key, totals] of groups) choices.set(key, totals.indexOf(Math.max(...totals)));
        if (fit) fit.choices.set(state.history, choices);
        for (let w = 0; w < batchSize; w++) {
          const chosen = choices.get(keys[w]);
          if (chosen === undefined) throw new Error("Sampled-game action selection missing");
          if (chosen < children.length) best[node * batchSize + w] = best[children[chosen] * batchSize + w];
        }
      }
    }
    let gain = 0;
    for (let w = 0; w < batchSize; w++) gain += best[root * batchSize + w] - baseline[root * batchSize + w];
    gain /= batchSize;
    if (!fit && gain < -1e-8) throw new Error("Sampled optimum underperforms a feasible profile");
    sum += Math.max(0, gain);
    squares += gain * gain;
    gains.push(Math.max(0, gain));
  }
  const mean = sum / batchCount;
  const variance = batchCount > 1 ? Math.max(0, squares - sum * mean) / (batchCount - 1) : 0;
  return { mean, variance, gains, publicNodes: tree.length };
}
