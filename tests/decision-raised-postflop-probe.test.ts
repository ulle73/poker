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
    const remaining = deck.slice();
    const draw = () => remaining.splice(sampleIndex(next, remaining.length), 1)[0];
    const holes = input.seats.map(() => [draw(), draw()]);
    const runout = [...board];
    while (runout.length < 5) runout.push(draw());
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
  const pool = input.state.deadPot + input.state.stacks.reduce((a, b) => a + b, 0)
    + input.state.invested.reduce((a, b) => a + b, 0);
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

  const pot = input.state.deadPot + input.state.invested.reduce((a, b) => a + b, 0);
  const possibleGainChips = gain / evaluationSamples;
  const variance = Math.max(0, squaredGain - gain * possibleGainChips) / (evaluationSamples - 1);
  const logEmpirical = Math.log(2 / errorProbability);
  // Apply Maurer–Pontil theorem 4 to the negative gain for a one-sided lower bound.
  const errorChips = confidenceBound === "empirical-bernstein"
    ? Math.sqrt(2 * variance * logEmpirical / evaluationSamples)
      + 7 * (2 * pool) * logEmpirical / (3 * (evaluationSamples - 1))
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

it.skipIf(process.env.POKER_RAISED_POSTFLOP_PROBE !== "1")(
  "times a full-range three-way check / bet / raise and audits the frozen policy",
  () => {
    const street = streets.find((value) => value === process.env.POKER_RAISED_POSTFLOP_STREET);
    if (!street) throw new Error("Set POKER_RAISED_POSTFLOP_STREET to flop, turn or river");
    const output = process.env.POKER_RAISED_POSTFLOP_OUTPUT;
    if (!output) throw new Error("Set POKER_RAISED_POSTFLOP_OUTPUT to the evidence file");
    const started = performance.now();
    const input = raisedSpot(street);
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
  }, 240_000,
);
