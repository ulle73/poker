import { afterEach, expect, it, vi } from "vitest";
import { SolverClient } from "../src/solver/client";
import { DRILLS } from "../src/core/drills";
class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: { message: string }) => void) | null = null;
  terminated = false;
  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage() {}
  terminate() {
    this.terminated = true;
  }
}
afterEach(() => {
  vi.unstubAllGlobals();
  FakeWorker.instances = [];
});
it("preserves solver validation errors instead of misreporting cancellation", async () => {
  vi.stubGlobal("Worker", FakeWorker);
  const client = new SolverClient();
  const solving = client.solve(DRILLS[0].config, () => {});
  const assertion = expect(solving).rejects.toThrow(
    "range saknar kompatibla händer",
  );
  FakeWorker.instances[0].onmessage!({
    data: { kind: "error", message: "range saknar kompatibla händer" },
  });
  await assertion;
  expect(FakeWorker.instances[0].terminated).toBe(true);
});
it("terminates and rejects a cancelled solve", async () => {
  vi.stubGlobal("Worker", FakeWorker);
  const client = new SolverClient();
  const solving = client.solve(DRILLS[0].config, () => {});
  const assertion = expect(solving).rejects.toThrow("avbröts");
  client.cancel();
  await assertion;
  expect(FakeWorker.instances[0].terminated).toBe(true);
});
