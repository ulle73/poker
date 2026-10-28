import { configKey, configToToml, validateConfig } from "../core/config";
import type { SolveResult, TrainingConfig } from "../core/types";
export type Progress = { iterations: number; chips: number; pct: number };
const cache = new Map<string, SolveResult>();
export class SolverClient {
  private worker: Worker | null = null;
  private reject: ((error: Error) => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  cancel() {
    this.worker?.terminate();
    this.worker = null;
    if (this.timer) clearTimeout(this.timer);
    this.reject?.(new Error("Beräkningen avbröts."));
    this.reject = null;
  }
  async solve(
    input: TrainingConfig,
    onProgress: (p: Progress) => void,
    options: { postflop?: boolean; line?: string[] } = {},
  ): Promise<SolveResult> {
    this.cancel();
    const config = validateConfig(input, options),
      key = options.postflop
        ? JSON.stringify(["postflop", config, options.line ?? []])
        : configKey(config);
    const saved = cache.get(key);
    if (saved) return saved;
    return new Promise((resolve, reject) => {
      this.reject = reject;
      const worker = new Worker(new URL("solver-worker.js", document.baseURI), {
        type: "module",
      });
      this.worker = worker;
      const fail = (message: string) => {
        this.reject = null;
        this.cancel();
        reject(new Error(message));
      };
      this.timer = setTimeout(
        () =>
          fail(
            options.postflop
              ? "Turn-beräkningen överskred 25 sekunder."
              : "Beräkningen tog över 60 sekunder. Minska rangerna eller iterationsgränsen.",
          ),
        options.postflop ? 25000 : 60000,
      );
      worker.onerror = (e) => fail(e.message || "Solvern kunde inte starta.");
      worker.onmessage = ({ data }) => {
        if (this.worker !== worker) return;
        if (data.kind === "progress") {
          onProgress(data);
          return;
        }
        if (data.kind === "error") {
          fail(data.message);
          return;
        }
        if (data.kind === "done") {
          const result = { ...data.result, key, config } as SolveResult;
          if (
            !Number.isFinite(result.meta.exploitability_pct_of_pot) ||
            !result.nodes.length
          ) {
            fail("Solvern returnerade en ogiltig lösning.");
            return;
          }
          this.reject = null;
          this.cancel();
          cache.set(key, result);
          if (cache.size > 8) cache.delete(cache.keys().next().value!);
          resolve(result);
        }
      };
      worker.postMessage({
        id: crypto.randomUUID(),
        toml: configToToml(config, options),
        config,
        options,
      });
    });
  }
}
