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
import type { BettingState, DecisionInput, DecisionPolicy } from "../src/decision/types";

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

function rootDeviation(input: DecisionInput, policy: DecisionPolicy, external: boolean) {
  const board = input.board.map(encode);
  const deck = cardsByCode.map((_, code) => code).filter((code) => !board.includes(code));
  const actions = legalActions(input.state, input.rules);
  const roots = actions.map((action) => applyAction(input.state, action, input.rules));
  const ranks = new Map<number, number>();
  const keyFor = (cards: number[]) => Math.min(...cards) * 52 + Math.max(...cards);
  const totals = new Map<number, number[]>();
  const successors = new Map<string, BettingState>();
  let testedContinuations = 0;
  let trainedContinuations = 0;

  function sample(next: () => number) {
    const remaining = deck.slice();
    const draw = () => remaining.splice(sampleIndex(next, remaining.length), 1)[0];
    const holes = input.seats.map(() => [draw(), draw()]);
    const runout = [...board];
    while (runout.length < 5) runout.push(draw());
    const key = keyFor(holes[0]);
    const mix = policy.query(input.state, holes[0], board).frequencies;
    const scores = holes.map((hand) => {
      const handKey = keyFor(hand);
      const cached = ranks.get(handKey);
      if (board.length === 5 && cached !== undefined) return cached;
      const score = -evaluate7([...runout, ...hand].map((code) => cardsByCode[code]));
      if (board.length === 5) ranks.set(handKey, score);
      return score;
    });
    const uniforms: number[] = [];
    const values = roots.map((root) => {
      let state = root;
      let depth = 0;
      while (!state.terminal) {
        const row = policy.query(state, holes[state.actor], runout.slice(0, state.boardCount));
        testedContinuations++;
        if (row.trained) trainedContinuations++;
        let draw = uniforms[depth] ?? (uniforms[depth] = next() / 2 ** 32);
        depth++;
        let index = 0;
        while (index < row.actions.length - 1 && draw >= row.frequencies[index]) {
          draw -= row.frequencies[index++];
        }
        const action = row.actions[index];
        const transition = `${state.history}/${action.id}`;
        let child = successors.get(transition);
        if (!child) {
          child = applyAction(state, action, input.rules);
          successors.set(transition, child);
        }
        state = child;
      }
      return settlePayoffs(state, scores)[0];
    });
    return { key, values, mix };
  }

  const fitSamples = 60_000;
  const evaluationSamples = 160_000;
  const fitSeed = external ? 741833 : 81013;
  const evaluationSeed = external ? 2105279 : 240781;
  const fitRandom = auditRandom(fitSeed);
  for (let i = 0; i < fitSamples; i++) {
    const { key, values } = sample(fitRandom);
    const sum = totals.get(key) ?? actions.map(() => 0);
    values.forEach((value, index) => { sum[index] += value; });
    totals.set(key, sum);
  }
  const deviation = new Map([...totals].map(([key, sum]) => [key, sum.indexOf(Math.max(...sum))]));

  testedContinuations = 0;
  trainedContinuations = 0;
  const evaluationRandom = auditRandom(evaluationSeed);
  const pool = input.state.deadPot + input.state.stacks.reduce((a, b) => a + b, 0)
    + input.state.invested.reduce((a, b) => a + b, 0);
  let gain = 0;
  let profileEv = 0;
  for (let i = 0; i < evaluationSamples; i++) {
    const { key, values, mix } = sample(evaluationRandom);
    const profileValue = values.reduce((sum, value, index) => sum + value * mix[index], 0);
    const difference = values[deviation.get(key) ?? 0] - profileValue;
    if (Math.abs(difference) > pool) throw new Error("Paired payoff outside chip bound");
    gain += difference;
    profileEv += profileValue;
  }

  const pot = input.state.deadPot + input.state.invested.reduce((a, b) => a + b, 0);
  // One-sided Hoeffding bound. The three primary runs share a single 5% error budget.
  const errorProbability = external ? 0.05 : 0.05 / streets.length;
  const errorChips = 2 * pool * Math.sqrt(Math.log(1 / errorProbability) / (2 * evaluationSamples));
  const possibleGainChips = gain / evaluationSamples;
  const lowerBoundChips = Math.max(0, possibleGainChips - errorChips);
  return {
    fitSeed, evaluationSeed, fitSamples, evaluationSamples, errorProbability,
    fitPrivateCombos: deviation.size,
    deviationActionCounts: Object.fromEntries(actions.map(({ id }, index) => [
      id, [...deviation.values()].filter((chosen) => chosen === index).length,
    ])),
    profileEvChips: profileEv / evaluationSamples,
    possibleGainChips, errorChips, lowerBoundChips,
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
    const options = external
      ? { seed: 395, sampling: "external", maxDepth: 48, maxNodes: 4096, timeBudgetMs: 4000 } as const
      : { seed: 395, sampling: "outcome", baseline: "learned", timeBudgetMs: 4000 } as const;
    const result = solveDecision(input, options, (value) => { policy = value; });
    if (!policy) throw new Error("Missing finalized policy");
    const board = input.board.map(encode);
    const heroRow = policy.query(input.state, input.heroCards.map(encode), board);
    const elapsedMs = performance.now() - started;
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
    const audit = rootDeviation(input, policy, external);
    const qualityLimitPct = 2.1;
    writeFileSync(output, JSON.stringify({
      verifiedAt: new Date().toISOString(),
      revision: execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(),
      environment: {
        platform: process.platform, node: process.version, cpu: cpus()[0]?.model,
      },
      input, options, elapsedMs, heroRow, result,
      rootCombos: deck.length * (deck.length - 1) / 2, rootTrained,
      heroRowMatchesResult: heroRow.frequencies.every((frequency, index) =>
        Math.abs(frequency - result.actions[index].frequency) < 1e-9),
      auditMs: performance.now() - auditStart, audit, qualityLimitPct,
      latencyPass: elapsedMs < 10_000,
      quality: audit.lowerBoundPct > qualityLimitPct ? "rejected-by-deviation" : "unverified",
      qualifies: false,
    }, null, 2) + "\n");
  }, 240_000,
);
