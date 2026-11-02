import { expect, it } from "vitest";
import { solveDecision } from "../src/decision/mccfr";
import { legalActions } from "../src/decision/betting";
import { cardCode } from "phe";
import type { DecisionInput, DecisionStreet, DecisionPolicy, SolveOptions } from "../src/decision/types";

function game(n = 2, street: DecisionStreet = "river"): DecisionInput {
  const count = { preflop: 0, flop: 3, turn: 4, river: 5 }[street];
  return {
    key: `outcome:${n}:${street}`,
    hero: 0,
    seats: Array.from({ length: n }, (_, i) => i + 1),
    heroCards: ["As", "Ah"],
    board: ["3s", "7h", "9d", "Jc", "Kc"].slice(0, count),
    state: {
      street,
      stacks: Array(n).fill(2),
      bets: Array(n).fill(0),
      invested: Array(n).fill(1),
      folded: Array(n).fill(false),
      pending: Array(n).fill(true),
      canRaise: Array(n).fill(true),
      actor: 0,
      dealer: n - 1,
      currentBet: 0,
      lastFullRaise: 1,
      minBet: 1,
      deadPot: 0,
      raises: 0,
      history: "",
      boardCount: count,
      terminal: false,
    },
    rules: {
      betFractions: [1],
      raiseFractions: [1],
      maxRaises: 1,
      includeAllIn: true,
    },
    chipUnit: 0.01,
    currency: "SEK",
    ranges: Array(n).fill(""),
    rangeRevision: 0,
    assumptions: [],
  };
}

it("uses complete terminal outcome episodes rather than passive budget continuations", () => {
  const result = solveDecision(game(), {
    seed: 395,
    maxIterations: 1000,
    timeBudgetMs: 4000,
  });
  expect(result.provider).toContain("outcome");
  expect(result.cutoffCount).toBe(0);
  expect(result.limitations.join(" ")).not.toContain(
    "bounded traversals used passive",
  );
  expect(result.rootVisits).toBeGreaterThan(0);
});

it("learns player-specific control variates from completed outcomes without changing legal action coverage", () => {
  const input = game(3);
  const result = solveDecision(input, {
    sampling: "outcome",
    baseline: "learned",
    seed: 395,
    maxIterations: 300,
    timeBudgetMs: 4000,
  });
  expect(result.provider).toContain("variance-reduced");
  expect(result.diagnostics?.baselineUpdates).toBeGreaterThan(0);
  expect(result.diagnostics?.baselineBytes).toBeGreaterThan(0);
  expect(result.cutoffCount).toBe(0);
  expect(result.actions.map(({ frequency: _f, ev: _v, ...a }) => a)).toEqual(
    legalActions(input.state, input.rules),
  );
});

it("exposes the completed average policy for independent best-response evaluation", () => {
  const input = game(3);
  let captured: unknown;
  const result = Reflect.apply(solveDecision, null, [
    input,
    { sampling: "outcome", seed: 395, maxIterations: 100, timeBudgetMs: 4000 },
    (profile: unknown) => {
      captured = profile;
    },
  ]);
  expect(captured).toBeDefined();
  const query = Reflect.get(captured as object, "query") as (
    state: unknown,
    own: number[],
    board: number[],
  ) => { frequencies: number[] };
  const codes = (cards: string[]) => cards.map((c) => cardCode(c[0], c[1]));
  expect(
    query(input.state, codes(input.heroCards), codes(input.board)).frequencies,
  ).toEqual(result.actions.map((a: { frequency: number }) => a.frequency));
});

it("rejects a policy query for an inactive acting seat", () => {
  const input = game(3);
  let profile: DecisionPolicy | undefined;
  solveDecision(input, { maxIterations: 10, timeBudgetMs: 4000 }, (p) => {
    profile = p;
  });
  const invalid = { ...input.state, pending: [false, true, true] };
  const codes = (cards: string[]) => cards.map((c) => cardCode(c[0], c[1]));
  expect(() => profile!.query(invalid, codes(input.heroCards), codes(input.board)))
    .toThrow(/legal.*decision|no legal/i);
});

