import { describe, expect, it } from "vitest";
import { cardCode } from "phe";
import {
  informationSetKey,
  regretMatching,
  solveDecision,
} from "../src/decision/mccfr";
import { legalActions } from "../src/decision/betting";
import type { DecisionInput, DecisionStreet } from "../src/decision/types";
function fixture(n = 2, street: DecisionStreet = "river"): DecisionInput {
  const count = { preflop: 0, flop: 3, turn: 4, river: 5 }[street];
  return {
    key: `test:${n}:${street}`,
    hero: 0,
    seats: Array.from({ length: n }, (_, i) => i + 1),
    heroCards: ["As", "Ah"],
    board: ["Ac", "Kd", "7h", "3s", "2c"].slice(0, count),
    state: {
      street,
      stacks: Array(n).fill(10),
      bets: Array(n).fill(0),
      invested: Array(n).fill(5),
      folded: Array(n).fill(false),
      pending: Array(n).fill(true),
      canRaise: Array(n).fill(true),
      actor: 0,
      dealer: n - 1,
      currentBet: 0,
      lastFullRaise: 2,
      minBet: 2,
      deadPot: 0,
      raises: 0,
      history: "observed",
      boardCount: count,
      terminal: false,
    },
    rules: {
      betFractions: [0.5, 1],
      raiseFractions: [1],
      maxRaises: 1,
      includeAllIn: true,
    },
    chipUnit: 0.01,
    currency: "SEK",
    ranges: Array(n).fill(""),
    rangeRevision: 2,
    assumptions: ["Uniform unknown ranges"],
  };
}
/** Opponent is already all-in. This reduced zero-sum game has an exact
 * independent best response: call wins +20 with nuts, loses -20 with air;
 * folding is zero. There is no continuation strategy or roll-out ambiguity.
 */
