import type { SolveResult, SolvedNode } from "../core/types";
import type { BettingState, BettingAction, DecisionInput } from "./types";
import { normalizeCards } from "../core/cards";
import { applyAction, legalActions } from "./betting";
/** Check every path, including future minimum bets and reopening, before a
 * continuous-chip solver tree can be certified for an integer-chip client. */
export function legalPostflopTree(
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
    const rootBoard = normalizeCards(solved.config.board);
    if (![4, 5].includes(rootBoard.length)) return false;
    if (
      input.seats.length !== 2 ||
      rootBoard.join(" ") !== input.board.join(" ")
    )
      return false;
    const stack = toChips(solved.config.stack),
      pot = toChips(solved.config.pot);
    const initial: BettingState = {
      street: rootBoard.length === 4 ? "turn" : "river",
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
      boardCount: rootBoard.length,
      terminal: false,
    };
    const nodes = new Map(solved.nodes.map((n) => [n.id, n])),
      visited = new Set<number>();
    const walk = (
      id: number,
      state: BettingState,
      board: string[],
    ): boolean => {
      const node = nodes.get(id);
      if (!node || visited.has(id)) return false;
      visited.add(id);
      if (node.stacks.length !== 2) return false;
      if (node.board.join(" ") !== board.join(" ")) return false;
      if (node.kind === "terminal") {
        if (!state.terminal) return false;
        if (node.terminal?.kind === "fold") {
          const folder = state.folded.findIndex(Boolean);
          const matched = Math.min(...state.invested);
          return (
            folder >= 0 &&
            node.terminal.folder === folder &&
            toChips(node.terminal.pot) === state.deadPot + 2 * matched &&
            node.stacks.every((v) => toChips(v) === stack - matched)
          );
        }
        return (
          node.terminal?.kind === "showdown" &&
          board.length === 5 &&
          state.folded.every((f) => !f) &&
          toChips(node.terminal.pot) ===
            state.deadPot + state.invested[0] + state.invested[1] &&
          node.stacks.every((v, i) => toChips(v) === state.stacks[i])
        );
      }
      if (node.kind === "chance") {
        const edges = node.valid_cards;
        const cards = "23456789TJQKA"
          .split("")
          .flatMap((r) => ["s", "h", "d", "c"].map((s) => r + s))
          .filter((c) => !board.includes(c));
        if (
          board.length !== 4 ||
          state.street !== "river" ||
          state.folded.some(Boolean) ||
          !edges ||
          edges.length !== cards.length ||
          new Set(edges.map((e) => e.card)).size !== cards.length ||
          edges.some((e) => !cards.includes(e.card)) ||
          toChips(node.pot) !==
            state.deadPot + state.invested[0] + state.invested[1] ||
          node.stacks.some((v, i) => toChips(v) !== state.stacks[i])
        )
          return false;
        return edges.every((edge) =>
          walk(edge.child, state, [...board, edge.card]),
        );
      }
      if (
        node.kind !== "decision" ||
        state.terminal ||
        node.street !== state.street ||
        board.length !== state.boardCount ||
        node.player !== state.actor ||
        toChips(node.pot) !==
          state.deadPot + state.invested.reduce((a, b) => a + b, 0) ||
        node.stacks.some((v, i) => toChips(v) !== state.stacks[i])
      )
        return false;
      const converted = node.actions.map((a) => convert(state, a));
      const required =
        state.currentBet > state.bets[state.actor]
          ? ["fold", "call"]
          : ["check"];
      if (
        required.some(
          (kind) => !converted.some((action) => action.kind === kind),
        ) ||
        new Set(converted.map((action) => action.id)).size !== converted.length
      )
        return false;
      return node.actions.every((a, index) => {
        const action = converted[index];
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
        return (
          !!legal && walk(a.child, applyAction(state, legal, rules), board)
        );
      });
    };
    const convert = (
      state: BettingState,
      a: SolvedNode["actions"][number],
    ): BettingAction => {
      const actor = state.actor,
        own = state.bets[actor],
        call = Math.max(0, state.currentBet - own);
      const cost =
        a.label === "fold" || a.label === "check"
          ? 0
          : a.label === "call"
            ? Math.min(state.stacks[actor], call)
            : a.label === "allin"
              ? state.stacks[actor]
              : toChips(a.amount_to ?? NaN) - own;
      const kind =
        a.label === "allin"
          ? cost <= call
            ? "call"
            : state.currentBet === 0
              ? "bet"
              : "raise"
          : (a.label as BettingAction["kind"]);
      if (!["fold", "check", "call", "bet", "raise"].includes(kind))
        throw new Error("Unknown action");
      return {
        kind,
        to: own + cost,
        cost,
        allIn: cost === state.stacks[actor],
        id: `${kind}:${own + cost}`,
      };
    };
    return walk(0, initial, rootBoard) && visited.size === nodes.size;
  } catch {
    return false;
  }
}
export const legalRiverTree = legalPostflopTree;
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
