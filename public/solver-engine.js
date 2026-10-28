// Small adapter around the upstream, unmodified Postflop WASM API.
// Shared by the browser worker and offline mathematical verification in Node.
import init, {
  solve_spot,
  tree_stats,
  parse_range,
} from "./wasm/solver_wasm.js";

let boot;
export async function initializeSolver(bytes) {
  boot ??= init({
    module_or_path:
      bytes ?? new URL("./wasm/solver_wasm_bg.wasm", import.meta.url),
  });
  return boot;
}
export function solveTree(toml, config, onProgress = () => {}) {
  // Validate range syntax before building a tree. Zero/blocked ranges are then
  // rejected by NlheGame; memory limits are checked before allocating CFR arrays.
  parse_range(config.oopRange);
  parse_range(config.ipRange);
  const stats = JSON.parse(tree_stats(toml));
  if (stats.total_bytes > 64 * 1024 * 1024 || stats.nodes.total > 250)
    throw new Error(
      "Trädet är för stort för träningsläget. Minska ranger eller antal betstorlekar.",
    );
  const started = performance.now();
  const handle = solve_spot(
    toml,
    config.maxIterations,
    config.targetPct,
    Math.min(100, config.maxIterations),
    onProgress,
  );
  try {
    const meta = JSON.parse(handle.meta());
    const nodes = [];
    for (let id = 0; id < handle.node_count; id++) {
      const n = JSON.parse(handle.node(id));
      if (n.kind === "chance")
        throw new Error("Endast riverträd stöds i MVP:n.");
      n.actions ??= [];
      n.hands = [];
      if (n.kind === "decision") {
        const p = n.player,
          combos = JSON.parse(handle.combos(id, p));
        const strategy = handle.strategy(id),
          evs = handle.combo_evs(id, p),
          weights = handle.combo_ev_weights(id, p);
        const children = n.actions.map((a) => {
          const labels = JSON.parse(handle.combos(a.child, p));
          const ev = handle.combo_evs(a.child, p);
          return new Map(
            labels.map((c, i) => [
              c.cards,
              Number.isFinite(ev[i]) ? ev[i] : null,
            ]),
          );
        });
        n.hands = combos.map((c, i) => ({
          cards: c.cards,
          weight: c.weight,
          compatibleMass: c.weight > 0 ? weights[i] / c.weight : 0,
          frequencies: n.actions.map((_, a) => strategy[a * combos.length + i]),
          ev: Number.isFinite(evs[i]) ? evs[i] : null,
          actionEvs: children.map((m) => m.get(c.cards) ?? null),
        }));
      }
      nodes.push(n);
    }
    return {
      meta,
      nodes,
      wallMs: performance.now() - started,
      memoryBytes: stats.total_bytes,
      rootRanges: [
        JSON.parse(handle.combos(0, 0)),
        JSON.parse(handle.combos(0, 1)),
      ],
    };
  } finally {
    handle.free();
  }
}
