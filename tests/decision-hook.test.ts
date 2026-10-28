import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useDecision } from "../src/decision/use-decision";
import { DecisionAdvisor } from "../src/components/DecisionAdvisor";
import type { LiveSnapshot } from "../src/live/types";
import type { DecisionInput, DecisionResult } from "../src/decision/types";
const calls = vi.hoisted(() => ({ generic: vi.fn(), exact: vi.fn() }));
vi.mock("../src/decision/client", () => ({
  DecisionClient: class {
    compute = calls.generic;
    cancel() {}
  },
}));
vi.mock("../src/solver/client", () => ({
  SolverClient: class {
    cancel() {}
  },
}));
vi.mock("../src/decision/verified-river", () => ({
  verifiedPostflop: calls.exact,
}));

function deferred() {
  let resolve!: (result: DecisionResult | null) => void,
    reject!: (error: Error) => void;
  const promise = new Promise<DecisionResult | null>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const snapshot: LiveSnapshot = {
  version: 1,
  source: "svenskaspel-dom",
  readerId: "hook",
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
  board: ["Ks", "7d", "2c", "8h"],
  pot: 10,
  street: "turn",
  dealerSeat: 2,
  heroTurn: true,
  availableActions: ["Check", "Bet"],
  valid: true,
  issues: [],
  observedActions: [],
};
let root: Root,
  container: HTMLDivElement,
  generic: ReturnType<typeof deferred>,
  exact: ReturnType<typeof deferred>;
function answer(quality: DecisionResult["quality"]): DecisionResult {
  const input = calls.generic.mock.calls[0][0] as DecisionInput;
  return {
    key: input.key,
    rangeRevision: input.rangeRevision,
    quality,
    provider:
      quality === "verified-gto"
        ? "postflop-dcfr/turn"
        : "outcome-sampling-test",
    actions: [
      {
        kind: "check",
        id: "check:0",
        to: 0,
        cost: 0,
        allIn: false,
        frequency: 1,
        ev: 0,
      },
    ],
    recommended: 0,
    iterations: 100,
    rootVisits: 100,
    elapsedMs: 100,
    cutoffCount: 0,
    assumptions: [],
    limitations: [],
    exploitabilityPct: quality === "verified-gto" ? 0.1 : null,
  };
}
function Probe({ value = snapshot }: { value?: LiveSnapshot }) {
  return createElement(DecisionAdvisor, useDecision(value, true));
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  calls.generic.mockReset();
  calls.exact.mockReset();
  generic = deferred();
  exact = deferred();
  calls.generic.mockReturnValue(generic.promise);
  calls.exact.mockReturnValue(exact.promise);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
});

it("keeps the exact-solver pending state after the generic experiment finishes", async () => {
  await act(async () => {
    root.render(createElement(Probe));
  });
  await act(async () => {
    generic.resolve(answer("approximation"));
  });
  expect(container.textContent).toContain("Beräknar verifierad strategi");
  expect(container.querySelector(".recommendation")).toBeNull();
  await act(async () => {
    exact.resolve(answer("verified-gto"));
  });
  expect(container.textContent).toContain("Verifierad GTO i valt träd");
  expect(container.querySelector(".recommendation")).not.toBeNull();
});

it("lets a pending exact solve recover a generic solver failure without showing a false wait-for-table state", async () => {
  await act(async () => {
    root.render(createElement(Probe));
  });
  await act(async () => {
    generic.reject(new Error("generic failed"));
  });
  expect(container.textContent).toContain("Beräknar ditt beslut");
  expect(container.textContent).not.toContain("Inväntar beslutsläge");
  await act(async () => {
    exact.resolve(answer("verified-gto"));
  });
  expect(container.textContent).toContain("Verifierad GTO i valt träd");
});

it("ignores a late exact certificate after the hand changes", async () => {
  await act(async () => {
    root.render(createElement(Probe));
  });
  const oldCertificate = answer("verified-gto"),
    oldGeneric = generic,
    oldExact = exact;
  generic = deferred();
  exact = deferred();
  calls.generic.mockReturnValue(generic.promise);
  calls.exact.mockReturnValue(exact.promise);
  await act(async () => {
    root.render(createElement(Probe, { value: { ...snapshot, handId: "2" } }));
  });
  await act(async () => {
    oldExact.resolve(oldCertificate);
    oldGeneric.resolve({ ...oldCertificate, quality: "approximation" });
  });
  expect(container.querySelector(".recommendation")).toBeNull();
  const latest = calls.generic.mock.calls[1][0] as DecisionInput;
  const nextCertificate = {
    ...oldCertificate,
    key: latest.key,
    rangeRevision: latest.rangeRevision,
  };
  await act(async () => {
    exact.resolve(nextCertificate);
    generic.resolve({ ...nextCertificate, quality: "approximation" });
  });
  expect(container.textContent).toContain("Verifierad GTO i valt träd");
  expect(container.querySelector(".recommendation")).not.toBeNull();
});
