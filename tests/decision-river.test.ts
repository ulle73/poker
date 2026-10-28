import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { initializeSolver, solveTree } from "../public/solver-engine.js";
import { configToToml } from "../src/core/config";
import { legalRiverTree, legalRiverRoot } from "../src/decision/river-legality";
import { prepareDecision } from "../src/decision/adapter";
import { parseRange } from "../src/decision/sampler";
import { FULL_RANGE, verifiedRiver } from "../src/decision/verified-river";
import type { SolverClient } from "../src/solver/client";
import type { LiveSnapshot } from "../src/live/types";
import type { SolveResult } from "../src/core/types";
const s: LiveSnapshot = {
  version: 1,
  source: "svenskaspel-dom",
  readerId: "test",
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
  board: ["Ks", "7d", "2c", "8h", "3d"],
  pot: 10,
  street: "river",
  dealerSeat: 2,
  heroTurn: true,
  availableActions: ["Check", "Bet"],
  valid: true,
  issues: [],
  observedActions: [],
};
let solved: SolveResult;
beforeAll(async () => {
  await initializeSolver(readFileSync("public/wasm/solver_wasm_bg.wasm"));
  const config = {
    board: s.board,
    oopRange: "KK,A4s,A5s",
    ipRange: "TT,JJ",
    pot: 10,
    stack: 20,
    betSizes: [100],
    raiseSizes: [50],
    maxIterations: 100,
    targetPct: 0.2,
  };
  solved = {
    ...solveTree(configToToml(config), config),
    config,
  } as SolveResult;
});
it("certifies a real WASM river tree when every path follows minimum and stack rules", () => {
  expect(legalRiverTree(solved, prepareDecision(s, { minBet: 2 }))).toBe(true);
});
it("rejects an integral but below-blind bet anywhere in the solved tree", () => {
  expect(legalRiverTree(solved, prepareDecision(s, { minBet: 1500 }))).toBe(
    false,
  );
});
it("rejects fractional client chips in future tree nodes", () => {
  const changed = structuredClone(solved);
  changed.nodes[0].stacks[0] += 0.005;
  expect(legalRiverTree(changed, prepareDecision(s))).toBe(false);
});
it("requires current raising rights and legal monetary amounts for a certified root", () => {
  const input = prepareDecision(
    {
      ...s,
      pot: 20,
      availableActions: ["Fold", "Call", "Raise"],
      players: s.players.map((p, i) => ({ ...p, bet: i === 1 ? 10 : 0 })),
    },
    { minBet: 200, lastFullRaise: 1000 },
  );
  const raise = {
    kind: "raise" as const,
    to: 2000,
    cost: 2000,
    allIn: true,
    id: "raise:2000",
  };
  expect(legalRiverRoot(input, [raise])).toBe(true);
  input.state.canRaise[input.hero] = false;
  expect(legalRiverRoot(input, [raise])).toBe(false);
});
it("the automatic full-range expression covers every two-card combination", () => {
  expect(parseRange(FULL_RANGE)).toHaveLength(1326);
});
it("routes a converged real WASM result to verified advice and rejects stale raise rights", async () => {
  const input = prepareDecision(s, {
    minBet: 2,
    ranges: { 1: "KK,A4s,A5s", 2: "TT,JJ" },
  });
  const client = {
    solve: async (config: SolveResult["config"]) => ({
      ...solveTree(configToToml(config), config),
      config,
    }),
  } as unknown as SolverClient;
  const result = await verifiedRiver(s, input, client);
  expect(result?.quality).toBe("verified-gto");
  expect(result?.actions.some((a) => a.kind === "bet")).toBe(true);
  input.state.canRaise[input.hero] = false;
  expect(await verifiedRiver(s, input, client)).toBeNull();
});
