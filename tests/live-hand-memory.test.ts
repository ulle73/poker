import { expect, it } from "vitest";
import { LiveHandMemory } from "../src/live/hand-memory";
import type { LiveSnapshot } from "../src/live/types";
it("retains an observed fold after its action badge disappears and resets for the next hand", () => {
  const memory = new LiveHandMemory();
  const s = {
    handId: "1",
    street: "river",
    players: [
      { seat: 3, folded: true, inHand: false },
      { seat: 5, folded: false, inHand: true },
    ],
  } as LiveSnapshot;
  memory.apply(s);
  expect(
    memory.apply({
      ...s,
      players: s.players.map((p) => ({ ...p, folded: false })),
    }).players[0].folded,
  ).toBe(true);
  expect(
    memory.apply({
      ...s,
      handId: "2",
      players: s.players.map((p) => ({ ...p, folded: false, inHand: true })),
    }).players[0].folded,
  ).toBe(false);
});
