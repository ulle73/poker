import { describe, expect, it } from "vitest";
import { cardCode } from "phe";
import { createDealSampler, parseRange } from "../src/decision/sampler";
import type { DecisionInput } from "../src/decision/types";
const card = (text: string) => cardCode(text[0], text[1]);
const key = (cards: number[]) => [...cards].sort((a, b) => a - b).join(",");
function input(count = 2, board: string[] = []): DecisionInput {
  return {
    key: "test",
    hero: 0,
    seats: Array.from({ length: count }, (_, i) => i),
    heroCards: ["Ah", "Kh"],
    board,
    ranges: Array(count).fill(""),
    rangeRevision: 0,
    assumptions: [],
    chipUnit: 1,
    currency: "chips",
    rules: {
      betFractions: [1],
      raiseFractions: [1],
      maxRaises: 1,
      includeAllIn: true,
    },
    state: {
      street:
        board.length === 0
          ? "preflop"
          : board.length === 3
            ? "flop"
            : board.length === 4
              ? "turn"
              : "river",
      stacks: Array(count).fill(100),
      bets: Array(count).fill(0),
      invested: Array(count).fill(0),
      folded: Array(count).fill(false),
      pending: Array(count).fill(true),
      canRaise: Array(count).fill(true),
      actor: 0,
      dealer: 0,
      currentBet: 0,
      lastFullRaise: 1,
      minBet: 1,
      deadPot: 0,
      raises: 0,
      history: "",
      boardCount: board.length,
      terminal: false,
    },
  };
}
describe("decision range parser", () => {
  it.each([
    ["AA", 6],
    ["AKs", 4],
    ["AKo", 12],
    ["AK", 16],
    ["TT+", 30],
    ["A2s+", 48],
    ["ATo+", 48],
    ["AhKh", 1],
  ])("expands %s into %i unique combos", (text, count) => {
    const combos = parseRange(text);
    expect(combos).toHaveLength(count);
    expect(new Set(combos.map((c) => key(c.cards))).size).toBe(count);
  });
  it("uses only explicit blockers and preserves exact combo weights", () => {
    expect(parseRange("AhKh:0.25,AsKs:0.75", [card("Ah")])).toEqual([
      { cards: [card("Ks"), card("As")], weight: 0.75 },
    ]);
    expect(parseRange("")).toHaveLength(1326);
    expect(parseRange("", [card("Ah")])).toHaveLength(1275);
  });
  it("supports separators, dash ranges and deterministic last-entry overrides", () => {
    expect(parseRange("QQ-TT; A5s-A2s\nAhKh:0.2 AhKh:0")).toHaveLength(34);
    expect(parseRange("AhKh:0.7,AhKh:0.2")[0].weight).toBe(0.2);
  });
  it.each([
    "AhAh",
    "AA:1.1",
    "AA:-0.1",
    "AA:NaN",
    "AA:",
    "bad",
    "AAs",
    "AhKh+",
    "AA-KQs",
  ])("rejects malformed %s", (text) => {
    expect(() => parseRange(text)).toThrow();
  });
});
describe("decision joint deal sampling", () => {
  it("corrects importance for the entire oversampled root class instead of one physical hand", () => {
    const config = input(2, ["2s", "3h", "7d", "9c", "Jc"]);
    config.heroCards = ["As", "Ah"];
    config.ranges = ["AsAh:0.25,AcAd:0.25,KsKh:0.5", ""];
    const orbit = [["As", "Ah"].map(card), ["Ac", "Ad"].map(card)];
    const sample = Reflect.apply(createDealSampler, null, [
      config,
      123,
      orbit,
    ]) as ReturnType<typeof createDealSampler>;
    const classKeys = new Set(orbit.map(key));
    for (let i = 0; i < 40; i++) {
      const deal = sample();
      expect(deal.importance).toBeCloseTo(
        classKeys.has(key(deal.holes[0])) ? 2 / 3 : 2,
        12,
      );
    }
  });
  it("restores the product prior after whole-proposal rejection with a multi-hand root class", () => {
    const config = input();
    config.ranges = ["AhKh,QsQd,JsJd", "AhJh,2s3s"];
    const orbit = [["Ah", "Kh"].map(card), ["Qs", "Qd"].map(card)];
    const sample = Reflect.apply(createDealSampler, null, [
      config,
      431,
      orbit,
    ]) as ReturnType<typeof createDealSampler>;
    const weights = new Map<string, number>();
    let total = 0;
    for (let i = 0; i < 16000; i++) {
      const deal = sample(),
        k = key(deal.holes[0]);
      total += deal.importance;
      weights.set(k, (weights.get(k) ?? 0) + deal.importance);
    }
    expect(
      Math.abs(weights.get(key(["Ah", "Kh"].map(card)))! / total - 0.2),
    ).toBeLessThan(0.015);
    expect(
      Math.abs(weights.get(key(["Qs", "Qd"].map(card)))! / total - 0.4),
    ).toBeLessThan(0.015);
    expect(
      Math.abs(weights.get(key(["Js", "Jd"].map(card)))! / total - 0.4),
    ).toBeLessThan(0.015);
  });
  it("preserves weighted probabilities while oversampling both physical variants of a class", () => {
    const config = input(2, ["2s", "3h", "7d", "9c", "Jc"]);
    config.heroCards = ["As", "Ah"];
    config.ranges = ["AsAh:0.25,AcAd:0.25,KsKh:0.5", ""];
    const orbit = [["As", "Ah"].map(card), ["Ac", "Ad"].map(card)];
    const sample = Reflect.apply(createDealSampler, null, [
      config,
      644,
      orbit,
    ]) as ReturnType<typeof createDealSampler>;
    let total = 0,
      first = 0,
      second = 0,
      proposalClass = 0;
    for (let i = 0; i < 16000; i++) {
      const d = sample(),
        k = key(d.holes[0]);
      total += d.importance;
      if (k === key(orbit[0])) {
        first += d.importance;
        proposalClass++;
      }
      if (k === key(orbit[1])) {
        second += d.importance;
        proposalClass++;
      }
    }
    expect(Math.abs(first / total - 0.25)).toBeLessThan(0.015);
    expect(Math.abs(second / total - 0.25)).toBeLessThan(0.015);
    expect(Math.abs(proposalClass / 16000 - 0.75)).toBeLessThan(0.015);
  });
  it("deduplicates proposal hands instead of silently multiplying their mass", () => {
    const config = input(),
      own = config.heroCards.map(card);
    const ordinary = createDealSampler(config, 123),
      duplicated = Reflect.apply(createDealSampler, null, [
        config,
        123,
        [own, own],
      ]) as ReturnType<typeof createDealSampler>;
    for (let i = 0; i < 20; i++) expect(duplicated()).toEqual(ordinary());
  });
  it.each([
    { rootClass: [] },
    { rootClass: [["As", "Ks"].map(card)] },
    { rootClass: [["Ah", "Kh"].map(card), [52, 3]] },
    { rootClass: [["Ah", "Kh"].map(card), [2, 2]] },
  ])(
    "rejects an empty, unrelated or invalid root proposal class",
    ({ rootClass }) => {
      expect(() =>
        Reflect.apply(createDealSampler, null, [input(), 123, rootClass]),
      ).toThrow(/root class/i);
    },
  );
  it("rejects proposal hands outside the positive weighted prior", () => {
    const config = input();
    config.ranges = ["AhKh", ""];
    expect(() =>
      Reflect.apply(createDealSampler, null, [
        config,
        123,
        [config.heroCards.map(card), ["As", "Ks"].map(card)],
      ]),
    ).toThrow(/positive-weight prior/);
  });
  it.each([0, 3, 4, 5])(
    "keeps all cards unique on board length %i for 2-10 players",
    (boardCount) => {
      for (let count = 2; count <= 10; count++) {
        const board = ["2s", "3h", "4d", "5c", "6s"].slice(0, boardCount);
        const sample = createDealSampler(input(count, board), 34 + count);
        for (let i = 0; i < 30; i++) {
          const deal = sample();
          expect(deal.holes).toHaveLength(count);
          expect(deal.holes.every((h) => h.length === 2)).toBe(true);
          expect(deal.runout).toHaveLength(5);
          expect(deal.runout.slice(0, boardCount)).toEqual(board.map(card));
          const cards = [...deal.holes.flat(), ...deal.runout];
          expect(new Set(cards).size).toBe(2 * count + 5);
          expect(
            cards.every((c) => Number.isInteger(c) && c >= 0 && c < 52),
          ).toBe(true);
          expect(deal.importance).toBeGreaterThan(0);
          expect(Number.isFinite(deal.importance)).toBe(true);
        }
      }
    },
  );
  it("reproduces seeded deals without mutable result aliasing", () => {
    const first = createDealSampler(input(), 123),
      second = createDealSampler(input(), 123);
    for (let i = 0; i < 20; i++) expect(first()).toEqual(second());
    const saved = first(),
      snapshot = JSON.stringify(saved);
    first();
    expect(JSON.stringify(saved)).toBe(snapshot);
  });
  it("samples unseen hero hands and permits opponents to hold actual hero cards", () => {
    const config = input();
    config.ranges = ["AhKh,QsQd", "AhJh,2s3s"];
    const sample = createDealSampler(config, 400);
    let alternate = 0,
      opponentActual = 0,
      actual = 0;
    for (let i = 0; i < 3000; i++) {
      const deal = sample();
      if (key(deal.holes[0]) === key(config.heroCards.map(card))) {
        actual++;
        expect(deal.importance).toBeCloseTo(2 / 3);
      } else {
        alternate++;
        expect(deal.importance).toBe(2);
      }
      if (deal.holes[1].includes(card("Ah"))) opponentActual++;
    }
    // Full-proposal rejection yields actual:alternate = .75*.5 : .25*1 = 3:2.
    expect(actual / 3000).toBeCloseTo(0.6, 1);
    expect(alternate).toBeGreaterThan(0);
    expect(opponentActual).toBeGreaterThan(0);
  });
  it("corrects weighted hero oversampling and retains opponent prior weights", () => {
    const config = input();
    config.ranges = ["AhKh:0.25,QsQd:0.75", "2s3s:0.25,4s5s:0.75"];
    const sample = createDealSampler(config, 71);
    let heroActual = 0,
      opponentFirst = 0,
      importanceTotal = 0,
      weightedActual = 0;
    for (let i = 0; i < 12000; i++) {
      const deal = sample(),
        actual = key(deal.holes[0]) === key(config.heroCards.map(card));
      if (actual) {
        heroActual++;
        weightedActual += deal.importance;
        expect(deal.importance).toBeCloseTo(0.4);
      } else expect(deal.importance).toBe(2);
      if (deal.holes[1].includes(card("2s"))) opponentFirst++;
      importanceTotal += deal.importance;
    }
    expect(heroActual / 12000).toBeCloseTo(0.625, 1);
    expect(opponentFirst / 12000).toBeCloseTo(0.25, 1);
    expect(weightedActual / importanceTotal).toBeCloseTo(0.25, 1);
  });
  it("returns the uniform-prior proposal ratio in the fast path", () => {
    const config = input(10, ["2s", "3h", "4d"]);
    const sample = createDealSampler(config, 23),
      p = 1 / ((49 * 48) / 2);
    let actual = 0;
    for (let i = 0; i < 1000; i++) {
      const deal = sample();
      const isActual = key(deal.holes[0]) === key(config.heroCards.map(card));
      if (isActual) actual++;
      expect(deal.importance).toBeCloseTo(
        isActual ? p / (0.5 + 0.5 * p) : 2,
        13,
      );
    }
    expect(actual).toBeGreaterThan(400);
    expect(actual).toBeLessThan(600);
  });
  it("fails boundedly for incompatible overlapping priors", () => {
    const config = input();
    config.ranges = ["AhKh", "AhJh"];
    const started = performance.now();
    expect(() => createDealSampler(config, 1)()).toThrow(
      /compatible|collision|legal/i,
    );
    expect(performance.now() - started).toBeLessThan(500);
  });
  it("rejects excluded actual hero cards and fully board-blocked priors", () => {
    const config = input();
    config.ranges = ["AA", ""];
    expect(() => createDealSampler(config, 1)).toThrow(/hero|actual/i);
    const blocked = input(2, ["2s", "3h", "4d"]);
    blocked.ranges = ["", "2s3s"];
    expect(() => createDealSampler(blocked, 1)).toThrow(/range|blocked|legal/i);
  });
  it("validates known cards and table dimensions", () => {
    for (const board of [
      ["2s"],
      ["2s", "2s", "3h"],
      ["Ah", "2s", "3h"],
      ["xx", "2s", "3h"],
    ]) {
      expect(() => createDealSampler(input(2, board), 1)).toThrow();
    }
    for (const count of [1, 11])
      expect(() => createDealSampler(input(count), 1)).toThrow();
    const bad = input();
    bad.hero = 2;
    expect(() => createDealSampler(bad, 1)).toThrow();
    const short = input();
    short.ranges = [""];
    expect(() => createDealSampler(short, 1)).toThrow();
  });
});
