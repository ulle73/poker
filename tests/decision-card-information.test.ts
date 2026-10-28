import { expect, it } from "vitest";
import { cardCode } from "phe";
import {
  createCardInformation,
  cardInformationKey,
  rootCardOrbit,
} from "../src/decision/card-information";
import { informationSetKey } from "../src/decision/mccfr";
import type { BettingState } from "../src/decision/types";
const cards = (names: string[]) =>
  names.map((name) => cardCode(name[0], name[1]));
it.each([
  { own: ["As", "Kh"], board: [], count: 12 },
  { own: ["As", "Ks"], board: [], count: 4 },
  { own: ["As", "Ah"], board: [], count: 6 },
  { own: ["Ah", "Kh"], board: ["Qs", "7s", "2s"], count: 3 },
  { own: ["Ah", "Kd"], board: ["Qs", "7s", "2s"], count: 6 },
  { own: ["As", "Kh"], board: ["Qs", "7h", "2d"], count: 1 },
  { own: ["As", "Kh"], board: ["Qs", "Qh", "2d"], count: 2 },
  { own: ["As", "Kh"], board: ["Qs", "Qh", "2d", "7s"], count: 1 },
])(
  "limits the sampled root orbit to symmetries of the fixed public board ($count hands)",
  ({ own, board, count }) => {
    const orbit = rootCardOrbit(
      cards(own),
      cards(board),
      createCardInformation(["", ""]),
    );
    expect(orbit).toHaveLength(count);
    expect(new Set(orbit.map((pair) => pair.join(","))).size).toBe(count);
    expect(
      orbit.every((pair) => pair.every((card) => !cards(board).includes(card))),
    ).toBe(true);
  },
);
it("groups the 1326 physical preflop combinations into the independently known 169 hand classes", () => {
  const information = createCardInformation(["", ""]),
    counts = new Map<number, number>();
  for (let a = 0; a < 52; a++)
    for (let b = a + 1; b < 52; b++) {
      const key = cardInformationKey([a, b], [], information);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  expect(counts.size).toBe(169);
  expect([...counts.values()].filter((n) => n === 6)).toHaveLength(13);
  expect([...counts.values()].filter((n) => n === 4)).toHaveLength(78);
  expect([...counts.values()].filter((n) => n === 12)).toHaveLength(78);
});
it("merges a simultaneous suit relabeling of own cards and the visible board", () => {
  const information = createCardInformation(["", ""]);
  expect(
    cardInformationKey(
      cards(["As", "Kh"]),
      cards(["Qs", "7s", "2d"]),
      information,
    ),
  ).toBe(
    cardInformationKey(
      cards(["Ah", "Kc"]),
      cards(["Qh", "7h", "2d"]),
      information,
    ),
  );
});
it("keeps a flush draw distinct from a hand whose suits do not match the same board", () => {
  const information = createCardInformation(["", ""]),
    board = cards(["Qs", "7s", "2d"]);
  expect(cardInformationKey(cards(["As", "Ks"]), board, information)).not.toBe(
    cardInformationKey(cards(["Ah", "Kh"]), board, information),
  );
});
it("retains suit-specific blockers when a weighted opponent prior breaks that symmetry", () => {
  const information = createCardInformation([
    "",
    "AsKs:0.8,AhKh:0.2,AdKd:0.2,AcKc:0.2",
  ]);
  expect(cardInformationKey(cards(["As", "Qh"]), [], information)).not.toBe(
    cardInformationKey(cards(["Ac", "Qh"]), [], information),
  );
  expect(information.permutations).toHaveLength(6);
});
it("intersects restrictions across all players instead of only the actor range", () => {
  const information = createCardInformation(["", "AsKs", "AhQh"]);
  expect(information.permutations).toHaveLength(2);
});
it("preserves support and symmetry when positive range weights are scaled down", () => {
  const ordinary = createCardInformation(["AsKs", ""]);
  const tiny = createCardInformation(["AsKs:0.0000000000001", ""]);
  expect(tiny.permutations).toEqual(ordinary.permutations);
  expect(tiny.permutations).toHaveLength(6);
  expect(rootCardOrbit(cards(["As", "Ks"]), [], tiny)).toHaveLength(1);
});
it("treats flop order as irrelevant and preserves the order of turn and river reveals", () => {
  const information = createCardInformation(["", ""]),
    own = cards(["As", "Kh"]);
  expect(cardInformationKey(own, cards(["2s", "7d", "Jc"]), information)).toBe(
    cardInformationKey(own, cards(["Jc", "2s", "7d"]), information),
  );
  expect(
    cardInformationKey(own, cards(["2s", "7d", "Jc", "Qh", "3h"]), information),
  ).not.toBe(
    cardInformationKey(own, cards(["2s", "7d", "Jc", "3h", "Qh"]), information),
  );
});
it("does not leak an unrevealed suffix while using card isomorphism", () => {
  const state: BettingState = {
    street: "flop",
    stacks: [10, 10],
    bets: [0, 0],
    invested: [5, 5],
    folded: [false, false],
    pending: [true, true],
    canRaise: [true, true],
    actor: 0,
    dealer: 1,
    currentBet: 0,
    lastFullRaise: 2,
    minBet: 2,
    deadPot: 0,
    raises: 0,
    history: "",
    boardCount: 3,
    terminal: false,
  };
  const information = createCardInformation(["", ""]),
    own = cards(["As", "Kh"]);
  const first = informationSetKey(
    "root",
    state,
    own,
    cards(["2s", "7d", "Jc", "Qh", "3h"]),
    information,
  );
  const second = informationSetKey(
    "root",
    state,
    own,
    cards(["2s", "7d", "Jc", "9h", "4h"]),
    information,
  );
  expect(first).toBe(second);
  expect(
    informationSetKey(
      "root",
      { ...state, street: "turn", boardCount: 4 },
      own,
      cards(["2s", "7d", "Jc", "Qh", "3h"]),
      information,
    ),
  ).not.toBe(
    informationSetKey(
      "root",
      { ...state, street: "turn", boardCount: 4 },
      own,
      cards(["2s", "7d", "Jc", "9h", "4h"]),
      information,
    ),
  );
});
it("bounds memoized physical views without changing canonical results after the cache fills", () => {
  const limited = createCardInformation(["", ""], 2),
    cold = createCardInformation(["", ""], 0);
  for (const names of [
    ["As", "Kh"],
    ["Ah", "Ks"],
    ["2s", "3d"],
    ["Ac", "Ad"],
  ]) {
    const own = cards(names);
    expect(cardInformationKey(own, [], limited)).toBe(
      cardInformationKey(own, [], cold),
    );
  }
  expect(limited.cache?.size).toBe(2);
  expect(cold.cache?.size).toBe(0);
});
