import { expect, it, vi } from "vitest";
import { DecisionEngine, FreePostflopProvider, type DecisionProvider } from "../src/decision/providers";
import { prepareDecision } from "../src/decision/adapter";
import type { LiveSnapshot } from "../src/live/types";
import type { DecisionResult } from "../src/decision/types";
import {monkerSnapshot} from './helpers/monker';
it('allows only a checked source flop result and never labels it verified GTO',async()=>{
 const s=monkerSnapshot();s.street='flop';s.board=['Jh','Qh','Kh'];s.heroCards=['9s','9h'];
 const i=prepareDecision(s),p=provider('holdem-free'),r=answer();
 p.info={...p.info,allowUnverified:true,streets:['flop']};
 Object.assign(r,{key:i.key,provider:'holdem-solver-0.93',quality:'solver-unverified',exploitabilityPct:null,modelVerified:true,rootVisits:40,sourceProof:{solver:'holdem-0.93',solveId:'source-job',handIndex:1095,history:'entry_flop',visits:40,entryExact:true}});p.solve=async()=>r;
 expect(await new DecisionEngine([p]).compute(s,i)).toMatchObject({status:'ready',result:{exploitabilityPct:null}});
 r.sourceProof!.visits=0;expect(await new DecisionEngine([p]).compute(s,i)).toMatchObject({status:'rejected'});
});
it('accepts explicitly marked source-Monker decisions without falsely making them verified GTO',async()=>{
 const s=monkerSnapshot(),i=prepareDecision(s),p=provider('monker-free'),r=answer();
 p.info={...p.info,maxExploitabilityPct:2.1,allowUnverified:true};
 Object.assign(r,{key:i.key,provider:'monker-free-10114',quality:'solver-unverified',exploitabilityPct:null,modelVerified:true,qualityMetric:'max-unilateral',qualityLimitPct:2.1});p.solve=async()=>r;
 expect(await new DecisionEngine([p]).compute(s,i)).toMatchObject({status:'ready',result:{quality:'solver-unverified',exploitabilityPct:null}});
 r.provider='outcome-sampling-test';expect(await new DecisionEngine([p]).compute(s,i)).toMatchObject({status:'rejected'});r.provider='monker-free-10114';
 r.modelVerified=false;expect(await new DecisionEngine([p]).compute(s,i)).toMatchObject({status:'rejected'});
});
it('keeps the selected Monker bound at 2.1 percent and blocks known failures',async()=>{
 const s=monkerSnapshot(),i=prepareDecision(s),p=provider('monker-free'),r=answer();p.info={...p.info,maxExploitabilityPct:2.1};
 Object.assign(r,{key:i.key,provider:'monker-free-10114',modelVerified:true,qualityMetric:'max-unilateral',exploitabilityPct:2.099,qualityLimitPct:2.1});p.solve=async()=>r;
 expect(await new DecisionEngine([p]).compute(s,i)).toMatchObject({status:'ready'});
 r.exploitabilityPct=2.101;expect(await new DecisionEngine([p]).compute(s,i)).toMatchObject({status:'rejected'});
});
const snapshot: LiveSnapshot = {
  version: 1, source: "svenskaspel-dom", readerId: "provider-test", sequence: 1,
  handId: "1", capturedAt: Date.now(), currency: "EUR", maxSeats: 6,
  players: [
    { seat: 1, hero: true, position: "BB", stack: 20, bet: 0, folded: false, inHand: true },
    { seat: 2, hero: false, position: "BTN / SB", stack: 20, bet: 0, folded: false, inHand: true },
  ],
  heroCards: ["Kh", "Kd"], board: ["Ks", "7d", "2c", "8h"], pot: 10,
  street: "turn", dealerSeat: 2, heroTurn: true, availableActions: ["Check", "Bet"],
  valid: true, issues: [], observedActions: [],
};
const input = prepareDecision(snapshot);
function answer(): DecisionResult {
  return {
    key: input.key, rangeRevision: input.rangeRevision, quality: "verified-gto",
    provider: "test-fixture", actions: [{ kind: "check", id: "check:0", to: 0, cost: 0,
      allIn: false, frequency: 1, ev: 0 }], recommended: 0, iterations: 1,
    rootVisits: 0, elapsedMs: 1, cutoffCount: 0, assumptions: [], limitations: [], exploitabilityPct: 0.1,
  };
}
function provider(id: string, cost: "free" | "paid" = "free"): DecisionProvider {
  return {
    info: {id, cost, name: id, coverage: "test fixture only"},
    unsupportedReason: () => null, solve: vi.fn(async () => answer()), cancel: vi.fn(),
  };
}
it("skips unsupported free engines and selects the next matching free engine", async () => {
  const first = provider("first"), second = provider("second");
  first.unsupportedReason = () => "Ingen täckning.";
  const outcome = await new DecisionEngine([first, second]).compute(snapshot, input);
  expect(outcome.status).toBe("ready");
  expect("provider" in outcome && outcome.provider?.id).toBe("second");
  expect(first.solve).not.toHaveBeenCalled();
});
it("does not start a paid solve without opt-in, even when no free engine matches", async () => {
  const paid = provider("paid", "paid");
  const outcome = await new DecisionEngine([paid]).compute(snapshot, input);
  expect(outcome.status).toBe("unsupported");
  expect(paid.solve).not.toHaveBeenCalled();
});
it("prefers free engines even when a paid provider is opted in and listed first", async () => {
  const paid = provider("paid", "paid"), free = provider("free");
  const outcome = await new DecisionEngine([paid, free], true).compute(snapshot, input);
  expect("provider" in outcome && outcome.provider?.id).toBe("free");
  expect(paid.solve).not.toHaveBeenCalled();
});
it("uses an opted-in paid adapter for a gap without changing the UI contract", async () => {
  const free = provider("free"), paid = provider("paid", "paid");
  free.unsupportedReason = () => "Ingen täckning.";
  const outcome = await new DecisionEngine([free, paid], true).compute(snapshot, input);
  expect(outcome).toMatchObject({status: "ready", provider: {id: "paid"}, result: {key: input.key}});
});
it.each([
  ["wrong hand", (r: DecisionResult) => {r.key = "other";}],
  ["old ranges", (r: DecisionResult) => {r.rangeRevision++;}],
  ["approximation", (r: DecisionResult) => {r.quality = "approximation";}],
  ["NaN quality", (r: DecisionResult) => {r.exploitabilityPct = NaN;}],
  ["unconverged", (r: DecisionResult) => {r.exploitabilityPct = 0.21;}],
  ["negative quality", (r: DecisionResult) => {r.exploitabilityPct = -1;}],
  ["bad probability", (r: DecisionResult) => {r.actions[0].frequency = 0.7;}],
  ["NaN EV", (r: DecisionResult) => {r.actions[0].ev = NaN;}],
  ["illegal call", (r: DecisionResult) => {r.actions[0].kind = "call";}],
  ["false all-in", (r: DecisionResult) => {r.actions[0].allIn = true;}],
  ["bad recommendation", (r: DecisionResult) => {r.recommended = 9;}],
] as const)("rejects %s at the provider boundary", async (_, change) => {
  const p = provider("invalid"), result = answer();
  change(result);
  p.solve = async () => result;
  expect(await new DecisionEngine([p]).compute(snapshot, input)).toMatchObject({status: "rejected"});
});
it("does not launch a fallback or deliver an answer after cancellation", async () => {
  const p = provider("slow"), fallback = provider("fallback");
  let resolve!: (value: DecisionResult | null) => void;
  p.solve = () => new Promise((done) => {resolve = done;});
  const engine = new DecisionEngine([p, fallback]);
  const pending = engine.compute(snapshot, input);
  engine.cancel();
  resolve(null);
  expect(await pending).toEqual({status: "cancelled"});
  expect(fallback.solve).not.toHaveBeenCalled();
});
it("exposes the original solver failure when no replacement succeeds", async () => {
  const p = provider("broken");
  p.solve = async () => {throw new Error("timeout");};
  expect(await new DecisionEngine([p]).compute(snapshot, input)).toMatchObject({status: "error", message: "timeout"});
});
it("uses active hands rather than table size and explains an unsupported raised line", () => {
  const p = new FreePostflopProvider();
  expect(p.unsupportedReason(snapshot, input)).toBeNull();
  const raised = {...snapshot, players: snapshot.players.map((player, i) => ({...player, bet: i + 1}))};
  expect(p.unsupportedReason(raised, prepareDecision(raised))).toContain("Båda spelarna har satsat");
});
it.each([3,4,5,6])("does not pretend to solve a %i-way pot with HU engines", (count) => {
  const multi = {...snapshot, players: Array.from({length: count}, (_, i) => ({...snapshot.players[1], seat: i + 1, hero: i === 0}))};
  expect(new FreePostflopProvider().unsupportedReason(multi, prepareDecision(multi))).toContain(`${count} aktiva spelare`);
});

it('accepts a known sit-out occupant without weakening the unknown-participation guard', () => {
  const p = new FreePostflopProvider();
  const s = {...snapshot, players:[...snapshot.players,{...snapshot.players[1],seat:3,inHand:false,sittingOut:true,bet:0}]};
  expect(p.unsupportedReason(s,prepareDecision(s))).toBeNull();
  s.players[2].sittingOut = false;
  expect(()=>prepareDecision(s)).toThrow('deltagande är oklart');
});

it('accepts the explicitly selected 2 percent NLHE limit and still rejects larger errors', async () => {
  const p = provider('live-nlhe');
  p.info = {...new FreePostflopProvider().info};
  p.solve = async () => ({...answer(), exploitabilityPct:1.92});
  expect(await new DecisionEngine([p]).compute(snapshot,input)).toMatchObject({status:'ready'});
  p.solve = async () => ({...answer(), exploitabilityPct:2.01});
  expect(await new DecisionEngine([p]).compute(snapshot,input)).toMatchObject({status:'rejected'});
});
