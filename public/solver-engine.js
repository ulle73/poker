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
export function solveTree(toml, config, onProgress = () => {}, options = {}) {
  const postflop = options.postflop === true;
  // Flop preflight itself can build a very large public tree. Do not allocate
  // that tree through this bounded live path until its resource model is tested.
  if (postflop && ![4, 5].includes(config.board?.length))
    throw new Error("Postflop mode currently requires a turn or river board.");
  if (postflop) {
    const board = /^\s*board\s*=\s*"([^"\r\n]+)"\s*$/m.exec(toml)?.[1];
    if (
      !board ||
      board.trim().split(/\s+/).join(" ") !== config.board.join(" ")
    )
      throw new Error("TOML board does not match postflop configuration.");
  }
  // Validate range syntax before building a tree. Zero/blocked ranges are then
  // rejected by NlheGame; memory limits are checked before allocating CFR arrays.
  parse_range(config.oopRange);
  parse_range(config.ipRange);
  const stats = JSON.parse(tree_stats(toml));
  if (
    stats.total_bytes > 64 * 1024 * 1024 ||
    stats.nodes.total > (postflop ? 5000 : 250)
  )
    throw new Error(
      "Trädet är för stort för träningsläget. Minska ranger eller antal betstorlekar.",
    );
  if (postflop && options.allStrategies && stats.strategy_entries > 100000)
    throw new Error(
      "Full strategy export exceeds the independent-audit budget.",
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
    let selectedNodeId = 0;
    if (postflop) {
      for (const step of options.line ?? []) {
        const current = JSON.parse(handle.node(selectedNodeId));
        const [label, size] = step.split(":");
        const action = current.actions?.find(
          (a) =>
            a.label === label &&
            (size === undefined ||
              Math.abs(a.percent_of_pot - Number(size)) < 1e-6),
        );
        if (!action)
          throw new Error(
            "Selected line is absent from the exact betting tree.",
          );
        selectedNodeId = action.child;
      }
      if (JSON.parse(handle.node(selectedNodeId)).kind !== "decision")
        throw new Error("Selected line does not end at a decision.");
    }
    const nodes = [];
    for (let id = 0; id < handle.node_count; id++) {
      const n = JSON.parse(handle.node(id));
      if (n.kind === "chance" && !postflop)
        throw new Error("Endast riverträd stöds i MVP:n.");
      n.actions ??= [];
      n.hands = [];
      if (
        n.kind === "decision" &&
        (!postflop || options.allStrategies || id === selectedNodeId)
      ) {
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
      ...(postflop ? { selectedNodeId } : {}),
      rootRanges: [
        JSON.parse(handle.combos(0, 0)),
        JSON.parse(handle.combos(0, 1)),
      ],
    };
  } finally {
    handle.free();
  }
}
