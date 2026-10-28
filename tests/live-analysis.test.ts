import { expect, it } from "vitest";
import { prepareLiveSolve, liveKey } from "../src/live/analysis";
import type { LiveSnapshot } from "../src/live/types";
const snapshot: LiveSnapshot = {
  version: 1,
  source: "svenskaspel-dom",
  readerId: "r",
  sequence: 1,
  handId: "123",
  capturedAt: Date.now(),
  currency: "EUR",
  maxSeats: 6,
  players: [
    {
      seat: 4,
      hero: true,
      position: "BB",
      stack: 3.8,
      bet: 0,
      folded: false,
      inHand: true,
    },
    {
      seat: 6,
      hero: false,
      position: "BTN / SB",
      stack: 1,
      bet: 0.1,
      folded: false,
      inHand: true,
    },
  ],
  heroCards: ["Qh", "2h"],
  board: ["Ks", "7d", "2c", "8h", "3d"],
  pot: 0.3,
  street: "river",
  dealerSeat: 6,
  heroTurn: true,
  availableActions: ["Fold", "Syna"],
  valid: true,
  issues: [],
  observedActions: [],
};
it("maps observed money to an explicit range-vs-range river tree without assuming blinds", () => {
  const p = prepareLiveSolve(snapshot, "QQ,Q2s", "TT,JJ");
  expect(p.config.pot).toBeCloseTo(0.2);
  expect(p.config.stack).toBe(1.1);
  expect(p.hero).toBe(0);
  expect(p.line[0]).toBe("check");
  expect(Number(p.line[1].split(":")[1])).toBeCloseTo(50);
});
it("does not substitute training advice for other streets, missing ranges or unverified raises", () => {
  expect(() =>
    prepareLiveSolve(
      { ...snapshot, street: "flop", board: snapshot.board.slice(0, 3) },
      "QQ",
      "TT",
    ),
  ).toThrow(/river/i);
  expect(() => prepareLiveSolve(snapshot, "", "")).toThrow(/ranger/i);
  expect(() =>
    prepareLiveSolve(
      {
        ...snapshot,
        players: snapshot.players.map((p) => ({ ...p, bet: 0.1 })),
      },
      "QQ",
      "TT",
    ),
  ).toThrow(/fulla/i);
});
it("invalidates a prior solve when a new capture rejects otherwise identical values", () => {
  expect(
    liveKey({
      ...snapshot,
      valid: false,
      issues: ["Valutan skiljer sig mellan fält."],
    }),
  ).not.toBe(liveKey(snapshot));
});
it("maps a shove at the effective stack to the actual all-in node", () => {
  const s = {
    ...snapshot,
    pot: 20,
    players: snapshot.players.map((p) => ({
      ...p,
      stack: p.hero ? 10 : 0,
      bet: p.hero ? 0 : 10,
    })),
  };
  expect(prepareLiveSolve(s, "QQ", "TT").line).toEqual(["check", "allin"]);
});
