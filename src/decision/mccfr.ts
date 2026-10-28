/*
 * External-sampling traversal adapted from OpenSpiel:
 * Copyright 2019 DeepMind Technologies Limited
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * TypeScript poker integration, bounded continuation, public keys and chance
 * importance weighting added for this application. Reference:
 * https://github.com/google-deepmind/open_spiel/blob/master/open_spiel/python/algorithms/external_sampling_mccfr.py
 */
import { cardCode, evaluateCardCodes } from "phe";
import { createSeededRandom } from "../multiway/equity";
import { applyAction, legalActions } from "./betting";
import { settlePayoffs } from "./payoffs";
import { createDealSampler } from "./sampler";
import type {
  BettingState,
  DecisionInput,
  DecisionResult,
  SolveOptions,
} from "./types";
interface InformationSet {
  regrets: number[];
  average: number[];
}
/** Only this player's private cards and information available at this node.
 * Other seats' cards and the unrevealed suffix of a sampled runout never enter
 * the key. Keeping the complete public history preserves perfect recall.
 */
export function informationSetKey(
  rootKey: string,
  state: BettingState,
  ownCards: readonly number[],
  runout: readonly number[],
): string {
  return JSON.stringify([
    rootKey,
    state.actor,
    [...ownCards].sort((a, b) => a - b),
    runout.slice(0, state.boardCount),
    state.street,
    state.history,
    state.stacks,
    state.bets,
    state.invested,
    state.folded,
    state.pending,
    state.canRaise,
    state.currentBet,
    state.lastFullRaise,
    state.minBet,
    state.deadPot,
    state.raises,
    state.dealer,
  ]);
}
/** Regret matching uses cumulative signed regrets, not accumulated action EV. */
export function regretMatching(regrets: readonly number[]): number[] {
  const positive = regrets.map((value) => Math.max(0, value));
  const sum = positive.reduce((a, b) => a + b, 0);
  return sum > 0
    ? positive.map((value) => value / sum)
    : positive.map(() => 1 / positive.length);
}
function boundedInteger(
  value: number | undefined,
  fallback: number,
  limit: number,
  label: string,
): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 1)
    throw new Error(`${label} must be a positive integer.`);
  return Math.min(value, limit);
}
/** A finite betting abstraction solved with external-sampling MCCFR.
 * One iteration updates each player; opponent actions follow their own policy,
 * while every updater action is expanded. Chance is sampled jointly in advance
 * but revealed to the policy only as streets advance. Every player's regret
 * update is corrected for the sampler's actual-hand oversampling proposal.
 *
 * The SIMPLE average follows OpenSpiel's cyclic-next-player implementation.
 * It is intentionally identified as an empirical approximation for >2 players.
 * Depth/node/table/deadline cuts use a card-independent passive policy; terminal
 * payoffs alone inspect hidden cards. These cuts introduce continuation bias.
 */
