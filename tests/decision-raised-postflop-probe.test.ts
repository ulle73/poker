import { execFileSync } from "node:child_process";
import { createCipheriv, createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { performance } from "node:perf_hooks";
import { cardCode, evaluateCardCodes } from "phe";
import { expect, it } from "vitest";
import { evaluate7 } from "../scripts/river-oracle.mjs";
import { applyAction, legalActions } from "../src/decision/betting";
import { solveDecision } from "../src/decision/mccfr";
import { settlePayoffs } from "../src/decision/payoffs";
import type { BettingAction, BettingState, DecisionInput, DecisionPolicy, SolveOptions } from "../src/decision/types";
import { openPrecomputedPolicy, savePrecomputedPolicy } from "./helpers/precomputed-policy";
import { continuationEncoding, pairKey, strengthBucketKey, trainChanceSampled } from "./helpers/chance-sampled-training";
import { compactSampledGameSeatUpper, completePublicTree, fitContinuationResponse, sampledGameSeatUpper, terminalPayoffTables } from "./helpers/sampled-game-upper";
import type { ContinuationChoices, VisibleHandKey } from "./helpers/sampled-game-upper";

const streets = ["flop", "turn", "river"] as const;
const fullBoard = ["Qh", "8d", "6h", "2c", "Js"];
const cardsByCode = Array.from({ length: 52 }, () => "");
const encode = (card: string) => cardCode(card[0], card[1]);
for (const rank of "23456789TJQKA") {
  for (const suit of "cdhs") cardsByCode[encode(rank + suit)] = rank + suit;
}

function raisedSpot(street: typeof streets[number], players = 3, checkedStack?: number): DecisionInput {
  const board = fullBoard.slice(0, 3 + streets.indexOf(street));
  const rules = { betFractions: [0.5], raiseFractions: [0.5], maxRaises: 2, includeAllIn: true };
  const seats = Array.from({ length: players }, (_, seat) => seat);
  let state: BettingState = {
    street,
    stacks: seats.map(() => checkedStack ?? 360), bets: seats.map(() => 0), invested: seats.map(() => 0),
    folded: seats.map(() => false), pending: seats.map(() => true), canRaise: seats.map(() => true),
    actor: 0, dealer: players - 1, currentBet: 0, lastFullRaise: 10, minBet: 10,
    deadPot: 120, raises: 0, history: "", boardCount: board.length, terminal: false,
  };
  for (const id of checkedStack ? ["check:0", "check:0"] : ["check:0", "bet:60", "raise:180"]) {
    const action = legalActions(state, rules).find((candidate) => candidate.id === id);
    if (!action) throw new Error(`Fixture could not replay ${id}`);
    state = applyAction(state, action, rules);
  }
  return {
    key: checkedStack ? "checked-three-way-flop" : `raised-postflop-probe:${street}`, hero: state.actor, seats,
    heroCards: ["Ah", "Kh"], board, state, rules, chipUnit: 1, currency: "SEK",
    ranges: seats.map(() => ""), rangeRevision: 0,
    assumptions: [checkedStack
      ? "Uniform compatible private combinations after two flop checks, without action-conditioned priors or rake."
      : "Uniform compatible private combinations at the raised decision root, without action-conditioned priors or rake."],
  };
}

// SplitMix32, fixed audit seeds distinct from the solver and from each other.
function auditRandom(seed: number) {
  return () => {
    seed = (seed + 0x9e3779b9) | 0;
    let value = Math.imul(seed ^ (seed >>> 16), 0x21f0aaad);
    value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
    return (value ^ (value >>> 15)) >>> 0;
  };
}

function wideAuditRandom(label: string, seed: number) {
  const key = createHash("sha256").update(`poker-qualification/${label}/${seed}`).digest();
  const stream = createCipheriv("aes-256-ctr", key, Buffer.alloc(16));
  const block = Buffer.alloc(65_536);
  let bytes = Buffer.alloc(0), offset = 0;
  return () => {
    if (offset === bytes.length) {
      bytes = Buffer.from(stream.update(block));
      offset = 0;
    }
    const draw = bytes.readUInt32LE(offset);
    offset += 4;
    return draw;
  };
}

function sampleIndex(next: () => number, choices: number) {
  const limit = 2 ** 32 - (2 ** 32 % choices);
  let draw = next();
  while (draw >= limit) draw = next();
  return draw % choices;
}

function sampledWorld(deck: number[], board: number[], seats: number[], next: () => number,
  fixed?: { seat: number; cards: number[] }) {
  const remaining = fixed ? deck.filter((card) => !fixed.cards.includes(card)) : deck.slice();
  const draw = () => remaining.splice(sampleIndex(next, remaining.length), 1)[0];
  const holes = seats.map((seat) => fixed?.seat === seat ? fixed.cards : [draw(), draw()]);
  const runout = [...board];
  while (runout.length < 5) runout.push(draw());
  return { holes, runout };
}

function empiricalBernsteinMargin(count: number, variance: number, width: number, alpha: number) {
  const log = Math.log(2 / alpha);
  return Math.sqrt(2 * variance * log / count) + 7 * width * log / (3 * (count - 1));
}

/** Invert a fixed-fraction one-sided betting test for the mean of bounded gains. */
function bettingMeanUpper(gains: readonly number[], maxGain: number, alpha: number) {
  if (gains.length < 2 || gains.some((value) => value < 0 || value > maxGain)) throw new Error("Invalid gain sample");
  const target = Math.log(1 / alpha);
  const bet = 0.95 / maxGain;
  let low = 0, high = maxGain;
  for (let step = 0; step < 42; step++) {
    const proposed = (low + high) / 2;
    let logCapital = 0;
    for (const gain of gains) logCapital += Math.log1p(bet * (proposed - gain));
    if (logCapital >= target) high = proposed;
    else low = proposed;
  }
  return high;
}

function decisionPot(input: DecisionInput) {
  return input.state.deadPot + input.state.invested.reduce((a, b) => a + b, 0);
}

function totalChips(input: DecisionInput) {
  return decisionPot(input) + input.state.stacks.reduce((a, b) => a + b, 0);
}

/** Exact showdown scores for worlds sharing one fixed flop. */
function cachedOracleScores() {
  const scores = new Int32Array(52 ** 4);
  return (holes: number[][], runout: number[]) => {
    const boardKey = pairKey(runout[3], runout[4]) * 52 ** 2;
    return holes.map(([a, b]) => {
      const key = boardKey + pairKey(a, b);
      if (!scores[key]) {
        scores[key] = evaluate7([...runout, a, b].map((code) => cardsByCode[code]));
      }
      return -scores[key];
    });
  };
}

function firstDecisionDeviation(
  input: DecisionInput,
  policy: DecisionPolicy,
  seeds: { fit: number; evaluation: number },
  errorProbability: number,
  confidenceBound: "hoeffding" | "empirical-bernstein",
  deviationSeat: number,
  sampleCounts: { fit: number; evaluation: number },
  randomForSeed: (seed: number) => () => number = auditRandom,
) {
  const board = input.board.map(encode);
  const deck = cardsByCode.map((_, code) => code).filter((code) => !board.includes(code));
  const actions = legalActions(input.state, input.rules);
  const roots = actions.map((action) => applyAction(input.state, action, input.rules));
  const ranks = new Map<number, number>();
  const keyFor = (cards: number[]) => Math.min(...cards) * 52 + Math.max(...cards);
  const totals = new Map<string, { ids: string[]; sums: number[] }>();
  const successors = new Map<string, BettingState>();
  let testedContinuations = 0;
  let trainedContinuations = 0;

  function advance(state: BettingState, action: BettingAction) {
    const key = `${state.history}/${action.id}`;
    let child = successors.get(key);
    if (!child) {
      child = applyAction(state, action, input.rules);
      successors.set(key, child);
    }
    return child;
  }

  function choose(row: ReturnType<DecisionPolicy["query"]>, draw: number) {
    let index = 0;
    while (index < row.actions.length - 1 && draw >= row.frequencies[index]) {
      draw -= row.frequencies[index++];
    }
    return row.actions[index];
  }

  function sample(next: () => number) {
    const { holes, runout } = sampledWorld(deck, board, input.seats, next);
    let reached = input.state;
    while (!reached.terminal && reached.street === input.state.street && reached.actor !== deviationSeat) {
      const row = policy.query(reached, holes[reached.actor], board);
      reached = advance(reached, choose(row, next() / 2 ** 32));
    }
    if (reached.terminal || reached.street !== input.state.street) return null;
    const { actions: choices, frequencies: mix } = policy.query(reached, holes[deviationSeat], board);
    const key = `${reached.history}/${keyFor(holes[deviationSeat])}`;
    const scores = holes.map((hand) => {
      const handKey = keyFor(hand);
      const cached = ranks.get(handKey);
      if (board.length === 5 && cached !== undefined) return cached;
      const score = -evaluate7([...runout, ...hand].map((code) => cardsByCode[code]));
      if (board.length === 5) ranks.set(handKey, score);
      return score;
    });
    const uniforms: number[] = [];
    const branches = reached === input.state ? roots : choices.map((action) => advance(reached, action));
    const values = branches.map((root) => {
      let state = root;
      let depth = 0;
      while (!state.terminal) {
        const row = policy.query(state, holes[state.actor], runout.slice(0, state.boardCount));
        testedContinuations++;
        if (row.trained) trainedContinuations++;
        const draw = uniforms[depth] ?? (uniforms[depth] = next() / 2 ** 32);
        depth++;
        state = advance(state, choose(row, draw));
      }
      return settlePayoffs(state, scores)[deviationSeat];
    });
    return { key, values, mix, choices };
  }

  const fitSamples = sampleCounts.fit;
  const evaluationSamples = sampleCounts.evaluation;
  const fitSeed = seeds.fit;
  const evaluationSeed = seeds.evaluation;
  const fitRandom = randomForSeed(fitSeed);
  for (let i = 0; i < fitSamples; i++) {
    const draw = sample(fitRandom);
    if (!draw) continue;
    const { key, values, choices } = draw;
    const row = totals.get(key) ?? { ids: choices.map((a) => a.id), sums: values.map(() => 0) };
    values.forEach((value, index) => { row.sums[index] += value; });
    totals.set(key, row);
  }
  const deviation = new Map<string, number>();
  const deviationActionCounts = new Map<string, number>();
  for (const [key, { ids, sums }] of totals) {
    const best = sums.indexOf(Math.max(...sums));
    deviation.set(key, best);
    deviationActionCounts.set(ids[best], (deviationActionCounts.get(ids[best]) ?? 0) + 1);
  }

  testedContinuations = 0;
  trainedContinuations = 0;
  const evaluationRandom = randomForSeed(evaluationSeed);
  const pool = totalChips(input);
  let gain = 0;
  let squaredGain = 0;
  let profileEv = 0;
  let reachedEvaluationSamples = 0;
  for (let i = 0; i < evaluationSamples; i++) {
    const draw = sample(evaluationRandom);
    if (!draw) continue;
    reachedEvaluationSamples++;
    const { key, values, mix } = draw;
    const profileValue = values.reduce((sum, value, index) => sum + value * mix[index], 0);
    const best = deviation.get(key);
    const difference = best === undefined ? 0 : values[best] - profileValue;
    if (Math.abs(difference) > pool) throw new Error("Paired payoff outside chip bound");
    gain += difference;
    squaredGain += difference * difference;
    profileEv += profileValue;
  }

  const pot = decisionPot(input);
  const possibleGainChips = gain / evaluationSamples;
  const variance = Math.max(0, squaredGain - gain * possibleGainChips) / (evaluationSamples - 1);
  // Apply Maurer–Pontil theorem 4 to the negative gain for a one-sided lower bound.
  const errorChips = confidenceBound === "empirical-bernstein"
    ? empiricalBernsteinMargin(evaluationSamples, variance, 2 * pool, errorProbability)
    : 2 * pool * Math.sqrt(Math.log(1 / errorProbability) / (2 * evaluationSamples));
  const lowerBoundChips = Math.max(0, possibleGainChips - errorChips);
  return {
    deviationSeat, fitSeed, evaluationSeed, fitSamples, evaluationSamples, reachedEvaluationSamples,
    errorProbability, confidenceBound, fitDecisionRows: deviation.size,
    deviationActionCounts: Object.fromEntries(deviationActionCounts),
    profileEvConditionalOnReachChips: reachedEvaluationSamples ? profileEv / reachedEvaluationSamples : null,
    possibleGainChips, sampleStdDevChips: Math.sqrt(variance), errorChips, lowerBoundChips,
    possibleGainPct: 100 * possibleGainChips / pot,
    lowerBoundPct: 100 * lowerBoundChips / pot,
    testedContinuations, trainedContinuations,
  };
}

function compareContinuations(input: DecisionInput, policy: DecisionPolicy, samples: number, seed: number,
  response?: { choices: ContinuationChoices[]; key: VisibleHandKey },
  bindBucketPolicy?: ReturnType<typeof openPrecomputedPolicy>["bindBucketPolicy"]) {
  const tree = completePublicTree(input);
  const root = tree.length - 1;
  const players = input.seats.length;
  const profile = new Float64Array(players * tree.length);
  const upper = new Float64Array(players * tree.length);
  const sums = new Float64Array(players);
  const squares = new Float64Array(players);
  const next = players === 3 ? auditRandom(seed) : wideAuditRandom(`omniscient/${players}/${input.state.street}`, seed);
  const board = input.board.map(encode);
  const deck = cardsByCode.map((_, code) => code).filter((code) => !board.includes(code));
  const pool = totalChips(input);
  const scoreWorld = cachedOracleScores();
  const terminalPayoffs = terminalPayoffTables(tree);
  const policyRows = tree.map(({ state }) => state.terminal ? undefined : bindBucketPolicy?.bind(state));
  for (let sample = 0; sample < samples; sample++) {
    const { holes, runout } = sampledWorld(deck, board, input.seats, next);
    const scores = scoreWorld(holes, runout);
    let pattern = 0;
    for (let a = 0; a < players; a++) {
      for (let b = a + 1; b < players; b++) pattern = 3 * pattern + Math.sign(scores[a] - scores[b]) + 1;
    }
    const boards = [board, runout.slice(0, 4), runout];
    const keys = bindBucketPolicy && holes.map((hand) => boards.map((visible) => bindBucketPolicy.key(hand, visible)));
    tree.forEach(({ state, children }, node) => {
      const offset = node * players;
      if (state.terminal) {
        const cache = terminalPayoffs[node]!;
        let payoff = cache.get(pattern);
        if (!payoff) {
          payoff = settlePayoffs(state, scores);
          cache.set(pattern, payoff);
        }
        profile.set(payoff, offset);
        upper.set(payoff, offset);
        return;
      }
      const hand = holes[state.actor], visible = boards[state.boardCount - 3];
      const mix = keys ? policyRows[node]![keys[state.actor][state.boardCount - 3]]
        : policy.query(state, hand, visible).frequencies;
      const choices = response?.choices[state.actor].get(state.history);
      const chosen = choices && response ? choices.get(response.key(state, hand, visible)) : undefined;
      for (let seat = 0; seat < players; seat++) {
        const perfect = !response && seat === state.actor;
        let baseline = 0, best = perfect ? -Infinity : 0;
        for (let a = 0; a < children.length; a++) {
          const child = children[a] * players + seat;
          baseline += mix[a] * profile[child];
          best = perfect ? Math.max(best, upper[child]) : best + mix[a] * upper[child];
        }
        profile[offset + seat] = baseline;
        upper[offset + seat] = seat === state.actor && chosen !== undefined && chosen < children.length
          ? upper[children[chosen] * players + seat] : best;
      }
    });
    for (let seat = 0; seat < players; seat++) {
      const index = root * players + seat;
      const delta = upper[index] - profile[index];
      if (delta < (response ? -pool : 0) - 1e-9 || delta > pool + 1e-9) {
        throw new Error("Continuation comparison exceeded the payoff range");
      }
      sums[seat] += delta;
      squares[seat] += delta * delta;
    }
  }
  return { seed, samples, publicNodes: tree.length, seats: input.seats.map((seat) => {
    const mean = sums[seat] / samples;
    const variance = Math.max(0, squares[seat] - sums[seat] * mean) / (samples - 1);
    return { seat, mean, variance };
  }) };
}

/** Reveal the complete deal only to the deviating seat for an upper bound. */
function perfectInformationUpper(input: DecisionInput, policy: DecisionPolicy, errorProbability: number,
  samples = 40_000, bindBucketPolicy?: ReturnType<typeof openPrecomputedPolicy>["bindBucketPolicy"]) {
  const report = compareContinuations(input, policy, samples, 78319942, undefined, bindBucketPolicy);
  const pot = decisionPot(input), pool = totalChips(input);
  return { ...report, errorProbability, seats: report.seats.map(({ seat, mean, variance }) => {
    const margin = empiricalBernsteinMargin(samples, variance, pool, errorProbability);
    return { seat, relaxedGainPct: 100 * mean / pot, upperBoundPct: 100 * Math.min(pool, mean + margin) / pot };
  }) };
}

it.each([
  { players: 3, hero: 0, expected: [100, 100, 0] },
  { players: 6, hero: 3, expected: [100, 100, 0, 100, 100, 100] },
])("optimizes only the deviating seat in the $players-player upper bound", ({ players, hero, expected }) => {
  const input = raisedSpot("river", players);
  const foldingProfile: DecisionPolicy = {
    query: (state) => {
      const actions = legalActions(state, input.rules);
      return { actions, frequencies: actions.map((_, index) => Number(index === 0)), trained: true };
    },
  };
  // Every seat can win the 360-chip pot by jamming against folds.
  // The original raiser wins it uncontested without any deviation.
  const report = perfectInformationUpper(input, foldingProfile, 0.05, 24);
  expect(input.hero).toBe(hero);
  expect(report.seats.map((seat) => seat.relaxedGainPct)).toEqual(expected);
});

it("evaluates each frozen response separately on fresh deals", () => {
  const input = raisedSpot("river");
  const foldingProfile: DecisionPolicy = {
    query: (state) => {
      const actions = legalActions(state, input.rules);
      return { actions, frequencies: actions.map((_, index) => Number(index === 0)), trained: true };
    },
  };
  const board = input.board.map(encode);
  const deck = cardsByCode.map((_, code) => code).filter((code) => !board.includes(code));
  const next = auditRandom(87521396);
  const key: VisibleHandKey = () => 0;
  const training = Array.from({ length: 24 }, () => {
    const { holes, runout } = sampledWorld(deck, board, input.seats, next);
    return { holes, runout, scores: holes.map((hand) => evaluateCardCodes([...runout, ...hand])) };
  });
  const choices = input.seats.map((seat) => fitContinuationResponse(input, foldingProfile, seat, training, key));
  const report = compareContinuations(input, foldingProfile, 24, 26830712, { choices, key });
  expect(report.seats.map((seat) => seat.mean)).toEqual([360, 360, 0]);
});

it("requires the same sampled response to indistinguishable hidden hands", () => {
  const sample = raisedSpot("river");
  const input: DecisionInput = {
    ...sample, seats: [0, 1], ranges: ["", ""],
    state: { ...sample.state, dealer: 1, actor: 0, history: "audit-river-bet",
      stacks: [10, 0], bets: [0, 10], invested: [0, 10], currentBet: 10,
      pending: [true, false], canRaise: [false, false], folded: [false, false], deadPot: 0 },
  };
  const fold: DecisionPolicy = {
    query: (state) => ({ actions: legalActions(state, input.rules), frequencies: [1, 0], trained: true }),
  };
  const runout = input.board.map(encode);
  const worlds = [
    { holes: [[11, 12], [13, 14]], runout, scores: [0, 1] },
    { holes: [[11, 12], [17, 18]], runout, scores: [1, 0] },
  ];
  expect(sampledGameSeatUpper(input, fold, 0, 2, 2, () => worlds).mean).toBe(0);
  expect(sampledGameSeatUpper(input, fold, 0, 2, 2, () => [worlds[0], worlds[0]]).mean).toBe(10);
  const fixedRows = { key: () => 0, bind: () => [[1, 0]] };
  expect(sampledGameSeatUpper(input, fold, 0, 2, 2, () => worlds, fixedRows).gains).toEqual([0, 0]);
  const trained = trainChanceSampled(input, () => 0, 64, () => worlds[0]);
  const row = trained.query(input.state, worlds[0].holes[0], runout);
  expect(row.actions.map(({ kind }) => kind)).toEqual(["fold", "call"]);
  expect(row.frequencies[1]).toBeGreaterThan(0.98);
});

it("recovers the analytic one-sided bound for a constant gain sample", () => {
  const count = 2048, maxGain = 1200, observed = 3, alpha = 0.05 / 3;
  const expected = observed + (alpha ** (-1 / count) - 1) * maxGain / 0.95;
  expect(bettingMeanUpper(Array(count).fill(observed), maxGain, alpha)).toBeCloseTo(expected, 8);
});

it.each(streets)("matches the dense verifier on %s with board groups and zero-reach actions", (street) => {
  const input = raisedSpot(street, 4);
  const board = input.board.map(encode);
  const deck = cardsByCode.map((_, code) => code).filter((code) => !board.includes(code));
  const next = auditRandom(5176829);
  const key = (own: readonly number[], visible: readonly number[]) =>
    (own[0] + own[1] + visible[visible.length - 1]) % 3;
  const bind = (state: BettingState) => {
    const actions = legalActions(state, input.rules);
    return [
      actions.map(() => 1 / actions.length),
      actions.map((_, i) => Number(i === 0)),
      actions.map((_, i) => Number(i === actions.length - 1)),
    ];
  };
  const policy: DecisionPolicy = { query: (state, own, visible) => ({
    actions: legalActions(state, input.rules), trained: true, frequencies: bind(state)[key(own, visible)],
  }) };
  for (const seat of input.seats) {
    const cards = input.heroCards.map(encode);
    const worlds = Array.from({ length: 36 }, () => {
      const { holes, runout } = sampledWorld(deck, board, input.seats, next, { seat, cards });
      return { holes, runout, scores: holes.map((hand) => evaluateCardCodes([...runout, ...hand])) };
    });
    const dense = sampledGameSeatUpper(input, policy, seat, 1, worlds.length, () => worlds, { key, bind });
    const compact = compactSampledGameSeatUpper(input, seat, 1, worlds.length, () => worlds, { key, bind });
    expect(compact.publicNodes).toBe(dense.publicNodes);
    expect(compact.mean).toBeCloseTo(dense.mean, 9);
    const withCutoff = compactSampledGameSeatUpper(input, seat, 1, worlds.length, () => worlds, { key, bind }, 0.2);
    expect(withCutoff.mean + 1e-9).toBeGreaterThanOrEqual(dense.mean);
  }
});

it.skipIf(process.env.POKER_RAISED_POSTFLOP_PROBE !== "1")(
  "times a full-range check / bet / raise and audits the frozen policy",
  () => {
    const street = streets.find((value) => value === process.env.POKER_RAISED_POSTFLOP_STREET);
    if (!street) throw new Error("Set POKER_RAISED_POSTFLOP_STREET to flop, turn or river");
    const output = process.env.POKER_RAISED_POSTFLOP_OUTPUT;
    if (!output) throw new Error("Set POKER_RAISED_POSTFLOP_OUTPUT to the evidence file");
    const started = performance.now();
    const players = Number(process.env.POKER_RAISED_POSTFLOP_PLAYERS ?? 3);
    if (!Number.isInteger(players) || players < 3 || players > 6) throw new Error("Choose 3–6 players");
    const offlineMode = process.env.POKER_RAISED_POSTFLOP_OFFLINE;
    const setting = process.env.POKER_THREE_WAY_CHECKED_FLOP;
    const checked = setting === "1" || setting === "6bb";
    const checkedStack = setting === "6bb" ? 60 : checked ? 80 : undefined;
    if (checked && (players !== 3 || street !== "flop" || !offlineMode)) {
      throw new Error("The checked-flop model is only available for offline three-player flop qualification");
    }
    const input = raisedSpot(street, players, checkedStack);
    const profileDir = process.env.POKER_RAISED_POSTFLOP_PROFILE;
    if (offlineMode && offlineMode !== "model-size" && !profileDir) {
      throw new Error("Set POKER_RAISED_POSTFLOP_PROFILE to the profile directory");
    }
    if (offlineMode === "model-size") {
      const tree = completePublicTree(input);
      const decisions = Object.fromEntries(streets.map((stage) => [stage,
        tree.filter(({ state }) => !state.terminal && state.street === stage).length]));
      writeFileSync(output, JSON.stringify({ input, publicNodes: tree.length, decisions }, null, 2) + "\n");
      return;
    }
    let policy: DecisionPolicy | undefined;
    const external = process.env.POKER_RAISED_POSTFLOP_SAMPLING === "external";
    const expanded = process.env.POKER_RAISED_POSTFLOP_EXPANDED === "1";
    const options: SolveOptions = external
      ? { seed: 395, sampling: "external", maxDepth: 48, maxNodes: 4096, timeBudgetMs: 4000 }
      : { seed: 395, sampling: "outcome", baseline: "learned", timeBudgetMs: 4000 };
    if (expanded) {
      options.expandedResearchBudget = true;
      options.timeBudgetMs = 9000;
      options.maxInfosets = 400000;
      options.maxIterations = external ? 300000 : 400000;
      options.heroOversampling = Number(process.env.POKER_RAISED_POSTFLOP_HERO_SHARE ?? 0.5);
    }
    if (offlineMode === "train-chance" && profileDir) {
      const iterations = Number(process.env.POKER_RAISED_POSTFLOP_TRAIN_DEALS ?? 3_000_000);
      if (!Number.isSafeInteger(iterations) || iterations < 1) throw new Error("Invalid number of training deals");
      const seed = 52635299;
      const next = checked ? wideAuditRandom(
        setting === "6bb" ? "training/three-way-checked-flop/6bb" : "training/three-way-checked-flop", seed)
        : players === 3 && street === "flop" ? auditRandom(seed)
        : wideAuditRandom(players === 3 ? `training/${street}` : `training/${players}/${street}`, seed);
      const board = input.board.map(encode);
      const hand = input.heroCards.map(encode);
      const deck = cardsByCode.map((_, code) => code).filter((code) => !board.includes(code));
      const policy = trainChanceSampled(input, strengthBucketKey(deck, board.length), iterations, () => {
        const { holes, runout } = sampledWorld(deck, board, input.seats, next);
        return { holes, runout, scores: holes.map((cards) => evaluateCardCodes([...runout, ...cards])) };
      });
      const trainMs = performance.now() - started;
      const artifact = savePrecomputedPolicy(profileDir, input, policy, continuationEncoding);
      const exported = openPrecomputedPolicy(profileDir, input, "all");
      const heroRow = exported.policy.query(input.state, hand, board);
      expect(heroRow).toEqual(policy.query(input.state, hand, board));
      expect(exported.manifestSha256).toBe(artifact.manifestSha256);
      writeFileSync(output, JSON.stringify({ seed, iterations, trainMs, input, heroRow, artifact,
        processPeakRssKiB: process.resourceUsage().maxRSS }, null, 2) + "\n");
      return;
    }
    if (offlineMode === "omniscient-upper" && profileDir) {
      const { policy, bindBucketPolicy, manifestSha256 } = openPrecomputedPolicy(profileDir, input, "all");
      const upper = perfectInformationUpper(input, policy, 0.05 / players, 16_384, bindBucketPolicy);
      writeFileSync(output, JSON.stringify({ manifestSha256, elapsedMs: performance.now() - started,
        ...upper, qualityLimitPct: 2.1, passesUpperGate: upper.seats.every((seat) => seat.upperBoundPct < 2.1) }, null, 2) + "\n");
      return;
    }
    if (offlineMode === "first-decision-response" && profileDir) {
      const { policy, manifestSha256 } = openPrecomputedPolicy(profileDir, input, "all");
      const evaluationDeals = Number(process.env.POKER_RAISED_POSTFLOP_RESPONSE_EVALUATION_DEALS ?? 160_000);
      if (!Number.isSafeInteger(evaluationDeals) || evaluationDeals < 2) throw new Error("Invalid response sample count");
      const selectedSeat = process.env.POKER_RAISED_POSTFLOP_AUDIT_SEAT;
      const auditedSeats = selectedSeat === undefined ? input.seats : input.seats.filter((seat) => seat === Number(selectedSeat));
      if (!auditedSeats.length) throw new Error("Choose an audit seat");
      const familySize = Number(process.env.POKER_RAISED_POSTFLOP_AUDIT_FAMILY ?? players);
      if (!Number.isSafeInteger(familySize) || familySize < players) throw new Error("Invalid audit family size");
      const errorProbability = 0.05 / familySize;
      const seeds = { fit: 66280139, evaluation: 450757193 };
      const seats = auditedSeats.map((seat) => {
        const label = `first-decision/${players}/${street}/${seat}`;
        return firstDecisionDeviation(input, policy, seeds, errorProbability, "empirical-bernstein", seat,
          { fit: 160_000, evaluation: evaluationDeals },
          (seed) => wideAuditRandom(seed === seeds.evaluation && evaluationDeals !== 160_000
            ? `${label}/evaluation/${evaluationDeals}` : label, seed));
      });
      const qualityLimitPct = 2.1;
      writeFileSync(output, JSON.stringify({ manifestSha256, elapsedMs: performance.now() - started,
        ...(familySize !== players ? { familySize } : {}),
        qualityLimitPct, seats, disprovesQualityGate: seats.some(({ lowerBoundPct }) => lowerBoundPct >= qualityLimitPct) }, null, 2) + "\n");
      return;
    }
    if (offlineMode === "train" && profileDir) {
      const offlineOptions: SolveOptions = {
        seed: 395, sampling: "outcome", baseline: "learned", heroOversampling: 0,
        offlinePrecomputation: true, timeBudgetMs: 90000, maxInfosets: 1250000, maxIterations: 5000000,
      };
      const result = solveDecision(input, offlineOptions, (value) => { policy = value; });
      if (!policy) throw new Error("Missing finalized profile");
      const trainedRoot = policy.query(input.state, input.heroCards.map(encode), input.board.map(encode));
      const exportStarted = performance.now();
      const artifact = savePrecomputedPolicy(profileDir, input, policy);
      const exportMs = performance.now() - exportStarted;
      const reopened = openPrecomputedPolicy(profileDir, input, "root");
      expect(reopened.policy.query(input.state, input.heroCards.map(encode), input.board.map(encode)))
        .toEqual(trainedRoot);
      expect(reopened.manifestSha256).toBe(artifact.manifestSha256);
      writeFileSync(output, JSON.stringify({ input, offlineOptions, result, trainedRoot, artifact,
        exportMs, processPeakRssKiB: process.resourceUsage().maxRSS }, null, 2) + "\n");
      return;
    }
    if ((offlineMode === "audit" || offlineMode === "lookup") && profileDir) {
      const root = openPrecomputedPolicy(profileDir, input, "root");
      const board = input.board.map(encode);
      const hand = input.heroCards.map(encode);
      const heroRow = root.policy.query(input.state, hand, board);
      const lookupMs = performance.now() - started;
      expect(heroRow.trained).toBe(true);
      expect(heroRow.actions.map((a) => a.id)).toEqual(checked
        ? setting === "6bb" ? ["check:0", "bet:60"] : ["check:0", "bet:60", "bet:80"]
        : ["fold:0", "call:180", "raise:360"]);
      expect(heroRow.frequencies.reduce((sum, frequency) => sum + frequency, 0)).toBeCloseTo(1, 12);
      const warmSamplesMs = Array.from({ length: 25 }, () => {
        const request = performance.now();
        openPrecomputedPolicy(profileDir, input, "root").policy.query(input.state, hand, board);
        return performance.now() - request;
      });
      const { policy, bindBucketPolicy, manifestSha256 } = openPrecomputedPolicy(profileDir, input, "all");
      expect(manifestSha256).toBe(root.manifestSha256);
      expect(policy.query(input.state, hand, board)).toEqual(heroRow);
      if (offlineMode === "lookup") {
        const deck = cardsByCode.map((_, code) => code).filter((code) => !board.includes(code));
        let rootTrained = 0;
        for (let a = 0; a < deck.length; a++) {
          for (let b = a + 1; b < deck.length; b++) {
            if (root.policy.query(input.state, [deck[a], deck[b]], board).trained) rootTrained++;
          }
        }
        const rootCombos = deck.length * (deck.length - 1) / 2;
        expect(rootTrained).toBe(rootCombos);
        if (bindBucketPolicy) {
          const next = auditRandom(67139132);
          const decisions = completePublicTree(input).filter(({ state }) => !state.terminal)
            .map(({ state }) => ({ state, rows: bindBucketPolicy.bind(state) }));
          for (let deal = 0; deal < 12; deal++) {
            const { holes, runout } = sampledWorld(deck, board, input.seats, next);
            for (const { state, rows } of decisions) {
              const own = holes[state.actor], visible = runout.slice(0, state.boardCount);
              expect(rows[bindBucketPolicy.key(own, visible)]).toEqual(policy.query(state, own, visible).frequencies);
            }
          }
        }
        expect(() => openPrecomputedPolicy(profileDir, {
          ...input, state: { ...input.state, deadPot: input.state.deadPot + 1 },
        }, "root")).toThrow(/requested model/);
        writeFileSync(output, JSON.stringify({ manifestSha256, heroRow, lookupMs,
          warmSamplesMs, rootTrained, rootCombos, mismatchedPotRejected: true }, null, 2) + "\n");
        return;
      }
      const controlStarted = performance.now();
      const alpha = 0.05 / (2 * input.seats.length);
      const upper = perfectInformationUpper(input, policy, alpha);
      const lower = input.seats.map((seat) => firstDecisionDeviation(input, policy,
        { fit: 19026487, evaluation: 83752619 }, alpha, "empirical-bernstein", seat,
        { fit: 240_000, evaluation: 160_000 }));
      const auditMs = performance.now() - controlStarted;
      const qualityLimitPct = 2.1;
      const latencyPass = lookupMs <= 10_000 && warmSamplesMs.every((ms) => ms <= 10_000);
      const quality = lower.some((seat) => seat.lowerBoundPct >= qualityLimitPct) ? "rejected-by-deviation"
        : upper.seats.every((seat) => seat.upperBoundPct < qualityLimitPct) ? "verified" : "unverified";
      writeFileSync(output, JSON.stringify({ manifestSha256, input, heroRow, lookupMs, warmSamplesMs,
        qualityLimitPct, latencyPass, auditMs, upper, lower, quality,
        qualifies: latencyPass && quality === "verified" }, null, 2) + "\n");
      return;
    }
    if ((offlineMode === "response" || offlineMode === "response-texture") && profileDir) {
      const { policy, manifestSha256 } = openPrecomputedPolicy(profileDir, input, "all");
      const texture = offlineMode === "response-texture";
      const fitSeed = texture ? 511679839 : 197231419, evaluationSeed = texture ? 737831291 : 312423817;
      const fitSamples = texture ? 220_000 : 120_000, evaluationSamples = 240_000;
      const errorProbability = 0.05 / input.seats.length;
      const board = input.board.map(encode);
      const deck = cardsByCode.map((_, code) => code).filter((code) => !board.includes(code));
      const strength = strengthBucketKey(deck);
      const key: VisibleHandKey = (_, own, visible) => {
        const bucket = strength(own, visible);
        if (!texture || visible.length < 4) return bucket;
        if (visible.length === 4) return bucket + 49 * (visible[3] >>> 2) + 49 * 13 * Number((visible[3] & 3) === (visible[0] & 3));
        const paired = new Set(visible.map((card) => card >>> 2)).size < visible.length;
        const suits = [0, 0, 0, 0];
        for (const card of visible) suits[card & 3]++;
        return bucket + 49 * (Number(paired) + 2 * Math.max(...suits));
      };
      const next = auditRandom(fitSeed);
      const worlds = Array.from({ length: fitSamples }, () => {
        const { holes, runout } = sampledWorld(deck, board, input.seats, next);
        const scores = holes.map((hand) => evaluateCardCodes([...runout, ...hand]));
        return { holes, runout, scores };
      });
      const choices = input.seats.map((seat) => texture && seat !== 1 ? new Map() : fitContinuationResponse(
        input, policy, seat, worlds, key, texture ? (state) => state.boardCount === 3 : undefined));
      const report = compareContinuations(input, policy, evaluationSamples, evaluationSeed, { choices, key });
      const pot = decisionPot(input), pool = totalChips(input);
      const seats = report.seats.filter(({ seat }) => !texture || seat === 1).map(({ seat, mean, variance }) => {
        const margin = empiricalBernsteinMargin(evaluationSamples, variance, 2 * pool, errorProbability);
        return { seat, publicDecisionNodes: choices[seat].size, estimatePct: 100 * mean / pot,
          errorMarginPct: 100 * margin / pot, lowerBoundPct: 100 * Math.max(0, mean - margin) / pot };
      });
      const qualityLimitPct = 2.1;
      writeFileSync(output, JSON.stringify({ manifestSha256, fitSeed, evaluationSeed, fitSamples, evaluationSamples,
        ...(texture ? { fixedFlopPolicy: true, fittedFeatures: "visible strength and turn rank/suit or river board texture" } : {}),
        errorProbability, publicNodes: report.publicNodes, elapsedMs: performance.now() - started,
        qualityLimitPct, seats, disprovesQualityGate: seats.some((seat) => seat.lowerBoundPct >= qualityLimitPct) }, null, 2) + "\n");
      return;
    }
    if ((offlineMode === "tight-stratified" || offlineMode === "tight-card-grid") && profileDir) {
      const { policy, bindBucketPolicy, manifestSha256 } = openPrecomputedPolicy(profileDir, input, "all");
      if (!bindBucketPolicy) throw new Error("Runout stratification requires a bucket-encoded policy");
      const seat = Number(process.env.POKER_RAISED_POSTFLOP_AUDIT_SEAT);
      if (!input.seats.includes(seat)) throw new Error("Choose an audit seat");
      const cardGrid = offlineMode === "tight-card-grid";
      const deep = process.env.POKER_RAISED_POSTFLOP_STRATIFICATION === "deep";
      const defaultDeals = street === "river" ? 16_384 : street === "turn" ? 1024 : cardGrid ? 32 : deep ? 24 : 4;
      const dealsPerRunout = Number(process.env.POKER_RAISED_POSTFLOP_GRID_DRAWS ?? defaultDeals);
      if (!Number.isSafeInteger(dealsPerRunout) || dealsPerRunout < 1) throw new Error("Invalid runout sample count");
      const familySize = Number(process.env.POKER_RAISED_POSTFLOP_AUDIT_FAMILY ?? players);
      if (!Number.isSafeInteger(familySize) || familySize < players) throw new Error("Invalid audit family size");
      const seed = (cardGrid ? 1392716381 : deep ? 862701449 : 71283597) + 31_123_713 * seat + 113_920_197 * streets.indexOf(street);
      const reproduceArchivedStream = !checked && players === 3 && street === "flop" &&
        process.env.POKER_RAISED_POSTFLOP_AUDIT_RANDOM === "legacy";
      const auditLabel = checked ? `three-way-checked-flop${setting === "6bb" ? "/6bb" : ""}/${offlineMode}/${seat}`
        : players === 3 ? `${offlineMode}/${street}/${seat}` : `${offlineMode}/${players}/${street}/${seat}`;
      const runLabel = familySize === players ? auditLabel : `${auditLabel}/${familySize}/${dealsPerRunout}`;
      const random = reproduceArchivedStream ? auditRandom(seed) : wideAuditRandom(runLabel, seed);
      const board = input.board.map(encode);
      const deck = cardsByCode.map((_, code) => code).filter((code) => !board.includes(code));
      const ownPairs = cardGrid ? deck.flatMap((first, index) => deck.slice(index + 1).map((second) => [first, second])) : null;
      const batchCount = ownPairs?.length ?? 2048;
      const pot = decisionPot(input), pool = totalChips(input);
      const available = deck.length - 2;
      const runoutCount = street === "flop" ? available * (available - 1) : street === "turn" ? available : 1;
      const batchSize = runoutCount * dealsPerRunout;
      const errorProbability = 0.05 / familySize;
      const scoreWorld = cachedOracleScores();
      let nextPair = 0;
      const compact = process.env.POKER_RAISED_POSTFLOP_AUDIT_ENGINE === "compact";
      const cutoff = Number(process.env.POKER_RAISED_POSTFLOP_AUDIT_CUTOFF ?? 0);
      if (!Number.isFinite(cutoff) || cutoff < 0 || cutoff >= 1 || (cutoff > 0 && !compact))
        throw new Error("Choose a compact cutoff in [0, 1)");
      function* drawBatch() {
        const remaining = deck.slice();
        const heroCards = ownPairs?.[nextPair++]
          ?? [0, 1].map(() => remaining.splice(sampleIndex(random, remaining.length), 1)[0]);
        if (ownPairs) for (const card of heroCards) remaining.splice(remaining.indexOf(card), 1);
        const turns = board.length >= 4 ? [board[3]] : remaining;
        const rivers = board.length === 5 ? [board[4]] : remaining;
        for (const turn of turns) {
          for (const river of rivers) {
            if (river === turn) continue;
            const runout = [...board.slice(0, 3), turn, river];
            const hidden = remaining.filter((card) => card !== turn && card !== river);
            for (let i = 0; i < dealsPerRunout; i++) {
              const available = hidden.slice();
              const draw = () => available.splice(sampleIndex(random, available.length), 1)[0];
              const holes = input.seats.map((player) => player === seat ? heroCards : [draw(), draw()]);
              yield { holes, runout, scores: scoreWorld(holes, runout) };
            }
          }
        }
      }
      const report = compact ? compactSampledGameSeatUpper(input, seat, batchCount, batchSize, drawBatch, bindBucketPolicy, cutoff)
        : sampledGameSeatUpper(input, policy, seat, batchCount, batchSize, () => Array.from(drawBatch()), bindBucketPolicy);
      // The exact private-card grid removes the random choice of conditional game.
      // A single opponent deal changes any fixed policy's paired gain by at most
      // 2 * pool / N. Taking a maximum over those same policies preserves this bound.
      const boundedDifferenceMargin = pool * Math.sqrt(2 * Math.log(1 / errorProbability) / (batchCount * batchSize));
      const upperBoundChips = cardGrid ? Math.min(pool, report.mean + boundedDifferenceMargin)
        : bettingMeanUpper(report.gains, pool, errorProbability);
      const upperBoundPct = 100 * upperBoundChips / pot;
      writeFileSync(output, JSON.stringify({ manifestSha256, seat, seed, batchCount, batchSize, dealsPerRunout,
        ...(!reproduceArchivedStream ? { random: "aes-256-ctr" } : {}),
        ...(familySize !== players ? { familySize } : {}),
        ...(compact ? { auditEngine: "reach-weighted-depth-first", processPeakRssKiB: process.resourceUsage().maxRSS } : {}),
        ...(cutoff ? { opponentReachCutoff: cutoff } : {}),
        errorProbability, publicNodes: report.publicNodes, elapsedMs: performance.now() - started,
        ...(cardGrid ? { exhaustiveOwnPairs: batchCount, confidenceBound: "bounded-differences", confidenceMarginPct: 100 * boundedDifferenceMargin / pot } : {}),
        estimatePct: 100 * report.mean / pot, upperBoundPct, qualityLimitPct: 2.1, passesSeat: upperBoundPct < 2.1 }, null, 2) + "\n");
      return;
    }
    if ((offlineMode === "tight" || offlineMode === "tight-large") && profileDir) {
      const { policy, bindBucketPolicy, manifestSha256 } = openPrecomputedPolicy(profileDir, input, "all");
      const large = offlineMode === "tight-large";
      const batchCount = Number(process.env.POKER_RAISED_POSTFLOP_BATCH_COUNT ?? (large ? 1024 : 768));
      const batchSize = Number(process.env.POKER_RAISED_POSTFLOP_BATCH_SIZE ?? (large ? 768 : 256));
      if (![batchCount, batchSize].every((count) => Number.isSafeInteger(count) && count >= 2)) {
        throw new Error("Choose integer batch counts and sizes of at least two");
      }
      const baseSeed = large ? 190338571 : 59172869;
      const errorProbability = 0.05 / input.seats.length;
      const board = input.board.map(encode);
      const deck = cardsByCode.map((_, code) => code).filter((code) => !board.includes(code));
      const pot = decisionPot(input), pool = totalChips(input);
      const scoreWorld = cachedOracleScores();
      const selectedSeat = process.env.POKER_RAISED_POSTFLOP_AUDIT_SEAT;
      if (selectedSeat !== undefined && !input.seats.includes(Number(selectedSeat))) throw new Error("Choose an audit seat");
      const auditSeats = selectedSeat === undefined ? input.seats : [Number(selectedSeat)];
      const seats = auditSeats.map((seat) => {
        const seed = baseSeed + 17_019_479 * seat;
        const random = players === 3 ? auditRandom(seed) : wideAuditRandom(`${offlineMode}/${players}/${street}/${seat}`, seed);
        const report = sampledGameSeatUpper(input, policy, seat, batchCount, batchSize, () => {
          const remaining = deck.slice();
          const cards = [0, 1].map(() => remaining.splice(sampleIndex(random, remaining.length), 1)[0]);
          return Array.from({ length: batchSize }, () => {
            const { holes, runout } = sampledWorld(deck, board, input.seats, random, { seat, cards });
            const scores = scoreWorld(holes, runout);
            return { holes, runout, scores };
          });
        }, bindBucketPolicy);
        const margin = empiricalBernsteinMargin(batchCount, report.variance, pool, errorProbability);
        const upper = players === 3 ? Math.min(pool, report.mean + margin)
          : bettingMeanUpper(report.gains, pool, errorProbability);
        return { seat, seed, publicNodes: report.publicNodes, estimatePct: 100 * report.mean / pot,
          upperBoundPct: 100 * upper / pot };
      });
      const qualityLimitPct = 2.1;
      writeFileSync(output, JSON.stringify({ manifestSha256, batchCount, batchSize, errorProbability,
        elapsedMs: performance.now() - started, qualityLimitPct, seats,
        passesUpperGate: seats.length === players && seats.every((seat) => seat.upperBoundPct < qualityLimitPct) }, null, 2) + "\n");
      return;
    }
    if (offlineMode) throw new Error("Unknown POKER_RAISED_POSTFLOP_OFFLINE mode");
    const result = solveDecision(input, options, (value) => { policy = value; });
    if (!policy) throw new Error("Missing finalized policy");
    const frozenPolicy = policy;
    const board = input.board.map(encode);
    const heroRow = policy.query(input.state, input.heroCards.map(encode), board);
    const elapsedMs = performance.now() - started;
    const maxRssAfterSolveKiB = process.resourceUsage().maxRSS;
    expect(input.state.actor).toBe(input.hero);
    expect(input.state.bets).toEqual([0, 60, 180, ...input.seats.slice(3).map(() => 0)]);
    expect(heroRow.actions.map((action) => action.id)).toEqual(["fold:0", "call:180", "raise:360"]);
    expect(result.actions.map((action) => action.id)).toEqual(heroRow.actions.map((action) => action.id));
    expect(heroRow.actions[2].allIn).toBe(true);
    expect(result.quality).toBe("approximation");
    expect(result.exploitabilityPct).toBeNull();
    const deck = cardsByCode.map((_, code) => code).filter((code) => !board.includes(code));
    let rootTrained = 0;
    for (let a = 0; a < deck.length; a++) {
      for (let b = a + 1; b < deck.length; b++) {
        if (policy.query(input.state, [deck[a], deck[b]], board).trained) rootTrained++;
      }
    }
    const auditStart = performance.now();
    const allSeats = process.env.POKER_RAISED_POSTFLOP_ALL_SEATS === "1";
    const deep = process.env.POKER_RAISED_POSTFLOP_DEEP_AUDIT === "1";
    const seeds = deep ? { fit: 112581643, evaluation: 81415647 }
      : allSeats ? { fit: 1132789, evaluation: 7463821 }
      : expanded ? { fit: 642928, evaluation: 94726381 }
      : external ? { fit: 741833, evaluation: 2105279 } : { fit: 81013, evaluation: 240781 };
    const errorProbability = deep || external && !expanded && !allSeats ? 0.05 : 0.05 / streets.length;
    const confidence = expanded || allSeats || deep ? "empirical-bernstein" : "hoeffding";
    const samples = deep ? { fit: 360_000, evaluation: 240_000 } : { fit: 60_000, evaluation: 160_000 };
    const seatAudits = (allSeats ? input.seats : [input.hero]).map((seat) =>
      firstDecisionDeviation(input, frozenPolicy, seeds, errorProbability, confidence, seat, samples));
    const [audit] = seatAudits;
    const qualityLimitPct = 2.1;
    writeFileSync(output, JSON.stringify({
      verifiedAt: new Date().toISOString(),
      revision: execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(),
      environment: {
        platform: process.platform, node: process.version, cpu: cpus()[0]?.model,
      },
      input, options, elapsedMs, maxRssAfterSolveKiB, heroRow, result,
      rootCombos: deck.length * (deck.length - 1) / 2, rootTrained,
      heroRowMatchesResult: heroRow.frequencies.every((frequency, index) =>
        Math.abs(frequency - result.actions[index].frequency) < 1e-9),
      auditMs: performance.now() - auditStart, audit, seatAudits, qualityLimitPct,
      latencyPass: elapsedMs < 10_000,
      quality: seatAudits.some((row) => row.lowerBoundPct > qualityLimitPct) ? "rejected-by-deviation" : "unverified",
      qualifies: false,
    }, null, 2) + "\n");
  }, Number(process.env.POKER_RAISED_POSTFLOP_TIMEOUT_MS ?? 900_000),
);
