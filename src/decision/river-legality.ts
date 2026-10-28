import type { SolveResult, SolvedNode } from "../core/types";
import type { BettingState, BettingAction, DecisionInput } from "./types";
import { actionCost } from "../core/strategy";
import { applyAction, legalActions } from "./betting";
/** Check every path, including future minimum bets and reopening, before a
 * continuous-chip solver tree can be certified for an integer-chip client. */
export function legalRiverTree(
  solved: SolveResult,
  input: DecisionInput,
): boolean {
  const unit = input.chipUnit,
    toChips = (v: number) => {
      const k = Math.round(v / unit);
      if (!Number.isSafeInteger(k) || k < 0 || Math.abs(k * unit - v) > 1e-7)
        throw new Error("Fractional chip");
      return k;
    };
  try {
    const stack = toChips(solved.config.stack),
      pot = toChips(solved.config.pot);
    const initial: BettingState = {
      street: "river",
      stacks: [stack, stack],
      bets: [0, 0],
      invested: [0, 0],
      folded: [false, false],
      pending: [true, true],
      canRaise: [true, true],
      actor: 0,
      dealer: 1,
      currentBet: 0,
      lastFullRaise: input.state.minBet,
      minBet: input.state.minBet,
      deadPot: pot,
      raises: 0,
      history: "",
      boardCount: 5,
      terminal: false,
    };
    const nodes = new Map(solved.nodes.map((n) => [n.id, n])),
      visited = new Set<number>();
    const walk = (id: number, state: BettingState): boolean => {
      const node = nodes.get(id);
      if (!node || visited.has(id)) return false;
      visited.add(id);
      if (node.kind === "terminal") return state.terminal;
      if (
        state.terminal ||
        node.player !== state.actor ||
        toChips(node.pot) !==
          state.deadPot + state.invested.reduce((a, b) => a + b, 0) ||
        node.stacks.some((v, i) => toChips(v) !== state.stacks[i])
      )
        return false;
      return node.actions.every((a) => {
        const action = convert(node, a);
        const own = state.bets[state.actor],
          call = state.currentBet - own;
        // The exact tree may use different sizes. Validate its size as a proposed
        // abstraction action, without changing real minimum/stack/raise rules.
        const fraction =
          state.currentBet === 0
            ? action.to / toChips(node.pot)
            : (action.to - state.currentBet) / (toChips(node.pot) + call);
        const rules = {
          ...input.rules,
          maxRaises: 1,
          betFractions: [fraction > 0 ? fraction : 1],
          raiseFractions: [fraction > 0 ? fraction : 1],
        };
        const legal = legalActions(state, rules).find(
          (x) =>
            x.kind === action.kind &&
            x.to === action.to &&
            x.cost === action.cost,
        );
        return !!legal && walk(a.child, applyAction(state, legal, rules));
      });
    };
    const convert = (
      node: SolvedNode,
      a: SolvedNode["actions"][number],
    ): BettingAction => {
      const own = stack - toChips(node.stacks[node.player!]),
        cost = toChips(actionCost(node, a, solved.config.stack));
      const call = Math.max(
        0,
        toChips(node.stacks[node.player!]) -
          toChips(node.stacks[1 - node.player!]),
      );
      const kind =
        a.label === "allin"
          ? cost <= call
            ? "call"
            : call === 0 && own === 0
              ? "bet"
              : "raise"
          : (a.label as BettingAction["kind"]);
      if (!["fold", "check", "call", "bet", "raise"].includes(kind))
        throw new Error("Unknown action");
      return {
        kind,
        to: own + cost,
        cost,
        allIn: cost === toChips(node.stacks[node.player!]),
        id: `${kind}:${own + cost}`,
      };
    };
    return walk(0, initial) && visited.size === nodes.size;
  } catch {
    return false;
  }
}
export function legalRiverRoot(
  input: DecisionInput,
  actions: BettingAction[],
): boolean {
  const state = input.state,
    own = state.bets[input.hero],
    pot = state.deadPot + state.invested.reduce((a, b) => a + b, 0),
    call = state.currentBet - own;
  return actions.every((action) => {
    const fraction =
      state.currentBet === 0
        ? action.to / pot
        : (action.to - state.currentBet) / (pot + call);
    const rules = {
      ...input.rules,
      betFractions: [fraction > 0 ? fraction : 1],
      raiseFractions: [fraction > 0 ? fraction : 1],
    };
    return legalActions(state, rules).some(
      (a) =>
        a.kind === action.kind && a.to === action.to && a.cost === action.cost,
    );
  });
}
