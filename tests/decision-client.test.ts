import { afterEach, expect, it, vi } from "vitest";
import { DecisionClient } from "../src/decision/client";
import type { DecisionInput } from "../src/decision/types";
class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: { message: string }) => void) | null = null;
  terminated = false;
  id = 0;
  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage(data: { id: number }) {
    this.id = data.id;
  }
  terminate() {
    this.terminated = true;
  }
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  FakeWorker.instances = [];
});
it("terminates the previous decision and ignores its late result", async () => {
  vi.stubGlobal("Worker", FakeWorker);
  const c = new DecisionClient();
  const old = c.compute({ key: "old" } as DecisionInput);
  const rejected = expect(old).rejects.toThrow("avbröts");
  const next = c.compute({ key: "new" } as DecisionInput);
  await rejected;
  const [a, b] = FakeWorker.instances;
  expect(a.terminated).toBe(true);
  a.onmessage!({ data: { id: a.id, result: { key: "old" } } });
  b.onmessage!({ data: { id: b.id, result: { key: "new" } } });
  expect((await next).key).toBe("new");
  expect(b.terminated).toBe(true);
});
it("reports worker failure and kills its timer instead of returning stale advice", async () => {
  vi.stubGlobal("Worker", FakeWorker);
  const c = new DecisionClient(),
    p = c.compute({} as DecisionInput),
    assertion = expect(p).rejects.toThrow("invalid range");
  FakeWorker.instances[0].onmessage!({
    data: { id: 1, error: "invalid range" },
  });
  await assertion;
  expect(FakeWorker.instances[0].terminated).toBe(true);
});
it("bounds a stalled worker and never resolves an unresponsive computation", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("Worker", FakeWorker);
  const c = new DecisionClient(),
    p = c.compute({} as DecisionInput),
    assertion = expect(p).rejects.toThrow("tidsgränsen");
  vi.advanceTimersByTime(6501);
  await assertion;
  expect(FakeWorker.instances[0].terminated).toBe(true);
});
