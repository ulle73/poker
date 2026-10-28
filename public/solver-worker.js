import { initializeSolver, solveTree } from "./solver-engine.js";
self.onmessage = async ({ data }) => {
  const { id, toml, config } = data;
  try {
    await initializeSolver();
    const result = solveTree(toml, config, (iterations, chips, pct) =>
      self.postMessage({ id, kind: "progress", iterations, chips, pct }),
    );
    self.postMessage({ id, kind: "done", result });
  } catch (e) {
    self.postMessage({ id, kind: "error", message: e?.message ?? String(e) });
  }
};
