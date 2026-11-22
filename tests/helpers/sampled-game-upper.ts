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
