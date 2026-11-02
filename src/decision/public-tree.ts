import { applyAction, legalActions } from "./betting";
import type {
  BettingAction,
  BettingRules,
  BettingState,
  DecisionActionKind,
} from "./types";

export interface PublicBettingNode<T> {
  state: BettingState;
  actions: BettingAction[];
  children: Map<number, PublicBettingNode<T>>;
  informationSets: Map<number, T>;
}

/** Exact public action histories only. Cards are absent from this cache:
 * private and revealed public cards remain separate information-set keys.
 */
export class PublicBettingTree<T> {
  readonly root: PublicBettingNode<T>;
  private readonly byHistory = new Map<string, PublicBettingNode<T>>();
  private readonly rules: BettingRules;
  constructor(
    state: BettingState,
    rules: BettingRules,
    readonly capacity: number,
    rootKinds?: DecisionActionKind[],
  ) {
    if (!Number.isSafeInteger(capacity) || capacity < 1)
      throw new Error("Invalid public betting cache capacity.");
    this.rules = {
      ...rules,
      betFractions: [...rules.betFractions],
      raiseFractions: [...rules.raiseFractions],
    };
    this.root = this.create({
      ...state,
      stacks: [...state.stacks],
      bets: [...state.bets],
      invested: [...state.invested],
      folded: [...state.folded],
      pending: [...state.pending],
      canRaise: [...state.canRaise],
    });
    this.root.actions = this.root.actions.filter(
      (a) => !rootKinds || rootKinds.includes(a.kind),
    );
  }
  get size() {
    return this.byHistory.size;
  }
  private create(state: BettingState): PublicBettingNode<T> {
    if (this.size >= this.capacity)
      throw new Error("Public betting cache exceeded its reserved capacity.");
    if (this.byHistory.has(state.history))
      throw new Error("Duplicate public action history.");
    const node: PublicBettingNode<T> = {
      state,
      actions: state.terminal ? [] : legalActions(state, this.rules),
      children: new Map(),
      informationSets: new Map(),
    };
    this.byHistory.set(state.history, node);
    return node;
  }
  next(node: PublicBettingNode<T>, actionIndex: number): PublicBettingNode<T> {
    if (
      this.byHistory.get(node.state.history) !== node ||
      !Number.isInteger(actionIndex) ||
      !node.actions[actionIndex]
    )
      throw new Error("Invalid public betting cache transition.");
    let child = node.children.get(actionIndex);
    if (!child) {
      child = this.create(
        applyAction(node.state, node.actions[actionIndex], this.rules),
      );
      node.children.set(actionIndex, child);
    }
    return child;
  }
  find(state: BettingState): PublicBettingNode<T> | undefined {
    const node = this.byHistory.get(state.history);
    if (!node) return undefined;
    const expected = node.state;
    const arrays = [
      "stacks", "bets", "invested", "folded", "pending", "canRaise",
    ] as const;
    const scalars = [
      "street", "actor", "dealer", "currentBet", "lastFullRaise", "minBet",
      "deadPot", "raises", "boardCount", "terminal",
    ] as const;
    if (
      arrays.some(
        (key) => expected[key].length !== state[key].length ||
          expected[key].some((v, i) => v !== state[key][i]),
      ) || scalars.some((key) => expected[key] !== state[key])
    )
      throw new Error("Public state disagrees with its cached action history.");
    return node;
  }
}