function oneDecision(heroCards: string[]): DecisionInput {
  const input = fixture();
  input.heroCards = heroCards;
  input.board = ["2s", "3h", "7d", "9c", "Jc"];
  input.ranges = ["AsAh,4s5s", "KsKh,QsQh"];
  input.state.stacks = [20, 0];
  input.state.bets = [0, 20];
  input.state.invested = [0, 20];
  input.state.currentBet = 20;
  input.state.pending = [true, false];
  input.state.canRaise = [false, false];
  input.state.lastFullRaise = 20;
  return input;
}
const exactOptions = { seed: 713, maxIterations: 400, timeBudgetMs: 4000 };
describe("external-sampling decision solver", () => {
  it("updates a hero in the last seat before spending the budget on earlier seats", () => {
    const input = fixture(10, "preflop");
    input.hero = 9;
    input.state.actor = 9;
    const result = solveDecision(input, {
      seed: 19,
      maxIterations: 2,
      timeBudgetMs: 4000,
      maxNodes: 4,
    });
    expect(result.rootVisits).toBeGreaterThan(0);
    expect(result.actions.every((action) => action.ev !== null)).toBe(true);
  });
  it("rejects untouched uniform output when the actual root received no regret traversal", () => {
    expect(() =>
      solveDecision(fixture(), {
        seed: 1,
        maxIterations: 1,
        timeBudgetMs: 4000,
        maxNodes: 4,
      }),
    ).toThrow(/undertrained.*actual-hand/i);
  });
  it("matches positive cumulative regrets, retaining negative signed regret history", () => {
    expect(regretMatching([-100, 10, 30])).toEqual([0, 0.25, 0.75]);
    expect(regretMatching([-2, 0])).toEqual([0.5, 0.5]);
  });
  it("does not distinguish opponent cards or unrevealed board cards in an information set", () => {
    const input = fixture(3, "flop");
    const hand = [1, 2];
    const first = informationSetKey(
      "same-root",
      input.state,
      hand,
      [10, 11, 12, 13, 14],
    );
    expect(
      informationSetKey("same-root", input.state, [2, 1], [10, 11, 12, 40, 41]),
    ).toBe(first);
    expect(
      informationSetKey("same-root", input.state, [1, 3], [10, 11, 12, 13, 14]),
    ).not.toBe(first);
    expect(
      informationSetKey("same-root", input.state, hand, [10, 11, 15, 13, 14]),
    ).not.toBe(first);
    expect(
      informationSetKey(
        "same-root",
        { ...input.state, history: "different-public-action" },
        hand,
        [10, 11, 12, 13, 14],
      ),
    ).not.toBe(first);
    expect(
      informationSetKey(
        "same-root",
        { ...input.state, boardCount: 4 },
        hand,
        [10, 11, 12, 13, 14],
      ),
    ).not.toBe(
      informationSetKey(
        "same-root",
        { ...input.state, boardCount: 4 },
        hand,
        [10, 11, 12, 40, 14],
      ),
    );
  });
  it("learns exact opposite best responses with a strong hand and a bluff, rather than uniform frequencies", () => {
    const nuts = solveDecision(oneDecision(["As", "Ah"]), exactOptions);
    const air = solveDecision(oneDecision(["4s", "5s"]), exactOptions);
    expect(
      nuts.actions.find((a) => a.kind === "call")!.frequency,
    ).toBeGreaterThan(0.98);
    expect(
      air.actions.find((a) => a.kind === "fold")!.frequency,
    ).toBeGreaterThan(0.98);
    expect(nuts.actions.find((a) => a.kind === "call")!.ev).toBeCloseTo(20, 10);
    expect(air.actions.find((a) => a.kind === "call")!.ev).toBeCloseTo(-20, 10);
    expect(nuts.actions.find((a) => a.kind === "fold")!.ev).toBe(0);
    expect(nuts.cutoffCount).toBe(0);
    expect(nuts.rootVisits).toBeGreaterThan(100);
    expect(nuts.quality).toBe("approximation");
    expect(nuts.exploitabilityPct).toBeNull();
  });
  it("matches independent pot-odds best responses on both sides of a two-combo opponent mixture", () => {
    // Hero QQ always beats TT and always loses to KK on this board. Equal
    // opponent combos mean 50% equity. Calling 20 to win 20 is exactly tied;
    // ten dead chips make calling worth +5, while a 40-chip uncalled excess
    // does not change that value (it is returned to the opponent).
    const input = oneDecision(["Qs", "Qh"]);
    input.ranges = ["QsQh", "TsTh,KsKh"];
    input.state.deadPot = 10;
    const result = solveDecision(input, {
      seed: 281,
      maxIterations: 2000,
      timeBudgetMs: 4000,
    });
    expect(
      result.actions.find((a) => a.kind === "call")!.frequency,
    ).toBeGreaterThan(0.85);
    expect(result.actions.find((a) => a.kind === "call")!.ev).toBeCloseTo(5, 0);
  });
  it("is repeatable with a seed and fixed iteration budget", () => {
    const first = solveDecision(oneDecision(["As", "Ah"]), exactOptions);
    const second = solveDecision(oneDecision(["As", "Ah"]), exactOptions);
    expect(second.actions).toEqual(first.actions);
    expect(second.rootVisits).toBe(first.rootVisits);
    expect(second.iterations).toBe(400);
  });
  it("learns the independent pot-sized one-bet equilibrium bluff frequency", () => {
    // A two-type river betting game: AA always wins at showdown, 22 loses
    // to QQ. Pot = 2 and sole bet = 2. Villain may only check after a check.
    // Exact equilibrium: value hands bet, half the air hands bluff; villain
    // calls half the bets. This checks strategic opponent updates, not equity.
    const input = fixture();
    input.heroCards = ["2s", "2h"];
    input.board = ["3s", "7h", "9d", "Jc", "Kc"];
    input.ranges = ["AsAh,2s2h", "QsQh"];
    input.state.stacks = [2, 2];
    input.state.invested = [1, 1];
    input.state.canRaise = [true, false];
    input.rules = {
      betFractions: [1],
      raiseFractions: [],
      maxRaises: 0,
      includeAllIn: false,
    };
    const result = solveDecision(input, {
      seed: 395,
      maxIterations: 5000,
      timeBudgetMs: 4000,
    });
    expect(result.cutoffCount).toBe(0);
    expect(
      result.actions.find((a) => a.kind === "bet")!.frequency,
    ).toBeGreaterThan(0.35);
    expect(
      result.actions.find((a) => a.kind === "bet")!.frequency,
    ).toBeLessThan(0.65);
    const valueResult = solveDecision(
      { ...input, heroCards: ["As", "Ah"] },
      { seed: 395, maxIterations: 5000, timeBudgetMs: 4000 },
    );
    const valueBet = valueResult.actions.find(
      (a) => a.kind === "bet",
    )!.frequency;
    const bluffBet = result.actions.find((a) => a.kind === "bet")!.frequency;
    expect(valueBet).toBeGreaterThan(0.98);
    // Independently enumerate the opponent's two pure best responses. Exact
    // game value is 0.5 chips; the learned root policy should lose <0.15 chips
    // against its best response, on this tiny fixture only.
    const versusFold = 0.5 * 1 + 0.5 * (bluffBet * 1 + (1 - bluffBet) * -1);
    const versusCall =
      0.5 * (valueBet * 3 + (1 - valueBet) * 1) +
      0.5 * (bluffBet * -3 + (1 - bluffBet) * -1);
    expect(0.5 - Math.min(versusFold, versusCall)).toBeLessThan(0.15);
  });
  it("restricts observed root kinds while retaining every legal size and rejects a mismatch", () => {
    const input = fixture();
    input.rootKinds = ["bet"];
    const result = solveDecision(input, {
      maxIterations: 2,
      timeBudgetMs: 4000,
    });
    expect(result.actions.every((action) => action.kind === "bet")).toBe(true);
    expect(result.actions).toHaveLength(
      legalActions(input.state, input.rules).filter((a) => a.kind === "bet")
        .length,
    );
    expect(() => solveDecision({ ...input, rootKinds: ["call"] })).toThrow(
      /legal root action/i,
    );
  });
  for (const street of ["preflop", "flop", "turn", "river"] as const) {
    for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      it(`returns all legal sized actions for ${n} seats on ${street}`, () => {
        const input = fixture(n, street);
        const before = JSON.stringify(input);
        const result = solveDecision(input, {
          seed: 19,
          maxIterations: 4,
          timeBudgetMs: 4000,
          maxNodes: 32,
          maxDepth: 5,
        });
        expect(JSON.stringify(input)).toBe(before);
        expect(
          result.actions.map(({ frequency: _f, ev: _v, ...a }) => a),
        ).toEqual(legalActions(input.state, input.rules));
        expect(
          result.actions.reduce((sum, a) => sum + a.frequency, 0),
        ).toBeCloseTo(1, 12);
        expect(
          result.actions.every(
            (a) =>
              Number.isFinite(a.frequency) &&
              a.frequency >= 0 &&
              a.frequency <= 1,
          ),
        ).toBe(true);
        expect(result.actions[result.recommended].frequency).toBe(
          Math.max(...result.actions.map((a) => a.frequency)),
        );
        expect(result.key).toBe(input.key);
        expect(result.rangeRevision).toBe(input.rangeRevision);
        if (n > 2) expect(result.limitations.join(" ")).toContain("SIMPLE");
      });
    }
  }
  it("reports node, table and depth cutoffs, bounded time, and no convergence guarantee", () => {
    const result = solveDecision(fixture(10, "preflop"), {
      seed: 5,
      timeBudgetMs: 25,
      maxIterations: 5000,
      maxInfosets: 2,
      maxNodes: 2,
      maxDepth: 2,
    });
    expect(result.elapsedMs).toBeLessThan(1000);
    expect(result.cutoffCount).toBeGreaterThan(0);
    expect(result.limitations.join(" ")).toContain("passive");
    expect(result.limitations.join(" ")).toContain(
      "no measured exploitability",
    );
  });
  it("settles a short all-in against a board tie with the exact uncalled excess returned", () => {
    const input = oneDecision(["2h", "3h"]);
    input.board = ["As", "Ks", "Qs", "Js", "Ts"];
    input.ranges = ["2h3h", "4h5h"];
    input.state.stacks = [5, 0];
    // Both get half the contested 10 chips. Remaining 15 go back to opponent.
    const result = solveDecision(input, {
      seed: 19,
      maxIterations: 100,
      timeBudgetMs: 4000,
    });
    expect(result.actions.find((a) => a.kind === "call")!.cost).toBe(5);
    expect(result.actions.find((a) => a.kind === "call")!.ev).toBe(0);
    expect(result.actions.find((a) => a.kind === "fold")!.ev).toBe(0);
    expect(result.actions.reduce((sum, a) => sum + a.frequency, 0)).toBe(1);
  });
  it("rejects a root for another actor, inconsistent street, or invalid budgets", () => {
    const input = fixture();
    expect(() => solveDecision({ ...input, hero: 1 })).toThrow(/hero/i);
    expect(() => solveDecision({ ...input, board: [] })).toThrow(/board/i);
    expect(() => solveDecision(input, { maxIterations: 0 })).toThrow(
      /positive/i,
    );
    expect(() => solveDecision(input, { seed: -1 })).toThrow(/seed/i);
  });
  it("encodes PHE cards compatibly with sampled information sets", () => {
    const input = fixture();
    const own = input.heroCards.map((c) => cardCode(c[0], c[1]));
    expect(new Set(own).size).toBe(2);
    expect(
      informationSetKey(input.key, input.state, own, [1, 2, 3, 4, 5]),
    ).toContain(input.key);
  });
});
