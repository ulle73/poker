import { expect, it } from "vitest";
import { PublicBettingTree } from "../src/decision/public-tree";
import { applyAction, legalActions } from "../src/decision/betting";
import { checkJamInitial, type CheckJamSpot } from "./helpers/check-jam-oracle";
const spot: CheckJamSpot = {
  board: ["2c", "3d", "7h", "9s", "Jc"],
  ranges: [
    [{ cards: ["As", "Ah"], weight: 1 }],
    [{ cards: ["Ks", "Kh"], weight: 1 }],
    [{ cards: ["Qs", "Qh"], weight: 1 }],
  ], investment: 1, stack: 2,
};
const rules = { betFractions: [], raiseFractions: [], maxRaises: 0, includeAllIn: true };

it("shares repeated transitions while retaining distinct complete public action histories", () => {
  const state = checkJamInitial(spot), saved = structuredClone(state);
  const tree = new PublicBettingTree(state, rules, 30);
  const checked = tree.next(tree.root, 0), bet = tree.next(tree.root, 1);
  expect(tree.next(tree.root, 0)).toBe(checked);
  expect(checked).not.toBe(bet);
  expect(checked.state).toEqual(applyAction(state, legalActions(state, rules)[0], rules));
  expect(tree.size).toBe(3);
  expect(tree.find(structuredClone(checked.state))).toBe(checked);
  expect(state).toEqual(saved);
});

it("checks every public state field before reusing a history in policy audits", () => {
  const tree = new PublicBettingTree(checkJamInitial(spot), rules, 30);
  for (const key of ["stacks", "bets", "invested", "folded", "pending", "canRaise"] as const) {
    const changed = structuredClone(tree.root.state);
    if (typeof changed[key][0] === "boolean") (changed[key] as boolean[])[0] = !(changed[key] as boolean[])[0];
    else (changed[key] as number[])[0]++;
    expect(() => tree.find(changed)).toThrow(/public state.*history/i);
  }
  expect(() => tree.find({ ...tree.root.state, actor: 1 })).toThrow(/public state.*history/i);
});

it("enforces the cache bound without mutating the input or storing half an edge", () => {
  const state = checkJamInitial(spot), saved = structuredClone(state);
  const tree = new PublicBettingTree(state, rules, 1);
  expect(() => tree.next(tree.root, 0)).toThrow(/reserved capacity/i);
  expect(tree.size).toBe(1);
  expect(tree.root.children.size).toBe(0);
  expect(state).toEqual(saved);
});

it("retains root action restrictions and rejects unrelated nodes", () => {
  const tree = new PublicBettingTree(checkJamInitial(spot), rules, 30, ["check"]);
  expect(tree.root.actions.map((a) => a.kind)).toEqual(["check"]);
  const other = new PublicBettingTree(checkJamInitial(spot), rules, 30);
  expect(() => tree.next(other.root, 0)).toThrow(/invalid.*transition/i);
  expect(() => tree.next(tree.root, 0.5)).toThrow(/invalid.*transition/i);
});
