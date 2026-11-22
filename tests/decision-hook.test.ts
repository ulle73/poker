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
vi.mock("../src/decision/verified-river", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/decision/verified-river")>(),
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
  const input = calls.exact.mock.calls[0][1] as DecisionInput;
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
function Probe({ value = snapshot, fresh = true, enabled = true, receivedAt }: {
  value?: LiveSnapshot; fresh?: boolean; enabled?: boolean; receivedAt?: number;
}) {
  return createElement(DecisionAdvisor, useDecision(value, fresh, enabled, receivedAt));
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

it("runs only the free exact solver and keeps advice hidden until it completes", async () => {
  await act(async () => { root.render(createElement(Probe)); });
  expect(calls.generic).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Beräknar ditt beslut");
  expect(container.querySelector(".recommendation")).toBeNull();
  await act(async () => { exact.resolve(answer("verified-gto")); });
  expect(container.textContent).toContain("Solverstrategi · 2 % felgräns");
  expect(container.querySelector(".recommendation")).not.toBeNull();
});

it("reports solver errors instead of silently waiting for another table snapshot", async () => {
  await act(async () => { root.render(createElement(Probe)); });
  await act(async () => { exact.reject(new Error("Beräkningen tog för lång tid.")); });
  expect(container.textContent).toContain("Beräkningen tog för lång tid.");
  expect(container.querySelector(".recommendation")).toBeNull();
});

it("explains the coverage gap on flop without launching a solver", async () => {
  await act(async () => { root.render(createElement(Probe, {value: {...snapshot, street: "flop", board: snapshot.board.slice(0,3)}})); });
  expect(container.textContent).toContain("flop");
  expect(calls.exact).not.toHaveBeenCalled();
  expect(calls.generic).not.toHaveBeenCalled();
});

it("rejects an experimental answer even if supplied by the exact adapter", async () => {
  await act(async () => { root.render(createElement(Probe)); });
  await act(async () => { exact.resolve(answer("approximation")); });
  expect(container.querySelector(".recommendation")).toBeNull();
  expect(container.textContent).toContain("kvalitetskontrollen");
});

it("ignores a late exact certificate after the hand changes", async () => {
  await act(async () => { root.render(createElement(Probe)); });
  const oldCertificate = answer("verified-gto"), oldExact = exact;
  exact = deferred();
  calls.exact.mockReturnValue(exact.promise);
  await act(async () => { root.render(createElement(Probe, { value: { ...snapshot, handId: "2" } })); });
  await act(async () => { oldExact.resolve(oldCertificate); });
  expect(container.querySelector(".recommendation")).toBeNull();
  const latest = calls.exact.mock.calls[1][1] as DecisionInput;
  await act(async () => { exact.resolve({...oldCertificate, key: latest.key, rangeRevision: latest.rangeRevision}); });
  expect(container.querySelector(".recommendation")).not.toBeNull();
});

it.each([
  { fresh: false },
  { enabled: false },
  { value: { ...snapshot, heroTurn: false } },
  { value: { ...snapshot, valid: false, issues: ["Ogiltig avläsning."] } },
])("hides advice immediately when the request becomes unusable: %j", async (props) => {
  await act(async () => { root.render(createElement(Probe)); });
  const result = answer("verified-gto");
  await act(async () => { exact.resolve(result); });
  expect(container.querySelector(".recommendation")).not.toBeNull();
  await act(async () => { root.render(createElement(Probe, props)); });
  expect(container.querySelector(".recommendation")).toBeNull();
});

it("does not revive advice when a solve completes after freshness is lost", async () => {
  await act(async () => { root.render(createElement(Probe)); });
  const result = answer("verified-gto");
  await act(async () => { root.render(createElement(Probe, {fresh: false})); });
  await act(async () => { exact.resolve(result); });
  expect(container.querySelector(".recommendation")).toBeNull();
  expect(container.textContent).toContain("Inväntar färsk avläsning.");
});

it("retains a confirmed free check with uncertain participation and hides it when the turn ends", async () => {
  const s={...snapshot,street:"flop",board:["2h","8h","Qd"],heroCards:["Ah","Jd"],
    availableActions:["Fold","Check","Satsa"],maxSeats:6,
    players:[...snapshot.players,{...snapshot.players[1],seat:5,inHand:false}]};
  await act(async()=>{root.render(createElement(Probe,{value:s}));});
  expect(container.textContent).toContain("Försiktigt träningsval · Check");
  expect(container.textContent).toContain("säte 5");
  expect(container.querySelector(".recommendation")).toBeNull();
  await act(async()=>{root.render(createElement(Probe,{value:{...s,players:s.players.map(
    (p,i)=>i===1?{...p,bet:.04}:p),availableActions:["Fold","Syna","Höj"]}}));});
  expect(container.textContent).not.toContain("träningsval · Check");
  expect(container.textContent).toContain("syna 0,04 EUR");
  await act(async()=>{root.render(createElement(Probe,{value:s,fresh:false}));});
  expect(container.querySelector(".decision-choices")).toBeNull();
  await act(async()=>{root.render(createElement(Probe,{value:{...s,heroTurn:false}}));});
  expect(container.querySelector(".decision-choices")).toBeNull();
});

it.each([[9900,true],[10000,false],[10001,false]] as const)("checks arrival against the ten-second receipt deadline at %i ms",async(elapsed,accepted)=>{
  const start=Date.now();
  vi.useFakeTimers();
  try {
    vi.setSystemTime(start+6500);
    await act(async()=>{root.render(createElement(Probe,{receivedAt:start}));});
    const result=answer("verified-gto");
    await act(async()=>{await vi.advanceTimersByTimeAsync(elapsed-6500);exact.resolve(result);});
    expect(!!container.querySelector(".recommendation")).toBe(accepted);
    if(!accepted)expect(container.textContent).toContain("10 sekunder");
    if(accepted){
      await act(async()=>{await vi.advanceTimersByTimeAsync(200);});
      expect(container.querySelector(".recommendation")).not.toBeNull();
    }
  }finally{vi.useRealTimers();}
});
