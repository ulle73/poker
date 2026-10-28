import { describe, expect, it } from "vitest";
import {
  applyAction,
  legalActions,
  validateBettingState,
} from "../src/decision/betting";
import { settlePayoffs } from "../src/decision/payoffs";
import type { BettingRules, BettingState } from "../src/decision/types";
const rules: BettingRules = {
  betFractions: [0.5, 1],
  raiseFractions: [0.5, 1],
  maxRaises: 3,
  includeAllIn: true,
};
function state(n = 2, patch: Partial<BettingState> = {}): BettingState {
  return {
    street: "preflop",
    stacks: Array(n).fill(100),
    bets: Array(n).fill(0),
    invested: Array(n).fill(0),
    folded: Array(n).fill(false),
    pending: Array(n).fill(true),
    canRaise: Array(n).fill(true),
    actor: 0,
    dealer: n - 1,
    currentBet: 0,
    lastFullRaise: 2,
    minBet: 2,
    deadPot: 10,
    raises: 0,
    history: "",
    boardCount: 0,
    terminal: false,
    ...patch,
  };
}
function act(s: BettingState, kind: string, to?: number) {
  const a = legalActions(s, rules).find(
    (a) => a.kind === kind && (to === undefined || a.to === to),
  );
  expect(a, `${kind} ${to} in ${JSON.stringify(s)}`).toBeDefined();
  return applyAction(s, a!, rules);
}
describe("integer NLHE betting state machine", () => {
  it.each(Array.from({ length: 9 }, (_, i) => i + 2))(
    "checks all streets with %i players and arbitrary dealer",
    (n) => {
      let s = state(n, { dealer: Math.floor(n / 2) });
      let actions = 0;
      while (!s.terminal) {
        const before = s;
        s = act(s, "check");
        actions++;
        expect(before.stacks.every((v) => v === 100)).toBe(true);
        if (actions === n) {
          expect(s.street).toBe("flop");
          expect(s.boardCount).toBe(3);
          expect(s.actor).toBe((s.dealer + 1) % n);
        }
      }
      expect(actions).toBe(n * 4);
      expect(s.boardCount).toBe(5);
    },
  );
  it("preserves the preflop big blind option", () => {
    let s = state(3, {
      stacks: [100, 99, 98],
      bets: [0, 1, 2],
      invested: [0, 1, 2],
      currentBet: 2,
    });
    s = act(s, "call");
    s = act(s, "call");
    expect(s.actor).toBe(2);
    expect(s.street).toBe("preflop");
    expect(legalActions(s, rules).map((a) => a.kind)).toContain("check");
    s = act(s, "check");
    expect(s.street).toBe("flop");
    expect(s.bets).toEqual([0, 0, 0]);
  });
  it("sizes a pot raise after adding the call and counts raises separately from bets", () => {
    let s = state(2, { deadPot: 10 });
    s = act(s, "bet", 10);
    expect(s.raises).toBe(0);
    expect(
      legalActions(s, rules).find((a) => a.kind === "raise" && a.to === 40),
    ).toBeDefined();
    s = act(s, "raise", 40);
    expect(s.raises).toBe(1);
    expect(s.lastFullRaise).toBe(30);
    expect(s.pending).toEqual([true, false]);
    expect(s.canRaise).toEqual([true, false]);
  });
  it("short all-in requires another call without reopening an actor who already acted", () => {
    let s = state(3, { stacks: [100, 100, 13] });
    s = act(s, "bet", 10);
    s = act(s, "call");
    s = act(s, "raise", 13);
    expect(s.lastFullRaise).toBe(10);
    expect(s.canRaise).toEqual([false, false, false]);
    expect(s.pending).toEqual([true, true, false]);
    expect(legalActions(s, rules).map((a) => a.kind)).toEqual(["fold", "call"]);
    s = act(s, "call");
    s = act(s, "call");
    expect(s.street).toBe("flop");
  });
  it("short all-in preserves raise rights for players who have not acted", () => {
    let s = state(3, { stacks: [100, 13, 100] });
    s = act(s, "bet", 10);
    s = act(s, "raise", 13);
    expect(s.actor).toBe(2);
    expect(s.canRaise[2]).toBe(true);
    const raise = legalActions(s, rules).find(
      (a) => a.kind === "raise" && a.to >= 23,
    )!;
    s = applyAction(s, raise, rules);
    expect(s.canRaise[0]).toBe(true);
  });
  it("cumulative short all-ins reopen only players now facing a full raise", () => {
    let s = state(4, { stacks: [100, 13, 20, 100] });
    s = act(s, "bet", 10);
    s = act(s, "raise", 13);
    s = act(s, "raise", 20);
    s = act(s, "call");
    expect(s.actor).toBe(0);
    expect(s.lastFullRaise).toBe(10);
    expect(legalActions(s, rules).some((a) => a.kind === "raise")).toBe(true);
  });
  it("a check does not gain raise rights against an opening all-in below the minimum", () => {
    let s = state(3, { stacks: [100, 1, 100] });
    s = act(s, "check");
    s = act(s, "bet", 1);
    s = act(s, "call");
    expect(s.actor).toBe(0);
    expect(legalActions(s, rules).map((a) => a.kind)).toEqual(["fold", "call"]);
  });
  it("caps calls and gives no raise against only all-in opponents", () => {
    let s = state(2, {
      stacks: [7, 0],
      bets: [0, 20],
      invested: [0, 20],
      currentBet: 20,
      pending: [true, false],
    });
    expect(legalActions(s, rules).map((a) => a.kind)).toEqual(["fold", "call"]);
    s = act(s, "call");
    expect(s.stacks).toEqual([0, 0]);
    expect(s.terminal).toBe(true);
    expect(s.boardCount).toBe(5);
  });
  it("disallows free folds, duplicate rounded sizes and raises over the cap", () => {
    const s = state(2);
    const actions = legalActions(s, {
      ...rules,
      betFractions: [0.01, 0.02, 0.03],
    });
    expect(actions.some((a) => a.kind === "fold")).toBe(false);
    expect(new Set(actions.map((a) => a.id)).size).toBe(actions.length);
    expect(
      legalActions(
        state(2, {
          bets: [0, 10],
          invested: [0, 10],
          currentBet: 10,
          raises: 3,
        }),
        rules,
      ).some((a) => a.kind === "raise"),
    ).toBe(false);
  });
  it("validates chips and rejects invented action costs", () => {
    expect(() =>
      validateBettingState(state(2, { stacks: [1.5, 100] })),
    ).toThrow();
    const s = state();
    const a = legalActions(s, rules).find((a) => a.kind === "bet")!;
    expect(() => applyAction(s, { ...a, cost: 0 }, rules)).toThrow();
  });
});
describe("side pots and net payoffs", () => {
  it("awards independent side pots to their eligible winners", () => {
    const s = state(3, {
      invested: [20, 50, 100],
      deadPot: 10,
      terminal: true,
    });
    expect(settlePayoffs(s, [1, 2, 3])).toEqual([50, 10, -50]);
  });
  it("preserves folded money and returns uncalled excess even to a folded player", () => {
    const s = state(3, {
      invested: [20, 50, 100],
      folded: [false, false, true],
      deadPot: 0,
      terminal: true,
    });
    expect(settlePayoffs(s, [1, 2, 3])).toEqual([40, 10, -50]);
  });
  it("allocates odd chips clockwise after the dealer and keeps zero-contribution players eligible for dead pot", () => {
    const s = state(3, {
      invested: [0, 0, 0],
      dealer: 0,
      deadPot: 11,
      terminal: true,
    });
    expect(settlePayoffs(s, [1, 1, 1])).toEqual([3, 4, 4]);
  });
  it("combines prior dead money with the main pot before splitting odd chips", () => {
    const s = state(4, {
      invested: [1, 1, 1, 1],
      folded: [false, false, false, true],
      dealer: 0,
      deadPot: 2,
      terminal: true,
    });
    expect(settlePayoffs(s, [1, 1, 1, 99])).toEqual([1, 1, 1, -1]);
  });
  it("gives a sole survivor every contested pot even if their contribution was smaller", () => {
    const s = state(3, {
      invested: [20, 50, 50],
      folded: [false, true, true],
      deadPot: 10,
      terminal: true,
    });
    expect(settlePayoffs(s, [1, 2, 3])).toEqual([110, -50, -50]);
  });
  it("conserves chips across generated legal sequences for 2 to 10 seats", () => {
    let seed = 41;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    for (let n = 2; n <= 10; n++)
      for (let run = 0; run < 12; run++) {
        let s = state(n, {
          stacks: Array.from(
            { length: n },
            () => 3 + Math.floor(random() * 70),
          ),
          dealer: run % n,
        });
        const initial = s.stacks.reduce((a, b) => a + b, 0);
        let steps = 0;
        while (!s.terminal && steps++ < 200) {
          const actions = legalActions(s, rules);
          expect(actions.length).toBeGreaterThan(0);
          s = applyAction(
            s,
            actions[Math.floor(random() * actions.length)],
            rules,
          );
          expect(
            s.stacks.reduce((a, b) => a + b, 0) +
              s.invested.reduce((a, b) => a + b, 0),
          ).toBe(initial);
        }
        expect(s.terminal).toBe(true);
        const result = settlePayoffs(
          s,
          Array.from({ length: n }, () => Math.floor(random() * 3)),
        );
        expect(result.reduce((a, b) => a + b, 0)).toBe(s.deadPot);
        expect(result.every(Number.isInteger)).toBe(true);
      }
  });
});
