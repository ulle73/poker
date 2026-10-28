import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { initializeSolver, solveTree } from "../public/solver-engine.js";
import { independentRiverReport } from "../scripts/river-oracle.mjs";
import { legalRiverTree } from "../src/decision/river-legality";
import type { DecisionInput } from "../src/decision/types";
import type { SolveResult } from "../src/core/types";
import { validateConfig, configToToml } from "../src/core/config";
import { verifiedRiver, FULL_RANGE } from "../src/decision/verified-river";
import { prepareDecision } from "../src/decision/adapter";
import type { LiveSnapshot } from "../src/live/types";
import type { SolverClient } from "../src/solver/client";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DecisionAdvisor } from "../src/components/DecisionAdvisor";

export const turnConfig = {
  board: ["Ks", "7d", "2c", "8h"],
  oopRange: "KK,A4s,A5s",
  ipRange: "TT,JJ",
  pot: 10,
  stack: 20,
  betSizes: [50],
  raiseSizes: [50],
  maxIterations: 300,
  targetPct: 0.2,
};
export function turnToml(config = turnConfig) {
  let text = `board="${config.board.join(" ")}"\noop_range="${config.oopRange}"\nip_range="${config.ipRange}"\nstarting_pot=${config.pot}.0\neffective_stack=${config.stack}.0\nraise_cap=1\nallin_threshold=100.0\n`;
  for (const p of ["oop", "ip"])
    for (const s of ["turn", "river"])
      text += `[sizings.${p}.${s}]\nbet={percents=[50.0],allin=true}\nraise={percents=[50.0],allin=true}\n`;
  return text;
}
beforeAll(async () => {
  await initializeSolver(readFileSync("public/wasm/solver_wasm_bg.wasm"));
});

it("exports a complete turn chance graph with strategies only at the selected decision", () => {
  const result = solveTree(turnToml(), turnConfig, () => {}, {
    postflop: true,
    line: [],
  });
  expect(result.nodes.some((n) => n.kind === "chance")).toBe(true);
  expect(result.nodes.filter((n) => n.hands.length > 0)).toHaveLength(1);
  expect(result.nodes[0].hands).toHaveLength(11);
  expect(result.meta.exploitability_pct_of_pot).toBeLessThan(0.2);
  expect(
    result.nodes
      .filter((n) => n.kind === "chance")
      .every((n) => n.valid_cards?.length === 48),
  ).toBe(true);
});

it("selects an IP decision after a check without exporting every future strategy", () => {
  const result = solveTree(turnToml(), turnConfig, () => {}, {
    postflop: true,
    line: ["check"],
  });
  expect(result.nodes[0].hands).toHaveLength(0);
  const selected = result.nodes.find((n) => n.hands.length > 0)!;
  expect(selected.player).toBe(1);
  expect(selected.board).toEqual(turnConfig.board);
  for (const hand of selected.hands) {
    expect(hand.frequencies.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 5);
    const mixed = hand.frequencies.reduce(
      (s, f, i) => s + f * (hand.actionEvs[i] ?? NaN),
      0,
    );
    expect(Math.abs(mixed - (hand.ev ?? NaN))).toBeLessThan(0.001);
  }
});

it("retains the original river-only memory/node gate unless explicitly using postflop mode", () => {
  expect(() => solveTree(turnToml(), turnConfig)).toThrow(/stort|river/i);
});

it("rejects a selected line that is absent from the exact betting model", () => {
  expect(() =>
    solveTree(turnToml(), turnConfig, () => {}, {
      postflop: true,
      line: ["raise"],
    }),
  ).toThrow(/line|linje/i);
});

it("matches independent card enumeration and information-set best responses across the river chance step", () => {
  const result = solveTree(turnToml(), turnConfig, () => {}, {
    postflop: true,
    allStrategies: true,
  });
  const oracle = independentRiverReport(result);
  expect(
    Math.abs(oracle.exploitabilityChips - result.meta.exploitability_chips),
  ).toBeLessThan(0.0001);
  for (let p = 0; p < 2; p++) {
    expect(
      Math.abs(oracle.ev[p] - result.meta.root_evs.zero_sum[p]),
    ).toBeLessThan(0.0001);
    expect(oracle.gains[p]).toBeGreaterThan(-0.0001);
  }
});

const input: DecisionInput = {
  key: "turn",
  hero: 0,
  seats: [1, 2],
  heroCards: ["Kh", "Kd"],
  board: turnConfig.board,
  state: {
    street: "turn",
    stacks: [2000, 2000],
    bets: [0, 0],
    invested: [0, 0],
    folded: [false, false],
    pending: [true, true],
    canRaise: [true, true],
    actor: 0,
    dealer: 1,
    currentBet: 0,
    lastFullRaise: 2,
    minBet: 2,
    deadPot: 1000,
    raises: 0,
    history: "",
    boardCount: 4,
    terminal: false,
  },
  rules: {
    betFractions: [0.5],
    raiseFractions: [0.5],
    maxRaises: 1,
    includeAllIn: true,
  },
  chipUnit: 0.01,
  currency: "EUR",
  ranges: [turnConfig.oopRange, turnConfig.ipRange],
  rangeRevision: 0,
  assumptions: [],
};

it("checks legality across every turn betting line and every river chance outcome", () => {
  const result = {
    ...solveTree(turnToml(), turnConfig, () => {}, { postflop: true }),
    config: turnConfig,
  } as SolveResult;
  expect(legalRiverTree(result, input)).toBe(true);
});

