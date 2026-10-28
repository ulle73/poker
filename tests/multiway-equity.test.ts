import { afterEach, describe, expect, it, vi } from "vitest";
import { cardCode, evaluateCardCodes } from "phe";
import {
  calculateEquity,
  createSeededRandom,
  shufflePrefix,
  type EquityConfig,
} from "../src/multiway/equity";
// @ts-expect-error The independent existing JavaScript oracle has no declaration.
import { evaluate7 } from "../scripts/river-oracle.mjs";

const base: EquityConfig = {
  hero: ["As", "Ah"],
  board: [],
  playerCount: 2,
  samples: 1000,
  seed: 19,
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("local multiway showdown equity", () => {
  it.each([2, 3, 4, 5, 6, 7, 8, 9, 10])(
    "splits a royal board equally between %i players",
    (playerCount) => {
      const result = calculateEquity({
        ...base,
        playerCount,
        hero: ["2c", "3d"],
        board: ["As", "Ks", "Qs", "Js", "Ts"],
      });
      expect(result.equity).toBeCloseTo(1 / playerCount, 14);
      expect(result.winFraction).toBe(0);
      expect(result.tieFraction).toBe(1);
      expect(result.standardError).toBe(0);
      expect(result.confidence95HalfWidth).toBe(0);
      expect(result.playerCount).toBe(playerCount);
      expect(result.method).toBe("monte-carlo");
      expect(result.opponentsModel).toBe("uniform");
    },
  );

  it.each([
    { hero: ["As", "Ah"], board: ["Ad", "Ac", "Kd", "7s", "2c"] },
    { hero: ["Ah", "Kh"], board: ["Qh", "Jh", "Th", "2s", "3d"] },
  ])(
    "awards unbeatable quads / royal flush the whole pot",
    ({ hero, board }) => {
      const result = calculateEquity({ ...base, hero, board, playerCount: 10 });
      expect(result.equity).toBe(1);
      expect(result.winFraction).toBe(1);
      expect(result.tieFraction).toBe(0);
    },
  );

  it("counts a split between only the winners, excluding losing seats", () => {
    const result = calculateEquity({
      ...base,
      hero: ["As", "Ks"],
      board: ["Qc", "Jh", "Td", "2c", "3d"],
      playerCount: 3,
      knownOpponents: [
        ["Ah", "Kh"],
        ["2h", "2d"],
      ],
    });
    expect(result.equity).toBe(0.5);
    expect(result.tieFraction).toBe(1);
    expect(result.winFraction).toBe(0);
    expect(result.standardError).toBe(0);
  });

  it("scores a known losing hand correctly", () => {
    const result = calculateEquity({
      ...base,
      hero: ["2c", "3c"],
      board: ["As", "Ah", "Ad", "Kc", "Qd"],
      knownOpponents: [["Ac", "2s"]],
    });
    expect(result.equity).toBe(0);
    expect(result.winFraction).toBe(0);
    expect(result.tieFraction).toBe(0);
  });

  it.each(
    [
      [],
      ["2c", "7d", "Jh"],
      ["2c", "7d", "Jh", "Ks"],
      ["2c", "7d", "Jh", "Ks", "9s"],
    ].map((board) => ({ board })),
  )("supports each street and deterministic seeds: $board", ({ board }) => {
    const first = calculateEquity({ ...base, board });
    const second = calculateEquity({ ...base, board });
    expect(first.equity).toBe(second.equity);
    expect(first.winFraction).toBe(second.winFraction);
    expect(first.standardError).toBe(second.standardError);
    expect(first.samples).toBe(1000);
    expect(first.timedOut).toBe(false);
  });

  it("estimates pocket aces against uniform legal opponents", () => {
    const result = calculateEquity({
      ...base,
      samples: 20000,
      maxTimeMs: 5000,
    });
    expect(result.samples).toBe(20000);
    expect(result.equity).toBeGreaterThan(0.835);
    expect(result.equity).toBeLessThan(0.87);
    expect(result.standardError).toBeGreaterThan(0);
    expect(result.confidence95HalfWidth).toBeCloseTo(
      1.96 * result.standardError,
      14,
    );
  });

  it("computes sampling variance from fractional pot shares", () => {
    const result = calculateEquity({
      ...base,
      hero: ["As", "Ks"],
      board: ["Qc", "Jh", "Td", "2c", "3d"],
      samples: 20000,
    });
    const p = result.tieFraction;
    expect(p).toBeGreaterThan(0);
    expect(result.equity).toBeCloseTo(1 - p / 2, 12);
    expect(result.standardError).toBeCloseTo(
      Math.sqrt((p * (1 - p)) / 4 / (result.samples - 1)),
      12,
    );
  });

  it("never duplicates a draw or a blocked card, including 10-player preflop deals", () => {
    const random = createSeededRandom(42);
    const blocked = new Set([48, 49, 50, 51]);
    const deck = Array.from({ length: 52 }, (_, i) => i).filter(
      (i) => !blocked.has(i),
    );
    for (let i = 0; i < 1000; i++) {
      shufflePrefix(deck, 23, random);
      const draw = deck.slice(0, 23);
      expect(new Set(draw).size).toBe(23);
      expect(draw.some((card) => blocked.has(card))).toBe(false);
      expect(new Set(deck).size).toBe(48);
    }
  });

  it("matches the independent 5-of-7 oracle on edge cases and random comparisons", () => {
    const hands = [
      "As 2s 3s 4s 5s Kd Qc", // wheel straight flush
      "As Ah Ad Ks Kh Kd 2c", // two triples make a full house
      "As Ah Ad Ac Ks Kh Qh", // quads with best kicker
      "As Ks Qs Js Ts 2c 3d", // royal flush
      "As 2h 3d 4c 5s Kh Qd", // wheel straight
      "As Ah Ks Kh Qs Qh 2c", // three pairs
      "As Js 9s 7s 4s 3s 2d", // six-card flush
    ].map((cards) => cards.split(" "));
    const deck = Array.from({ length: 52 }, (_, i) => i);
    const random = createSeededRandom(727);
    const ranks = "23456789TJQKA",
      suits = "shdc";
    for (let i = 0; i < 100; i++) {
      shufflePrefix(deck, 7, random);
      hands.push(deck.slice(0, 7).map((c) => ranks[c >> 2] + suits[c & 3]));
    }
    const fast = hands.map((cards) =>
      evaluateCardCodes(cards.map((c) => cardCode(c[0], c[1]))),
    );
    const oracle = hands.map((cards) => evaluate7(cards));
    for (let a = 0; a < hands.length; a++)
      for (let b = a + 1; b < hands.length; b++)
        expect(Math.sign(fast[a] - fast[b])).toBe(
          -Math.sign(oracle[a] - oracle[b]) || 0,
        );
  });

  it.each([
    { hero: ["As", "As"] },
    { board: ["As", "2h", "3d"] },
    { knownOpponents: [["Ah", "2d"]] },
    { knownOpponents: [["2d", "2d"]] },
    { hero: ["Xx", "2h"] },
    { hero: ["As"] },
    { board: ["2h"] },
    { board: ["2h", "3d"] },
    { playerCount: 1 },
    { playerCount: 11 },
    { playerCount: 2.5 },
    { knownOpponents: [["2c"]] },
    { knownOpponents: [null, null] },
    { samples: NaN },
    { samples: 0 },
    { seed: -1 },
    { maxTimeMs: Infinity },
  ])("rejects invalid input: %j", (override) => {
    expect(() => calculateEquity({ ...base, ...override })).toThrow();
  });

  it("bounds sample requests and reports an early timeout honestly", () => {
    expect(calculateEquity({ ...base, samples: 2 }).samples).toBe(1000);
    let time = 0;
    vi.spyOn(Date, "now").mockImplementation(() => time++ * 100);
    const result = calculateEquity({ ...base, samples: 999999, maxTimeMs: 50 });
    expect(result.requestedSamples).toBe(50000);
    expect(result.samples).toBe(128);
    expect(result.timedOut).toBe(true);
    expect(Number.isFinite(result.standardError)).toBe(true);
  });

  it("returns correlated worker results and validation errors", async () => {
    const postMessage = vi.fn();
    const worker = {
      postMessage,
      onmessage: null as null | ((event: { data: unknown }) => void),
    };
    vi.stubGlobal("self", worker);
    await import("../src/multiway/equity-worker");
    worker.onmessage!({ data: { id: 17, config: base } });
    expect(postMessage.mock.calls[0][0]).toMatchObject({
      id: 17,
      result: { samples: 1000, playerCount: 2 },
    });
    worker.onmessage!({
      data: { id: 18, config: { ...base, playerCount: 11 } },
    });
    expect(postMessage.mock.calls[1][0]).toMatchObject({
      id: 18,
      error: expect.any(String),
    });
  });
});
