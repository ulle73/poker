import { evaluateCardCodes } from "phe";
import { legalActions } from "../../src/decision/betting";
import { settlePayoffs } from "../../src/decision/payoffs";
import type { DecisionInput, DecisionPolicy } from "../../src/decision/types";
import { completePublicTree, terminalPayoffTables, type EvaluationWorld } from "./sampled-game-upper";

export const continuationEncoding = "rank-24-flush-draw-v1";
type BoardHandKey = (hand: readonly number[], board: readonly number[]) => number;

export function encodingRows(visibleCards: number, rootCards: number) {
  return visibleCards === rootCards ? 52 ** 2 : visibleCards === 4 ? 49 : 25;
}

export function pairKey(a: number, b: number) {
  return Math.min(a, b) * 52 + Math.max(a, b);
}

/** The first three public cards must be fixed for this key's lifetime. */
export function strengthBucketKey(deck: number[], exactThrough = 3): BoardHandKey {
  const rankedBoards = new Map<number, number[]>();
  const keys = new Uint8Array((52 + 52 ** 2) * 52 ** 2);
  const bucketCount = 24;
  return ([a, b], board) => {
    if (board.length <= exactThrough) return pairKey(a, b);
    const turn = board[3];
    const boardKey = board.length === 4 ? turn : 52 + pairKey(turn, board[4]);
    const cachedKey = boardKey * 52 ** 2 + pairKey(a, b);
    if (keys[cachedKey]) return keys[cachedKey];
    let ranks = rankedBoards.get(boardKey);
    if (!ranks) {
      const unseen = deck.filter((card) => !board.includes(card));
      ranks = unseen.flatMap((first, index) => unseen.slice(index + 1)
        .map((second) => evaluateCardCodes([...board, first, second]))).sort((x, y) => x - y);
      rankedBoards.set(boardKey, ranks);
    }
    const rank = evaluateCardCodes([...board, a, b]);
    let low = 0, high = ranks.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (ranks[mid] < rank) low = mid + 1;
      else high = mid;
    }
    let draw = false;
    if (board.length === 4) {
      const suits = [0, 0, 0, 0];
      for (const card of board) suits[card & 3]++;
      suits[a & 3]++;
      suits[b & 3]++;
      draw = suits.includes(4);
    }
    const key = 1 + Math.floor(bucketCount * low / ranks.length) + (draw ? bucketCount : 0);
    keys[cachedKey] = key;
    return key;
  };
}

/** Chance-sampled CFR. All betting branches are expanded for each sampled
 * world, using the same pre-update policy for every player's regret update. */
export function trainChanceSampled(input: DecisionInput, key: BoardHandKey, iterations: number,
  nextWorld: () => EvaluationWorld): DecisionPolicy {
  const playerCount = input.seats.length;
  const publicTree = completePublicTree(input);
  const nodes = publicTree.map(({ state, children }, node) => {
    const actions = state.terminal ? [] : legalActions(state, input.rules).filter((action) =>
      state !== input.state || !input.rootKinds || input.rootKinds.includes(action.kind));
    const rows = encodingRows(state.boardCount, input.board.length);
    const cells = actions.length * rows;
    return { state, actions, children, node, rows, offset: node * playerCount,
      regret: new Float64Array(cells), average: new Float64Array(cells), mix: new Float64Array(actions.length),
      row: 0 };
  });
  const nodeByHistory = new Map(nodes.filter(({ state }) => !state.terminal).map((node) => [node.state.history, node]));
  const reach = new Float64Array(nodes.length * playerCount);
  const values = new Float64Array(reach.length);
  const terminalPayoffs = terminalPayoffTables(publicTree);
  const root = nodes.at(-1)!;
  reach.fill(1, root.offset);

  for (let i = 0; i < iterations; i++) {
    const { holes, runout, scores } = nextWorld();
    const visible = [runout.slice(0, 3), runout.slice(0, 4), runout];
    const keys = holes.map((hand) => visible.map((board) => key(hand, board)));
    let pattern = 0;
    for (let a = 0; a < playerCount; a++) {
      for (let b = a + 1; b < playerCount; b++) pattern = 3 * pattern + Math.sign(scores[a] - scores[b]) + 1;
    }
    const weight = 1 + (i >>> 16);
    for (let node = root.node; node >= 0; node--) {
      const entry = nodes[node];
      const { state, actions, children, offset, regret, average, mix } = entry;
      const count = actions.length;
      if (state.terminal) {
        const cache = terminalPayoffs[node]!;
        let payoff = cache.get(pattern);
        if (!payoff) {
          payoff = settlePayoffs(state, scores);
          cache.set(pattern, payoff);
        }
        values.set(payoff, offset);
        continue;
      }
      const actor = state.actor;
      entry.row = keys[actor][state.boardCount - 3] * count;
      let total = 0;
      for (let a = 0; a < count; a++) {
        mix[a] = Math.max(0, regret[entry.row + a]);
        total += mix[a];
      }
      for (let a = 0; a < count; a++) {
        const probability = total ? mix[a] / total : 1 / count;
        mix[a] = probability;
        average[entry.row + a] += weight * reach[offset + actor] * probability;
        const child = nodes[children[a]].offset;
        for (let p = 0; p < playerCount; p++) {
          reach[child + p] = reach[offset + p] * (p === actor ? probability : 1);
        }
      }
    }
    for (const { state, children, offset, row, mix, regret } of nodes) {
      if (state.terminal) continue;
      const actor = state.actor;
      let otherReach = 1;
      for (let p = 0; p < playerCount; p++) {
        values[offset + p] = 0;
        if (p !== actor) otherReach *= reach[offset + p];
      }
      for (let a = 0; a < children.length; a++) {
        const child = nodes[children[a]].offset;
        for (let p = 0; p < playerCount; p++) values[offset + p] += mix[a] * values[child + p];
      }
      for (let a = 0; a < children.length; a++) {
        regret[row + a] += weight * otherReach * (values[nodes[children[a]].offset + actor] - values[offset + actor]);
      }
    }
  }

  const frequencies = (average: Float64Array, row: number, count: number) => {
    const weights = average.slice(row * count, (row + 1) * count);
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    return { trained: total > 0, frequencies: Array.from(weights, (weight) => total ? weight / total : 1 / count) };
  };
  return {
    query(state, ownCards, board) {
      const node = nodeByHistory.get(state.history);
      if (!node) throw new Error("Chance-sampled policy has no such decision");
      return { actions: node.actions, ...frequencies(node.average, key(ownCards, board), node.actions.length) };
    },
    *trainedTables() {
      for (const { state, rows, average, actions } of nodeByHistory.values()) {
        const table = new Map<number, number[]>();
        for (let row = 0; row < rows; row++) {
          const { trained, frequencies: mix } = frequencies(average, row, actions.length);
          if (trained) table.set(row, mix);
        }
        if (table.size) yield { history: state.history, actionIds: actions.map(({ id }) => id), rows: table };
      }
    },
  };
}