for (const street of ["preflop", "flop", "turn", "river"] as const)
  for (const n of [2, 3, 6, 10])
    it(`reuses public betting transitions without changing the ${n}-player ${street} strategy`, () => {
      const input = game(n, street), saved = structuredClone(input);
      const run = (publicTreeCache: boolean) => solveDecision(input, {
        seed: 395, maxIterations: 50, timeBudgetMs: 4000, publicTreeCache,
      } as SolveOptions);
      const reference = run(false), cached = run(true);
      expect(cached.actions).toEqual(reference.actions);
      expect(cached.rootVisits).toBe(reference.rootVisits);
      expect(cached.iterations).toBe(reference.iterations);
      expect(cached.diagnostics?.informationSets).toBe(reference.diagnostics?.informationSets);
      expect(input).toEqual(saved);
      expect(Reflect.get(cached.diagnostics!, "publicTreeNodes")).toBeGreaterThan(0);
      expect(Reflect.get(reference.diagnostics!, "publicTreeNodes")).toBe(0);
    });

it.each(["none", "learned"] as const)(
  "recovers the independently solved pot-sized river bluff mixture with %s baselines",
  (baseline) => {
    const input = game();
    input.heroCards = ["2s", "2h"];
    input.ranges = ["AsAh,2s2h", "QsQh"];
    input.state.canRaise = [true, false];
    input.rules = {
      betFractions: [1],
      raiseFractions: [],
      maxRaises: 0,
      includeAllIn: false,
    };
    const solve = (heroCards: string[]) =>
      solveDecision(
        { ...input, heroCards },
        {
          sampling: "outcome",
          baseline,
          seed: 395,
          maxIterations: 20000,
          timeBudgetMs: 4000,
        },
      );
    const air = solve(["2s", "2h"]),
      nuts = solve(["As", "Ah"]);
    const bluff = air.actions.find((a) => a.kind === "bet")!.frequency;
    const value = nuts.actions.find((a) => a.kind === "bet")!.frequency;
    expect(bluff).toBeGreaterThan(0.35);
    expect(bluff).toBeLessThan(0.65);
    expect(value).toBeGreaterThan(0.98);
    const versusFold = 0.5 + 0.5 * (bluff - (1 - bluff));
    const versusCall =
      0.5 * (value * 3 + (1 - value)) + 0.5 * (-3 * bluff - (1 - bluff));
    expect(0.5 - Math.min(versusFold, versusCall)).toBeLessThan(0.15);
    expect(air.cutoffCount).toBe(0);
  },
);

it.each(
  [73, 395, 901].flatMap((seed) =>
    (["none", "learned"] as const).map((baseline) => ({ seed, baseline })),
  ),
)(
  "respects weighted chance priors instead of the oversampled hero proposal (seed $seed, $baseline)",
  ({ seed, baseline }) => {
    const input = game();
    input.heroCards = ["2s", "2h"];
    input.ranges = ["AsAh:0.2,2s2h:0.8", "QsQh"];
    input.state.canRaise = [true, false];
    input.rules = {
      betFractions: [1],
      raiseFractions: [],
      maxRaises: 0,
      includeAllIn: false,
    };
    const result = solveDecision(input, {
      sampling: "outcome",
      baseline,
      seed,
      maxIterations: 30000,
      timeBudgetMs: 4000,
    });
    // A pot-sized bluff is half as frequent as value combos. With four times
    // as many air combos, air bets 1/8, rather than the equal-prior answer 1/2.
    const bluff = result.actions.find((a) => a.kind === "bet")!.frequency;
    expect(bluff).toBeGreaterThan(0.07);
    expect(bluff).toBeLessThan(0.18);
  },
);

for (const street of ["preflop", "flop", "turn", "river"] as const)
  for (const n of [2, 3, 6, 10])
    it(`completes entire cycles for ${n} players on ${street}`, () => {
      const input = game(n, street);
      const result = solveDecision(input, {
        sampling: "outcome",
        seed: 19,
        maxIterations: 50,
        timeBudgetMs: 4000,
      });
      expect(
        result.actions.map(({ frequency: _f, ev: _v, ...a }) => a),
      ).toEqual(legalActions(input.state, input.rules));
      expect(result.actions.reduce((s, a) => s + a.frequency, 0)).toBeCloseTo(
        1,
        12,
      );
      expect(result.cutoffCount).toBe(0);
      expect(result.iterations).toBe(50);
      expect(result.quality).toBe("approximation");
      expect(result.exploitabilityPct).toBeNull();
      expect(result.limitations.join(" ")).not.toContain("incomplete");
    });

it("rejects path limits that cannot accommodate complete legal episodes", () => {
  expect(() =>
    solveDecision(game(10, "preflop"), { sampling: "outcome", maxNodes: 4 }),
  ).toThrow(/complete.*episode/i);
});

it("fails closed when memory cannot reserve one complete update cycle", () => {
  expect(() =>
    solveDecision(game(), { sampling: "outcome", maxInfosets: 2 }),
  ).toThrow(/undertrained|complete.*cycle/i);
});
