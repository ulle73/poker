import { expect, it } from "vitest";
import { prepareDecision, decisionKey } from "../src/decision/adapter";
import { DecisionContext } from "../src/decision/context";
import type { LiveSnapshot } from "../src/live/types";
import { applyAction, legalActions } from "../src/decision/betting";
function snapshot(n = 3, street = "preflop"): LiveSnapshot {
  return {
    version: 1,
    source: "svenskaspel-dom",
    readerId: "r",
    sequence: 1,
    handId: "1",
    capturedAt: Date.now(),
    currency: "EUR",
    maxSeats: Math.max(6, n),
    players: Array.from({ length: n }, (_, i) => ({
      seat: i + 1,
      hero: i === 0,
      position: i === 0 ? "SB" : i === 1 ? "BB" : i === n - 1 ? "BTN" : "UTG",
      stack: 2,
      bet: street === "preflop" ? (i === 0 ? 0.01 : i === 1 ? 0.02 : 0) : 0,
      inHand: true,
      folded: false,
    })),
    heroCards: ["As", "Kh"],
    board:
      street === "preflop"
        ? []
        : ["2s", "7h", "Jd", "Qc", "3c"].slice(
            0,
            street === "flop" ? 3 : street === "turn" ? 4 : 5,
          ),
    street: street as LiveSnapshot["street"],
    pot: street === "preflop" ? 0.03 : 0.2,
    dealerSeat: n,
    heroTurn: true,
    availableActions:
      street === "preflop"
        ? ["Fold", "Syna", "Höj Till"]
        : ["Fold", "Check", "Bet"],
    valid: true,
    issues: [],
    observedActions: [],
  };
}
it("adapts every street/count automatically with full-range defaults and legal chip units", () => {
  for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10])
    for (const street of ["preflop", "flop", "turn", "river"]) {
      const s = snapshot(n, street),
        d = prepareDecision(s);
      expect(d.seats).toHaveLength(n);
      expect(d.state.actor).toBe(d.hero);
      expect(d.ranges.every((x) => x === "")).toBe(true);
      expect(
        d.state.deadPot + d.state.invested.reduce((a, b) => a + b, 0),
      ).toBe(Math.round(s.pot! / 0.01));
    }
});
it("keeps a free BB option and closes already checked earlier postflop seats", () => {
  const s = snapshot();
  s.players[0].hero = false;
  s.players[1].hero = true;
  s.players[0].bet = 0.02;
  s.players[2].bet = 0.02;
  s.pot = 0.06;
  s.availableActions = ["Fold", "Check", "Höj Till"];
  expect(prepareDecision(s).state.pending[1]).toBe(true);
  const f = snapshot(3, "flop");
  f.players[0].hero = false;
  f.players[1].hero = true;
  const d = prepareDecision(f);
  expect(d.state.pending).toEqual([false, true, true]);
});
it("invalidates decision identity for actions/hand/cards/stack/range revision", () => {
  const s = snapshot();
  for (const changed of [
    { ...s, heroTurn: false },
    { ...s, handId: "2" },
    { ...s, heroCards: ["Ah", "Kd"] },
    { ...s, players: s.players.map((p) => ({ ...p, stack: 1 })) },
  ])
    expect(decisionKey(changed)).not.toBe(decisionKey(s));
  expect(decisionKey(s, 2)).not.toBe(decisionKey(s, 1));
});
it("infers witnessed blinds and raises, resets hand and does not require manual ranges", () => {
  const c = new DecisionContext(),
    s = snapshot();
  c.observe(s);
  expect(c.facts().minBet).toBe(2);
  c.observe({
    ...s,
    sequence: 2,
    pot: 0.08,
    players: s.players.map((p) => (p.seat === 3 ? { ...p, bet: 0.05 } : p)),
  });
  expect(c.facts().lastFullRaise).toBe(3);
  c.setRange(2, "QQ+");
  expect(c.facts().ranges?.[2]).toBe("QQ+");
  c.observe({ ...s, handId: "2" });
  expect(c.facts().ranges).toEqual({});
});
it("rejects inconsistent monetary observations rather than fabricate a pot", () => {
  expect(() => prepareDecision({ ...snapshot(), pot: 0.01 })).toThrow(
    /överstiger/,
  );
  expect(() => prepareDecision({ ...snapshot(), heroTurn: false })).toThrow(
    /Inväntar/,
  );
});
it("does not mistake a raised BB contribution for a blind or give the raiser another option", () => {
  const s = snapshot();
  s.players[0].bet = 0.02;
  s.players[1].bet = 0.06;
  s.players[2].bet = 0.02;
  s.pot = 0.1;
  const c = new DecisionContext();
  const d = c.prepare(s);
  expect(c.facts().minBet).toBeUndefined();
  expect(d.state.pending).toEqual([true, false, true]);
  let state = applyAction(
    d.state,
    legalActions(d.state, d.rules).find((a) => a.kind === "call")!,
    d.rules,
  );
  state = applyAction(
    state,
    legalActions(state, d.rules).find((a) => a.kind === "call")!,
    d.rules,
  );
  expect(state.street).toBe("flop");
});
it("rejects an ambiguously occupied seat instead of silently reducing player count", () => {
  const s = snapshot();
  s.players[2].inHand = false;
  expect(() => prepareDecision(s)).toThrow(/deltagande är oklart/);
});
it("invalidates advice for new observed checks and changed position/hero mapping", () => {
  const s = snapshot();
  expect(
    decisionKey({
      ...s,
      observedActions: [
        { seat: 2, street: "preflop", action: "check", amount: 0 },
      ],
    }),
  ).not.toBe(decisionKey(s));
  expect(
    decisionKey({
      ...s,
      players: s.players.map((p) => ({ ...p, position: "BTN" })),
    }),
  ).not.toBe(decisionKey(s));
});