it("rejects mismatched TOML/metadata boards before entering postflop preflight", () => {
  const flop = `board="Ks 7d 2c"\noop_range="AsAh"\nip_range="QsQh"\nstarting_pot=10.0\neffective_stack=20.0\nraise_cap=0\n`;
  expect(() =>
    solveTree(flop, turnConfig, () => {}, { postflop: true }),
  ).toThrow(/board.*match/i);
});

it("accepts turn configurations only through the explicit postflop path", () => {
  expect(validateConfig(turnConfig, { postflop: true }).board).toHaveLength(4);
  expect(configToToml(turnConfig, { postflop: true })).toContain(
    "[sizings.oop.turn]",
  );
  expect(configToToml(turnConfig, { postflop: true })).toContain(
    "[sizings.ip.river]",
  );
  expect(() => validateConfig(turnConfig)).toThrow(/river/i);
});

it("accepts standard offsuit notation and the automatically generated full range", () => {
  const config = validateConfig(
    { ...turnConfig, oopRange: FULL_RANGE, ipRange: "AKo" },
    { postflop: true },
  );
  expect(config.oopRange).toBe(FULL_RANGE);
  expect(config.ipRange).toBe("AKo");
});

it.each([
  { hero: 0, bettor: null },
  { hero: 1, bettor: null },
  { hero: 1, bettor: 0 },
  { hero: 0, bettor: 1 },
])(
  "routes a real converged turn solution for hero $hero facing bettor $bettor",
  async ({ hero, bettor }) => {
    const snapshot: LiveSnapshot = {
      version: 1,
      source: "svenskaspel-dom",
      readerId: "turn-test",
      sequence: 1,
      handId: "1",
      capturedAt: Date.now(),
      currency: "EUR",
      maxSeats: 2,
      players: [
        {
          seat: 1,
          hero: true,
          position: "BB",
          stack: 20,
          bet: 0,
          folded: false,
          inHand: true,
        },
        {
          seat: 2,
          hero: false,
          position: "BTN / SB",
          stack: 20,
          bet: 0,
          folded: false,
          inHand: true,
        },
      ],
      heroCards: ["Kh", "Kd"],
      board: turnConfig.board,
      pot: 10,
      street: "turn",
      dealerSeat: 2,
      heroTurn: true,
      availableActions: ["Check", "Bet"],
      valid: true,
      issues: [],
      observedActions: [],
    };
    snapshot.players = snapshot.players.map((p, i) => ({
      ...p,
      hero: i === hero,
      stack: i === bettor ? 15 : 20,
      bet: i === bettor ? 5 : 0,
    }));
    snapshot.heroCards = hero === 0 ? ["Kh", "Kd"] : ["Th", "Tc"];
    snapshot.pot = bettor === null ? 10 : 15;
    snapshot.availableActions =
      bettor === null ? ["Check", "Bet"] : ["Fold", "Syna", "Höj Till"];
    const prepared = prepareDecision(snapshot, {
      minBet: 2,
      ranges: { 1: turnConfig.oopRange, 2: turnConfig.ipRange },
    });
    const client = {
      solve: async (
        config: SolveResult["config"],
        _progress: unknown,
        options: object,
      ) => ({
        ...solveTree(
          configToToml(config, { postflop: true }),
          config,
          () => {},
          options,
        ),
        config,
      }),
    } as unknown as SolverClient;
    const result = await verifiedRiver(snapshot, prepared, client);
    expect(result?.quality).toBe("verified-gto");
    expect(result?.provider).toContain("turn");
    expect(result?.exploitabilityPct).toBeLessThanOrEqual(0.2);
    expect(
      renderToStaticMarkup(
        createElement(DecisionAdvisor, {
          input: prepared,
          result,
          busy: false,
          error: "",
        }),
      ),
    ).toContain("turn-modellen");
  },
);

it("rejects a legal-looking tree for a different board or player count", () => {
  const result = {
    ...solveTree(turnToml(), turnConfig, () => {}, { postflop: true }),
    config: turnConfig,
  } as SolveResult;
  expect(
    legalRiverTree(result, { ...input, board: ["Ks", "7d", "2c", "9h"] }),
  ).toBe(false);
  expect(legalRiverTree(result, { ...input, seats: [1, 2, 3] })).toBe(false);
});

it.each(["check", "fold", "call"])(
  "rejects a pruned mandatory future %s even when every remaining node is reachable",
  (kind) => {
    const result = {
      ...solveTree(turnToml(), turnConfig, () => {}, { postflop: true }),
      config: turnConfig,
    } as SolveResult;
    const node = result.nodes.find(
      (n) => n.street === "river" && n.actions.some((a) => a.label === kind),
    )!;
    const removed = node.actions.find((a) => a.label === kind)!;
    node.actions = node.actions.filter((a) => a !== removed);
    const byId = new Map(result.nodes.map((n) => [n.id, n])),
      pruned = new Set<number>();
    const visit = (id: number) => {
      if (pruned.has(id)) return;
      pruned.add(id);
      const child = byId.get(id)!;
      child.actions.forEach((a) => visit(a.child));
      child.valid_cards?.forEach((e) => visit(e.child));
    };
    visit(removed.child);
    result.nodes = result.nodes.filter((n) => !pruned.has(n.id));
    expect(legalRiverTree(result, input)).toBe(false);
  },
);