export function solveDecision(
  input: DecisionInput,
  options: SolveOptions = {},
): DecisionResult {
  const started = Date.now();
  const n = input.state.stacks.length;
  if (
    n < 2 ||
    n > 10 ||
    input.seats.length !== n ||
    !Number.isInteger(input.hero) ||
    input.hero < 0 ||
    input.hero >= n
  )
    throw new Error("A decision requires 2–10 seats and a valid hero index.");
  if (
    input.state.actor !== input.hero ||
    input.state.terminal ||
    input.state.folded[input.hero]
  )
    throw new Error("The root must be a nonterminal decision for hero.");
  if (
    input.state.boardCount !== input.board.length ||
    { preflop: 0, flop: 3, turn: 4, river: 5 }[input.state.street] !==
      input.board.length
  )
    throw new Error("The observed board does not match the root street.");
  const rootActions = legalActions(input.state, input.rules).filter(
    (action) => !input.rootKinds || input.rootKinds.includes(action.kind),
  );
  if (!rootActions.length) throw new Error("Hero has no legal root action.");
  const budget = options.timeBudgetMs ?? 1500;
  if (!Number.isFinite(budget) || budget <= 0)
    throw new Error("Time budget must be positive.");
  const deadline = started + Math.min(4000, budget);
  const maxIterations = boundedInteger(
    options.maxIterations,
    5000,
    5000,
    "Iteration limit",
  );
  const maxNodes = boundedInteger(options.maxNodes, 512, 4096, "Node limit");
  const maxDepth = boundedInteger(options.maxDepth, 18, 48, "Depth limit");
  const maxInfosets = boundedInteger(
    options.maxInfosets,
    50000,
    50000,
    "Information-set limit",
  );
  const seed = options.seed ?? 0x4d434346;
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error("Seed must be an unsigned 32-bit integer.");
  const sampleDeal = createDealSampler(input, seed);
  const random = createSeededRandom((seed ^ 0x9e3779b9) >>> 0);
  const ownCards = input.heroCards.map((card) =>
    cardCode(card[0].toUpperCase(), card[1].toLowerCase()),
  );
  const board = input.board.map((card) =>
    cardCode(card[0].toUpperCase(), card[1].toLowerCase()),
  );
  const rootKey = informationSetKey(input.key, input.state, ownCards, board);
  const rootInfo: InformationSet = {
    regrets: rootActions.map(() => 0),
    average: rootActions.map(() => 0),
  };
  const infosets = new Map<string, InformationSet>([[rootKey, rootInfo]]);
  const rootValueSums = rootActions.map(() => 0);
  let rootValueWeight = 0;
  let rootVisits = 0;
  let cutoffCount = 0;
  let iterations = 0;
  let passes = 0;
  let tableLimited = false;
  const choose = (policy: number[]): number => {
    let draw = random();
    for (let i = 0; i < policy.length - 1; i++) {
      draw -= policy[i];
      if (draw < 0) return i;
    }
    return policy.length - 1;
  };
  while (
    iterations < maxIterations &&
    (passes === 0 || Date.now() < deadline)
  ) {
    for (let updateOffset = 0; updateOffset < n; updateOffset++) {
      // Hero goes first so a short budget cannot be spent entirely updating
      // earlier seats. The cyclic averaging relation still uses seat indices.
      const updater = (input.hero + updateOffset) % n;
      if (passes > 0 && Date.now() >= deadline) break;
      // Each updater receives an independent chance sample, as in the reference.
      // Reusing a deal after changing another player's policy would correlate
      // that new policy with the hidden cards in the next regret traversal.
      const deal = sampleDeal();
      if (!(deal.importance > 0) || !Number.isFinite(deal.importance))
        throw new Error("Invalid chance importance weight.");
      // Once per deal, shared by all terminal branches of this updater traversal.
      let scores: number[] | undefined;
      const payoff = (state: BettingState, player: number): number => {
        scores ??= deal.holes.map((cards) =>
          evaluateCardCodes([...deal.runout, ...cards]),
        );
        return settlePayoffs(state, scores)[player];
      };
      const passive = (state: BettingState, player: number): number => {
        cutoffCount++;
        let continuation = state;
        // With no raises, four streets need at most 4*n actions. Extra room
        // handles a pending root round and defensive engine normalisation.
        for (let step = 0; !continuation.terminal && step < n * 5 + 8; step++) {
          const actions = legalActions(continuation, input.rules);
          const action =
            actions.find((item) => item.kind === "check") ??
            actions.find((item) => item.kind === "call");
          if (!action)
            throw new Error("Passive continuation has no check/call action.");
          continuation = applyAction(continuation, action, input.rules);
        }
        if (!continuation.terminal)
          throw new Error("Passive continuation failed to terminate.");
        return payoff(continuation, player);
      };
      let nodes = 0;
      const visit = (state: BettingState, depth: number): number => {
        if (state.terminal) return payoff(state, updater);
        if (++nodes > maxNodes || depth >= maxDepth || Date.now() >= deadline)
          return passive(state, updater);
        const actions =
          depth === 0 ? rootActions : legalActions(state, input.rules);
        if (!actions.length)
          throw new Error("Nonterminal state has no legal action.");
        const key = informationSetKey(
          input.key,
          state,
          deal.holes[state.actor],
          deal.runout,
        );
        let info = infosets.get(key);
        if (!info) {
          if (infosets.size >= maxInfosets) {
            tableLimited = true;
            return passive(state, updater);
          }
          info = {
            regrets: actions.map(() => 0),
            average: actions.map(() => 0),
          };
          infosets.set(key, info);
        }
        const policy = regretMatching(info.regrets);
        let value: number;
        if (state.actor === updater) {
          const values = actions.map((action) =>
            visit(applyAction(state, action, input.rules), depth + 1),
          );
          value = values.reduce(
            (sum, child, index) => sum + policy[index] * child,
            0,
          );
          for (let a = 0; a < actions.length; a++)
            info.regrets[a] += deal.importance * (values[a] - value);
          if (depth === 0 && key === rootKey) {
            rootVisits++;
            rootValueWeight += deal.importance;
            for (let a = 0; a < actions.length; a++)
              rootValueSums[a] += deal.importance * values[a];
          }
        } else {
          value = visit(
            applyAction(state, actions[choose(policy)], input.rules),
            depth + 1,
          );
        }
        // Do this after recursion, using the policy computed before any update,
        // exactly as in the reference SIMPLE averaging pass.
        if (state.actor === (updater + 1) % n) {
          for (let a = 0; a < actions.length; a++)
            info.average[a] += deal.importance * policy[a];
        }
        return value;
      };
      visit(input.state, 0);
      passes++;
    }
    iterations++;
  }
  // An unvisited actual hand must never be presented as a computed mixed
  // decision merely because a uniform information-set entry was allocated.
  if (rootVisits === 0)
    throw new Error(
      "Undertrained decision: no actual-hand root regret traversal completed within the computation budget. Increase the budget or retry.",
    );
  const averageTotal = rootInfo.average.reduce((sum, value) => sum + value, 0);
  const frequencies =
    averageTotal > 0
      ? rootInfo.average.map((value) => value / averageTotal)
      : regretMatching(rootInfo.regrets);
  const actions = rootActions.map((action, index) => ({
    ...action,
    frequency: frequencies[index],
    ev: rootValueWeight > 0 ? rootValueSums[index] / rootValueWeight : null,
  }));
  const recommended = frequencies.reduce(
    (best, value, index) => (value > frequencies[best] ? index : best),
    0,
  );
  const limitations = [
    "Finite bet-size abstraction and sampled private ranges; no measured exploitability or Nash/GTO certificate.",
    "Action EVs are sampled means against evolving training policies in chip units, not independently evaluated average-policy values.",
    "No rake model; prior investments are included in net payoff and are common sunk costs at the root.",
  ];
  if (n > 2)
    limitations.push(
      "Cyclic SIMPLE strategy averaging is an empirical multiway approximation, not an unbiased full average; multiplayer CFR has no general Nash-convergence guarantee.",
    );
  if (cutoffCount > 0)
    limitations.push(
      `${cutoffCount} bounded traversals used passive check/call continuation to showdown; this can bias strategy and EV.`,
    );
  if (tableLimited)
    limitations.push(
      `Information-set table reached its ${maxInfosets} entry limit.`,
    );
  if (rootVisits < 100)
    limitations.push(
      `Only ${rootVisits} actual-hand regret traversals; root frequencies may be poorly converged.`,
    );
  if (passes % n !== 0)
    limitations.push(
      "The deadline interrupted a full cyclic iteration; the final player-update cycle is incomplete.",
    );
  return {
    key: input.key,
    rangeRevision: input.rangeRevision,
    quality: "approximation",
    provider: "external-sampling-mccfr/simple-v1",
    actions,
    recommended,
    iterations,
    rootVisits,
    elapsedMs: Date.now() - started,
    cutoffCount,
    assumptions: [...input.assumptions],
    limitations,
    exploitabilityPct: null,
  };
}
