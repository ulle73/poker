import type { DecisionInput, DecisionResult, SolveOptions } from "./types";
export class DecisionClient {
  private worker: Worker | null = null;
  private reject: ((e: Error) => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private sequence = 0;
  cancel() {
    this.worker?.terminate();
    this.worker = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.reject?.(new Error("Beslutsberäkningen avbröts."));
    this.reject = null;
  }
  compute(
    input: DecisionInput,
    options?: SolveOptions,
  ): Promise<DecisionResult> {
    this.cancel();
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.reject = reject;
      const worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
      this.worker = worker;
      const fail = (message: string) => {
        if (this.worker !== worker) return;
        this.reject = null;
        this.cancel();
        reject(new Error(message));
      };
      this.timer = setTimeout(
        () => fail("Beslutsmotorn överskred tidsgränsen."),
        6500,
      );
      worker.onerror = (e) =>
        fail(e.message || "Beslutsmotorn kunde inte startas.");
      worker.onmessage = ({ data }) => {
        if (this.worker !== worker || data.id !== id) return;
        if (data.error) {
          fail(data.error);
          return;
        }
        this.reject = null;
        this.cancel();
        resolve(data.result);
      };
      worker.postMessage({ id, input, options });
    });
  }
}
