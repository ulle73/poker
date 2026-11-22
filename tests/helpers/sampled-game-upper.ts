import { applyAction, legalActions } from "../../src/decision/betting";
import { settlePayoffs } from "../../src/decision/payoffs";
import type { BettingState, DecisionInput, DecisionPolicy } from "../../src/decision/types";

export interface EvaluationWorld {
  holes: number[][];
  runout: number[];
  scores: number[];
}

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
) {
  const tree = completePublicTree(input);
  const root = tree.length - 1;
  const maxActions = Math.max(...tree.map(({ children }) => children.length));
  const cells = tree.length * batchSize;
  const probabilities = new Float64Array(cells * maxActions);
  const opponentReach = new Float64Array(cells);
  const best = new Float64Array(cells);
  const baseline = new Float64Array(cells);
  const terminalPayoffs = tree.map(() => new Map<number, number>());
  let sum = 0, squares = 0;

  for (let batch = 0; batch < batchCount; batch++) {
    const worlds = nextBatch();
    if (worlds.length !== batchSize) throw new Error("Sampled-game batch has wrong size");
    const firstPair = worlds[0].holes[seat];
    if (worlds.some(({ holes }) => holes[seat].some((card, i) => card !== firstPair[i])))
      throw new Error("Sampled-game batch must share the deviator's private pair");
    const visible = worlds.map(({ runout }) => [runout.slice(0, 3), runout.slice(0, 4), runout]);
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
          let payout = terminalPayoffs[node].get(patterns[w]);
          if (payout === undefined) {
            payout = settlePayoffs(state, worlds[w].scores)[seat];
            terminalPayoffs[node].set(patterns[w], payout);
          }
          baseline[cell] = best[cell] = payout;
          continue;
        }
        const row = policy.query(state, worlds[w].holes[state.actor], visible[w][state.boardCount - 3]);
        for (let a = 0; a < children.length; a++) {
          const frequency = row.frequencies[a];
          probabilities[cell * maxActions + a] = frequency;
          opponentReach[children[a] * batchSize + w] = opponentReach[cell]
            * (state.actor === seat ? 1 : frequency);
        }
      }
    }

    for (let node = 0; node <= root; node++) {
      const { state, children } = tree[node];
      if (state.terminal) continue;
      const groups = new Map<number, number[]>();
      const groupKey = (w: number) => {
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
        if (state.actor !== seat) {
          best[cell] = response;
          continue;
        }
        const key = groupKey(w);
        const totals = groups.get(key) ?? children.map(() => 0);
        for (let a = 0; a < children.length; a++) {
          totals[a] += opponentReach[cell] * best[children[a] * batchSize + w];
        }
        groups.set(key, totals);
      }
      if (state.actor === seat) {
        const choices = new Map<number, number>();
        for (const [key, totals] of groups) choices.set(key, totals.indexOf(Math.max(...totals)));
        for (let w = 0; w < batchSize; w++) {
          const chosen = choices.get(groupKey(w));
          if (chosen === undefined) throw new Error("Sampled-game action selection missing");
          best[node * batchSize + w] = best[children[chosen] * batchSize + w];
        }
      }
    }
    let gain = 0;
    for (let w = 0; w < batchSize; w++) gain += best[root * batchSize + w] - baseline[root * batchSize + w];
    gain /= batchSize;
    if (gain < -1e-8) throw new Error("Sampled optimum underperforms a feasible profile");
    sum += Math.max(0, gain);
    squares += gain * gain;
  }
  const mean = sum / batchCount;
  const variance = Math.max(0, squares - sum * mean) / (batchCount - 1);
  return { mean, variance, publicNodes: tree.length };
}
