import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { initializeSolver, solveTree } from "../public/solver-engine.js";
import { configToToml } from "../src/core/config.ts";
import { independentRiverReport, evaluate7 } from "./river-oracle.mjs";

await initializeSolver(
  readFileSync(new URL("../public/wasm/solver_wasm_bg.wasm", import.meta.url)),
);
// Polarized pot-sized river: KK always wins; A4s/A5s always lose vs TT/JJ.
// The equilibrium betting range has one bluff per two value combos at pot size.
// The constrained fixture excludes raising and extra sizes to match this game.
const config = {
  board: ["Ks", "7d", "2c", "8h", "3d"],
  oopRange: "KK,A4s,A5s",
  ipRange: "TT,JJ",
  pot: 10,
  stack: 20,
  betSizes: [100],
  raiseSizes: [50],
  maxIterations: 3000,
  targetPct: 0.01,
};
const toml = `board = "${config.board.join(" ")}"\noop_range = "${config.oopRange}"\nip_range = "${config.ipRange}"\neffective_stack = 20.0\nstarting_pot = 10.0\nraise_cap = 0\n[sizings.oop.river]\nbet = { percents = [100.0] }\n`;
const result = solveTree(toml, config);
const root = result.nodes[0],
  betIndex = root.actions.findIndex((a) => a.label === "bet");
let valueMass = 0,
  bluffMass = 0;
for (const h of root.hands) {
  if (h.cards.match(/K./g)?.length === 2)
    valueMass += h.weight * h.frequencies[betIndex];
  else bluffMass += h.weight * h.frequencies[betIndex];
}
assert.ok(
  result.meta.exploitability_pct_of_pot < 0.05,
  "measured best-response gap must be small",
);
assert.ok(
  Math.abs(bluffMass / valueMass - 0.5) < 0.04,
  `pot-sized bluff:value must be ~1:2, got ${bluffMass / valueMass}`,
);
for (const n of result.nodes) {
  assert.ok(n.stacks.every((s) => s >= -1e-6));
  for (const h of n.hands) {
    assert.ok(Math.abs(h.frequencies.reduce((a, b) => a + b, 0) - 1) < 0.0001);
  }
}
assert.ok(
  Math.abs(result.meta.root_evs.zero_sum.reduce((a, b) => a + b, 0)) < 0.0001,
);
const trainingConfig = { ...config, stack: 40 };
const expanded = solveTree(configToToml(trainingConfig), trainingConfig);
assert.ok(
  expanded.nodes.some((n) => n.actions.some((a) => a.label === "raise")),
  "real training tree must contain raises",
);
assert.ok(
  evaluate7(["Ah", "2h", "3h", "4h", "5h", "Kd", "Kc"]) >
    evaluate7(["As", "Ad", "Ac", "Ah", "Ks", "2d", "3c"]),
  "wheel straight flush beats quads",
);
const oracle = independentRiverReport(expanded);
assert.ok(
  oracle.gains.every((g) => g >= -0.0001),
  "independent best responses cannot lose value",
);
assert.ok(
  Math.abs(oracle.exploitabilityChips - expanded.meta.exploitability_chips) <
    0.0001,
  "independent scalar best response must match Rust",
);
assert.ok(
  oracle.ev.every(
    (v, i) => Math.abs(v - expanded.meta.root_evs.zero_sum[i]) < 0.0001,
  ),
  "independent hand evaluator and traversal must match EV",
);
const empty = { ...config, oopRange: "KsKd" };
assert.throws(() => solveTree(configToToml(empty), empty));
const report = {
  verifiedAt: new Date().toISOString(),
  analytical: {
    iterations: result.meta.iterations,
    exploitabilityPct: result.meta.exploitability_pct_of_pot,
    bluffToValue: bluffMass / valueMass,
    valueMass,
    bluffMass,
    wallMs: result.wallMs,
  },
  trainingTree: {
    nodes: expanded.nodes.length,
    meta: expanded.meta,
    wallMs: expanded.wallMs,
  },
  independentOracle: oracle,
  assertions:
    "polarized equilibrium, actual raises, normalized frequencies, zero sum EV, nonnegative stacks, blocked ranges, independent seven-card evaluator and scalar best response",
};
mkdirSync("artifacts", { recursive: true });
writeFileSync(
  "artifacts/solver-verification.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
