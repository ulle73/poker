import { expect, it } from "vitest";
import { seatPositions, postflopOrder } from "../src/live/positions";
import { prepareLiveSolve } from "../src/live/analysis";
import type { LiveSnapshot } from "../src/live/types";
it("assigns positions around the dealer for every supported table size", () => {
  for (let n = 2; n <= 10; n++) {
    const seats = Array.from({ length: n }, (_, i) => i + 1),
      p = seatPositions(seats, n, n);
    expect(Object.keys(p)).toHaveLength(n);
    expect(p[n]).toBe(n === 2 ? "BTN / SB" : "BTN");
    expect(p[1]).toBe(n === 2 ? "BB" : "SB");
    if (n > 2) expect(p[2]).toBe("BB");
    expect(Object.values(p).every((x) => x !== "Okänd")).toBe(true);
  }
});
it("respects empty seats and finds relative postflop position after other players fold", () => {
  expect(seatPositions([2, 4, 5, 6], 5, 6)).toEqual({
    2: "BB",
    4: "CO",
    5: "BTN",
    6: "SB",
  });
  const s = {
    maxSeats: 6,
    dealerSeat: 5,
    players: [
      { seat: 2, inHand: true, folded: false },
      { seat: 4, inHand: true, folded: false },
      { seat: 5, inHand: false, folded: true },
      { seat: 6, inHand: false, folded: false },
    ],
  } as LiveSnapshot;
  expect(postflopOrder(s).map((p) => p.seat)).toEqual([2, 4]);
});
it("solves a two-player pot at a larger occupied table without pretending a multiway pot is heads-up", () => {
  const s = {
    version: 1,
    source: "svenskaspel-dom",
    readerId: "r",
    sequence: 1,
    handId: "1",
    capturedAt: Date.now(),
    currency: "EUR",
    maxSeats: 6,
    dealerSeat: 5,
    heroTurn: true,
    availableActions: ["Fold", "Syna"],
    valid: true,
    issues: [],
    observedActions: [],
    street: "river",
    heroCards: ["Th", "Tc"],
    board: ["Ks", "7d", "2c", "8h", "3d"],
    pot: 20,
    players: [
      {
        seat: 2,
        hero: false,
        position: "BB",
        stack: 30,
        bet: 10,
        inHand: true,
        folded: false,
      },
      {
        seat: 4,
        hero: true,
        position: "CO",
        stack: 40,
        bet: 0,
        inHand: true,
        folded: false,
      },
      {
        seat: 5,
        hero: false,
        position: "BTN",
        stack: 50,
        bet: 0,
        inHand: false,
        folded: true,
      },
    ],
  } as LiveSnapshot;
  expect(prepareLiveSolve(s, "KK,A4s,A5s", "TT,JJ").hero).toBe(1);
  expect(prepareLiveSolve(s, "KK,A4s,A5s", "TT,JJ").line).toEqual(["bet:100"]);
  expect(()=>prepareLiveSolve({...s,players:s.players.map(p=>({...p,hero:p.seat===5}))},'KK','TT')).toThrow(/inte bekräftat aktiv/);
  expect(() =>
    prepareLiveSolve(
      {
        ...s,
        players: s.players.map((p) => (p.folded ? { ...p, bet: 5 } : p)),
      },
      "KK",
      "TT",
    ),
  ).toThrow(/multiway-linje/);
  expect(() =>
    prepareLiveSolve(
      {
        ...s,
        players: s.players.map((p) => ({ ...p, inHand: true, folded: false })),
      },
      "KK",
      "TT",
    ),
  ).toThrow(/3 aktiva/);
});
