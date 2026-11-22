import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { performance } from "node:perf_hooks";
import { cardCode } from "phe";
import { expect, it } from "vitest";
import { evaluate7 } from "../scripts/river-oracle.mjs";
import { applyAction, legalActions } from "../src/decision/betting";
import { solveDecision } from "../src/decision/mccfr";
import { settlePayoffs } from "../src/decision/payoffs";
import type { BettingAction, BettingState, DecisionInput, DecisionPolicy, SolveOptions } from "../src/decision/types";
import { openPrecomputedPolicy, savePrecomputedPolicy } from "./helpers/precomputed-policy";
import { completePublicTree, sampledGameSeatUpper } from "./helpers/sampled-game-upper";

const streets = ["flop", "turn", "river"] as const;
const fullBoard = ["Qh", "8d", "6h", "2c", "Js"];
const cardsByCode = Array.from({ length: 52 }, () => "");
const encode = (card: string) => cardCode(card[0], card[1]);
for (const rank of "23456789TJQKA") {
  for (const suit of "cdhs") cardsByCode[encode(rank + suit)] = rank + suit;
}

function raisedSpot(street: typeof streets[number]): DecisionInput {
  const board = fullBoard.slice(0, 3 + streets.indexOf(street));
  const rules = { betFractions: [0.5], raiseFractions: [0.5], maxRaises: 2, includeAllIn: true };
  let state: BettingState = {
    street,
    stacks: [360, 360, 360], bets: [0, 0, 0], invested: [0, 0, 0],
    folded: [false, false, false], pending: [true, true, true], canRaise: [true, true, true],
    actor: 0, dealer: 2, currentBet: 0, lastFullRaise: 10, minBet: 10,
    deadPot: 120, raises: 0, history: "", boardCount: board.length, terminal: false,
  };
  for (const id of ["check:0", "bet:60", "raise:180"]) {
    const action = legalActions(state, rules).find((candidate) => candidate.id === id);
    if (!action) throw new Error(`Fixture could not replay ${id}`);
    state = applyAction(state, action, rules);
  }
  return {
    key: `raised-postflop-probe:${street}`, hero: 0, seats: [0, 1, 2],
    heroCards: ["Ah", "Kh"], board, state, rules, chipUnit: 1, currency: "SEK",
    ranges: ["", "", ""], rangeRevision: 0,
    assumptions: ["Uniform compatible private combinations at the raised decision root, without action-conditioned priors or rake."],
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

function decisionPot(input: DecisionInput) {
  return input.state.deadPot + input.state.invested.reduce((a, b) => a + b, 0);
}

function totalChips(input: DecisionInput) {
  return decisionPot(input) + input.state.stacks.reduce((a, b) => a + b, 0);
}

function firstDecisionDeviation(
  input: DecisionInput,
  policy: DecisionPolicy,
  seeds: { fit: number; evaluation: number },
  errorProbability: number,
  confidenceBound: "hoeffding" | "empirical-bernstein",
  deviationSeat: number,
  sampleCounts: { fit: number; evaluation: number },
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
  const fitRandom = auditRandom(fitSeed);
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
  const evaluationRandom = auditRandom(evaluationSeed);
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

/** Reveal the complete deal only to the deviating seat. This enlarged strategy
 * space bounds the legal best response from above, with no maximization at opponents. */
function perfectInformationUpper(input: DecisionInput, policy: DecisionPolicy, errorProbability: number, samples = 40_000) {
  const tree = completePublicTree(input);
  const root = tree.length - 1;
  const players = input.seats.length;
  const profile = new Float64Array(players * tree.length);
  const upper = new Float64Array(players * tree.length);
  const sums = new Float64Array(players);
  const squares = new Float64Array(players);
  const seed = 78319942;
  const next = auditRandom(seed);
  const board = input.board.map(encode);
  const deck = cardsByCode.map((_, code) => code).filter((code) => !board.includes(code));
  const pool = totalChips(input);
  for (let sample = 0; sample < samples; sample++) {
    const { holes, runout } = sampledWorld(deck, board, input.seats, next);
    const scores = holes.map((hand) => -evaluate7([...runout, ...hand].map((code) => cardsByCode[code])));
    const boards = [board, runout.slice(0, 4), runout];
    tree.forEach(({ state, children }, node) => {
      const offset = node * players;
      if (state.terminal) {
        const payoff = settlePayoffs(state, scores);
        profile.set(payoff, offset);
        upper.set(payoff, offset);
        return;
      }
      const mix = policy.query(state, holes[state.actor], boards[state.boardCount - 3]).frequencies;
      for (let seat = 0; seat < players; seat++) {
        let baseline = 0, best = seat === state.actor ? -Infinity : 0;
        for (let a = 0; a < children.length; a++) {
          const child = children[a] * players + seat;
          baseline += mix[a] * profile[child];
          best = seat === state.actor ? Math.max(best, upper[child]) : best + mix[a] * upper[child];
        }
        profile[offset + seat] = baseline;
        upper[offset + seat] = best;
      }
    });
    for (let seat = 0; seat < players; seat++) {
      const index = root * players + seat;
      const delta = upper[index] - profile[index];
      if (delta < -1e-9 || delta > pool + 1e-9) throw new Error("Impossible perfect-information gain");
      sums[seat] += delta;
      squares[seat] += delta * delta;
    }
  }
  const pot = decisionPot(input);
  return { seed, samples, errorProbability, publicNodes: tree.length, seats: input.seats.map((seat) => {
    const mean = sums[seat] / samples;
    const variance = Math.max(0, squares[seat] - sums[seat] * mean) / (samples - 1);
    const margin = empiricalBernsteinMargin(samples, variance, pool, errorProbability);
    return { seat, relaxedGainPct: 100 * mean / pot, upperBoundPct: 100 * Math.min(pool, mean + margin) / pot };
  }) };
}

it("optimizes only the deviating seat in the perfect-information upper bound", () => {
  const input = raisedSpot("river");
  const foldingProfile: DecisionPolicy = {
    query: (state) => {
      const actions = legalActions(state, input.rules);
      return { actions, frequencies: actions.map((_, index) => Number(index === 0)), trained: true };
    },
  };
  // The first two seats can win the 360-chip pot by jamming against folds.
  // The third wins it uncontested and never acts when both opponents keep folding.
  const report = perfectInformationUpper(input, foldingProfile, 0.05, 24);
  expect(report.seats.map((seat) => seat.relaxedGainPct)).toEqual([100, 100, 0]);
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
});

it.skipIf(process.env.POKER_RAISED_POSTFLOP_PROBE !== "1")(
  "times a full-range three-way check / bet / raise and audits the frozen policy",
  () => {
    const street = streets.find((value) => value === process.env.POKER_RAISED_POSTFLOP_STREET);
    if (!street) throw new Error("Set POKER_RAISED_POSTFLOP_STREET to flop, turn or river");
    const output = process.env.POKER_RAISED_POSTFLOP_OUTPUT;
    if (!output) throw new Error("Set POKER_RAISED_POSTFLOP_OUTPUT to the evidence file");
    const started = performance.now();
    const input = raisedSpot(street);
    const offlineMode = process.env.POKER_RAISED_POSTFLOP_OFFLINE;
    const profileDir = process.env.POKER_RAISED_POSTFLOP_PROFILE;
    if (offlineMode && !profileDir) throw new Error("Set POKER_RAISED_POSTFLOP_PROFILE to the profile directory");
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
      expect(heroRow.actions.map((a) => a.id)).toEqual(["fold:0", "call:180", "raise:360"]);
      expect(heroRow.frequencies.reduce((sum, frequency) => sum + frequency, 0)).toBeCloseTo(1, 12);
      const warmSamplesMs = Array.from({ length: 25 }, () => {
        const request = performance.now();
        openPrecomputedPolicy(profileDir, input, "root").policy.query(input.state, hand, board);
        return performance.now() - request;
      });
      const { policy, manifestSha256 } = openPrecomputedPolicy(profileDir, input, "all");
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
    if (offlineMode === "tight" && profileDir) {
      const { policy, manifestSha256 } = openPrecomputedPolicy(profileDir, input, "all");
      const batchCount = 768, batchSize = 256;
      const baseSeed = 59172869;
      const errorProbability = 0.05 / input.seats.length;
      const board = input.board.map(encode);
      const deck = cardsByCode.map((_, code) => code).filter((code) => !board.includes(code));
      const pot = decisionPot(input), pool = totalChips(input);
      const seats = input.seats.map((seat) => {
        const seed = baseSeed + 17_019_479 * seat;
        const random = auditRandom(seed);
        const report = sampledGameSeatUpper(input, policy, seat, batchCount, batchSize, () => {
          const remaining = deck.slice();
          const cards = [0, 1].map(() => remaining.splice(sampleIndex(random, remaining.length), 1)[0]);
          return Array.from({ length: batchSize }, () => {
            const { holes, runout } = sampledWorld(deck, board, input.seats, random, { seat, cards });
            const scores = holes.map((hand) => -evaluate7([...runout, ...hand].map((code) => cardsByCode[code])));
            return { holes, runout, scores };
          });
        });
        const margin = empiricalBernsteinMargin(batchCount, report.variance, pool, errorProbability);
        return { seat, seed, publicNodes: report.publicNodes, estimatePct: 100 * report.mean / pot,
          upperBoundPct: 100 * Math.min(pool, report.mean + margin) / pot };
      });
      const qualityLimitPct = 2.1;
      writeFileSync(output, JSON.stringify({ manifestSha256, batchCount, batchSize, errorProbability,
        elapsedMs: performance.now() - started, qualityLimitPct, seats,
        passesUpperGate: seats.every((seat) => seat.upperBoundPct < qualityLimitPct) }, null, 2) + "\n");
      return;
    }
    if (offlineMode) throw new Error("Set POKER_RAISED_POSTFLOP_OFFLINE to train, lookup, audit or tight");
    const result = solveDecision(input, options, (value) => { policy = value; });
    if (!policy) throw new Error("Missing finalized policy");
    const frozenPolicy = policy;
    const board = input.board.map(encode);
    const heroRow = policy.query(input.state, input.heroCards.map(encode), board);
    const elapsedMs = performance.now() - started;
    const maxRssAfterSolveKiB = process.resourceUsage().maxRSS;
    expect(input.state.actor).toBe(input.hero);
    expect(input.state.bets).toEqual([0, 60, 180]);
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
  }, 360_000,
);
