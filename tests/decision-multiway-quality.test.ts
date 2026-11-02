import { expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { legalActions } from "../src/decision/betting";
import { solveDecision } from "../src/decision/mccfr";
import type { DecisionInput, DecisionPolicy } from "../src/decision/types";
import {
  independentCheckJamReport,
  checkJamInitial,
  type CheckJamSpot,
} from "./helpers/check-jam-oracle";
const rules = {
  betFractions: [],
  raiseFractions: [],
  maxRaises: 0,
  includeAllIn: true,
};
const simple: CheckJamSpot = {
  board: ["2c", "3d", "7h", "9s", "Jc"],
  ranges: [
    [{ cards: ["As", "Ah"], weight: 1 }],
    [{ cards: ["Ks", "Kh"], weight: 1 }],
  ],
  investment: 1,
  stack: 1,
};
const uniform: DecisionPolicy = {
  query: (state) => {
    const actions = legalActions(state, rules);
    return {
      actions,
      frequencies: actions.map(() => 1 / actions.length),
      trained: true,
    };
  },
};

it("calibrates the independent best-response oracle against a manually enumerated two-player game", () => {
  const report = independentCheckJamReport(simple, uniform);
  expect(report.ev[0]).toBe(1.125);
  expect(report.ev[1]).toBe(-1.125);
  expect(report.bestResponse[0]).toBe(1.5);
  expect(report.bestResponse[1]).toBe(-0.75);
  expect(report.nashConv).toBe(0.75);
  expect(report.nashConvPct).toBe(37.5);
});

it("recognizes an independently known zero-deviation equilibrium", () => {
  const perfect: DecisionPolicy = {
    query: (state) => {
      const actions = legalActions(state, rules),
        kind =
          state.actor === 0
            ? state.currentBet > state.bets[0]
              ? "call"
              : "bet"
            : state.currentBet > state.bets[1]
              ? "fold"
              : "check";
      return {
        actions,
        frequencies: actions.map((a) => (a.kind === kind ? 1 : 0)),
        trained: true,
      };
    },
  };
  const report = independentCheckJamReport(simple, perfect);
  expect(report.ev).toEqual([1, -1]);
  expect(report.nashConv).toBe(0);
});

it("rejects duplicate private combinations instead of counting their belief twice", () => {
  const duplicate: CheckJamSpot = {
    ...simple,
    ranges: [[...simple.ranges[0], { cards: ["Ah", "As"], weight: 1 }], simple.ranges[1]],
  };
  expect(() => independentCheckJamReport(duplicate, uniform)).toThrow(/duplicate/i);
});

it("rejects a zero-pot fixture whose percentage certificate is undefined", () => {
  expect(() => independentCheckJamReport({ ...simple, investment: 0 }, uniform))
    .toThrow(/invalid.*fixture/i);
});

it("awards odd chips separately for each contribution tier, even with equal starting stacks", () => {
  const tied: CheckJamSpot = {
    ...simple,
    ranges: [
      ["Ks", "Kh"], ["Kd", "Kc"], ["Qs", "Qh"], ["As", "Ah"], ["Ad", "Ac"],
    ].map((cards) => [{ cards: cards as [string, string], weight: 1 }]),
  };
  const profile: DecisionPolicy = {
    query: (state) => {
      const actions = legalActions(state, rules);
      const facing = state.currentBet > state.bets[state.actor];
      const selected = state.actor === 0
        ? facing ? "call" : "bet"
        : !facing ? "check" : state.actor < 3 ? "call" : "fold";
      return { actions, frequencies: actions.map((a) => a.kind === selected ? 1 : 0), trained: true };
    },
  };
  // Main pot 5 => 3/2 and side pot 3 => 2/1 to seats 0/1; each invested 2.
  expect(independentCheckJamReport(tied, profile).ev).toEqual([3, 1, -2, -1, -1]);
});

it("does not let a best response see the opponent's hidden hand", () => {
  const spot: CheckJamSpot = {
    ...simple,
    board: ["3s", "7h", "9d", "Jc", "Kc"],
    ranges: [
      [{ cards: ["Qs", "Qh"], weight: 1 }],
      [
        { cards: ["As", "Ah"], weight: 0.5 },
        { cards: ["2s", "2h"], weight: 0.5 },
      ],
    ],
  };
  const profile: DecisionPolicy = {
    query: (state) => {
      const actions = legalActions(state, rules);
      if (state.actor === 0)
        return {
          actions,
          frequencies: actions.map(() => 1 / actions.length),
          trained: true,
        };
      return {
        actions,
        frequencies: actions.map((a) =>
          a.kind === "bet" || a.kind === "call" ? 1 : 0,
        ),
        trained: true,
      };
    },
  };
  expect(independentCheckJamReport(spot, profile).bestResponse[0]).toBe(0);
});

function fixture(count: number): CheckJamSpot {
  const combos = [
    [
      ["As", "Ad"],
      ["Qs", "Js"],
    ],
    [
      ["Ac", "Kh"],
      ["Qc", "Qd"],
    ],
    [
      ["Jc", "Jd"],
      ["Ad", "Qh"],
    ],
    [["Ts", "Th"]],
    [["9s", "9h"]],
    [["8s", "8h"]],
    [["6s", "6h"]],
    [["5s", "5h"]],
    [["3s", "3h"]],
    [["Tc", "Td"]],
  ];
  return {
    board: ["Ah", "Kd", "7c", "4s", "2h"],
    ranges: combos
      .slice(0, count)
      .map((range) =>
        range.map((cards) => ({ cards: cards as [string, string], weight: 1 })),
      ),
    investment: 60,
    stack: 90,
  };
}
function inputFor(spot: CheckJamSpot): DecisionInput {
  const n = spot.ranges.length;
  return {
    key: `quality-check-jam:${n}`,
    hero: 0,
    seats: Array.from({ length: n }, (_, i) => i + 1),
    heroCards: spot.ranges[0][0].cards,
    board: spot.board,
    state: checkJamInitial(spot),
    rules,
    chipUnit: 1,
    currency: "SEK",
    ranges: spot.ranges.map((range) =>
      range.map((h) => h.cards.join("") + ":" + h.weight).join(","),
    ),
    rangeRevision: 0,
    assumptions: [
      "Exact small range priors for independent calibration; not full-range poker.",
    ],
  };
}

it("preserves the full learned average policy under public-tree caching", () => {
  const spot = fixture(3), input = inputFor(spot);
  input.ranges[0] = "AsAd:0.2,QsJs:0.8";
  spot.ranges[0][0].weight = 0.2;
  spot.ranges[0][1].weight = 0.8;
  const run = (publicTreeCache: boolean) => {
    let profile: DecisionPolicy | undefined;
    const result = solveDecision(input, {
      seed: 395, baseline: "learned", publicTreeCache, maxIterations: 3000, timeBudgetMs: 4000,
    }, (p) => { profile = p; });
    return { result, report: independentCheckJamReport(spot, profile!) };
  };
  const reference = run(false), cached = run(true);
  expect(cached.result.actions).toEqual(reference.result.actions);
  expect(cached.report).toEqual(reference.report);
});

it.skipIf(process.env.POKER_PUBLIC_CACHE_PERF !== "1")(
  "compares fixed-cycle throughput without accepting a different strategy",
  () => {
    const runs = [];
    for (const count of [3, 6, 10]) {
      const input = inputFor(fixture(count));
      for (const publicTreeCache of [false, true])
        solveDecision(input, { publicTreeCache, maxIterations: 250, timeBudgetMs: 4000 });
      for (const order of [[false, true], [true, false]]) {
        const results = order.map((publicTreeCache) => ({
          publicTreeCache,
          result: solveDecision(input, {
            seed: 395, publicTreeCache, maxIterations: 2000, timeBudgetMs: 4000,
          }),
        }));
        for (const { result } of results) expect(result.iterations).toBe(2000);
        expect(results[0].result.actions).toEqual(results[1].result.actions);
        expect(results[0].result.rootVisits).toBe(results[1].result.rootVisits);
        runs.push({ count, results });
      }
    }
    writeFileSync("docs/evidence/public-tree-performance-2026-11-02.json",
      JSON.stringify({
        verifiedAt: new Date().toISOString(),
        scope: "Same-seed, same-cycle comparison with alternating order after warmup; no strategy certification.",
        goalReady: false, runs,
      }, null, 2) + "\n");
  }, 60000,
);

it.skipIf(process.env.POKER_MULTIWAY_PROBE !== "1")(
  "measures full-profile unilateral deviation gains for 3, 6 and 10 players",
  () => {
    const runs = [];
    for (const count of [3, 6, 10])
      for (const baseline of ["none", "learned"] as const) {
        const spot = fixture(count),
          input = inputFor(spot);
        let profile: DecisionPolicy | undefined;
        const result = solveDecision(
          input,
          {
            seed: 395,
            sampling: "outcome",
            baseline,
            timeBudgetMs: 4000,
            maxIterations: Number(process.env.POKER_MULTIWAY_ITERATIONS ?? 10000),
            publicTreeCache: process.env.POKER_PUBLIC_CACHE !== "0",
          },
          (policy) => {
            profile = policy;
          },
        );
        if (!profile) throw new Error("No completed average policy.");
        const report = independentCheckJamReport(spot, profile);
        expect(report.gains.every((g) => g >= -1e-8)).toBe(true);
        expect(report.ev.reduce((sum, v) => sum + v, 0)).toBeCloseTo(0, 7);
        runs.push({ count, baseline, result, report });
      }
    writeFileSync(
      process.env.POKER_MULTIWAY_OUTPUT ?? "docs/evidence/multiway-policy-quality-2026-11-02.json",
      JSON.stringify(
        {
          verifiedAt: new Date().toISOString(),
          goalReady: false,
          scope:
            "Independent exact best responses to learned average policies in finite equal-stack check/jam river games with small private ranges. Does not certify general full-range NLHE.",
          runs,
        },
        null,
        2,
      ) + "\n",
    );
  },
  60000,
);
