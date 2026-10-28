import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { initializeSolver, solveTree } from "../public/solver-engine.js";
import { configToToml } from "../src/core/config.ts";
import { independentRiverReport } from "./river-oracle.mjs";

const bytes = readFileSync(
  new URL("../public/wasm/solver_wasm_bg.wasm", import.meta.url),
);
await initializeSolver(bytes);
const config = {
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
const narrow = solveTree(
  configToToml(config, { postflop: true }),
  config,
  () => {},
  { postflop: true, allStrategies: true },
);
const independent = independentRiverReport(narrow);
const evError = independent.ev.map((v, i) =>
  Math.abs(v - narrow.meta.root_evs.zero_sum[i]),
);
const gapError = Math.abs(
  independent.exploitabilityChips - narrow.meta.exploitability_chips,
);
assert.ok(evError.every((error) => error < 0.0001));
assert.ok(gapError < 0.0001);
assert.ok(independent.gains.every((gain) => gain >= -0.0001));
assert.ok(narrow.meta.exploitability_pct_of_pot <= config.targetPct);

// Independent full-range expression: every pair, suited and offsuit hand.
// The native test separately uses the app's automatic FULL_RANGE constant.
const fullRange = [
  "22+",
  ..."3456789TJQKA".split("").flatMap((rank) => [`${rank}2s+`, `${rank}2o+`]),
].join(",");
const fullConfig = {
  ...config,
  pot: 20,
  stack: 5,
  oopRange: fullRange,
  ipRange: fullRange,
};
const full = solveTree(
  configToToml(fullConfig, { postflop: true }),
  fullConfig,
  () => {},
  { postflop: true, line: ["check"] },
);
assert.deepEqual(full.meta.root_combos, [1128, 1128]);
assert.ok(full.meta.exploitability_pct_of_pot <= fullConfig.targetPct);
assert.equal(full.nodes.filter((node) => node.hands.length).length, 1);
const report = {
  verifiedAt: new Date().toISOString(),
  wasmSha256: createHash("sha256").update(bytes).digest("hex"),
  scope:
    "Heads-up turn through river in the selected no-rake bet-size tree and range assumptions. Does not certify the generic multiway engine.",
  goalReady: false,
  independentFixture: {
    config,
    nodes: narrow.nodes.length,
    memoryBytes: narrow.memoryBytes,
    wallMs: narrow.wallMs,
    solver: narrow.meta,
    independent,
    absoluteEVErrors: evError,
    absoluteBestResponseGapError: gapError,
  },
  fullRangeFixture: {
    config: fullConfig,
    nodes: full.nodes.length,
    memoryBytes: full.memoryBytes,
    wallMs: full.wallMs,
    solver: full.meta,
    selectedNodeId: full.selectedNodeId,
    independentScalarWalk: false,
    note: "This large fixture uses solver-reported exploitability. The independent scalar best-response walk above validates the smaller chance game. Native tests additionally validate automatic ranges, legal actions and the quality gate.",
  },
};
writeFileSync(
  new URL("../docs/evidence/turn-solver-verification.json", import.meta.url),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    narrowPct: narrow.meta.exploitability_pct_of_pot,
    independentGapError: gapError,
    fullRangePct: full.meta.exploitability_pct_of_pot,
    fullRangeMs: full.wallMs,
    fullRangeBytes: full.memoryBytes,
  }),
);
