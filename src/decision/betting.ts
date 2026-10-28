import type {
  BettingAction,
  BettingRules,
  BettingState,
  DecisionStreet,
} from "./types";
const streets: DecisionStreet[] = ["preflop", "flop", "turn", "river"];
const total = (values: number[]) => values.reduce((a, b) => a + b, 0);
const chip = (value: number) => Number.isSafeInteger(value) && value >= 0;
export function validateBettingState(state: BettingState): void {
  const n = state.stacks.length;
  if (n < 2 || n > 10 || !streets.includes(state.street))
    throw new Error("Invalid betting seats or street");
  if (
    [
      state.bets,
      state.invested,
      state.folded,
      state.pending,
      state.canRaise,
    ].some((a) => a.length !== n)
  )
    throw new Error("Betting seat arrays differ");
  if (
    ![
      ...state.stacks,
      ...state.bets,
      ...state.invested,
      state.deadPot,
      state.currentBet,
      state.lastFullRaise,
      state.minBet,
      state.raises,
    ].every(chip)
  )
    throw new Error("Chips and raise counts must be nonnegative safe integers");
  if (
    state.minBet < 1 ||
    state.lastFullRaise < 1 ||
    state.bets.some((v, i) => v > state.invested[i] || v > state.currentBet)
  )
    throw new Error("Inconsistent bets");
  if (!chip(total(state.invested) + total(state.stacks) + state.deadPot))
    throw new Error("Chip total exceeds safe integer range");
  if (
    !Number.isInteger(state.dealer) ||
    state.dealer < 0 ||
    state.dealer >= n ||
    !Number.isInteger(state.actor) ||
    state.actor < 0 ||
    state.actor >= n
  )
    throw new Error("Invalid betting position");
  if (
    [state.folded, state.pending, state.canRaise].some((a) =>
      a.some((v) => typeof v !== "boolean"),
    )
  )
    throw new Error("Invalid betting flags");
}
function validateRules(rules: BettingRules): void {
  if (
    !chip(rules.maxRaises) ||
    ![...rules.betFractions, ...rules.raiseFractions].every(
      (v) => Number.isFinite(v) && v > 0,
    )
  )
    throw new Error("Invalid betting abstraction");
}
/** Legal actions are a finite sizing abstraction of no-limit hold'em. `to` is the street total. */
export function legalActions(
  state: BettingState,
  rules: BettingRules,
): BettingAction[] {
  validateBettingState(state);
  validateRules(rules);
  const i = state.actor;
  if (
    state.terminal ||
    state.folded[i] ||
    state.stacks[i] === 0 ||
    !state.pending[i]
  )
    return [];
  const actions: BettingAction[] = [];
  const stack = state.stacks[i],
    own = state.bets[i],
    call = Math.max(0, state.currentBet - own);
  const add = (kind: BettingAction["kind"], to: number) => {
    const cost = to - own;
    if (!actions.some((a) => a.kind === kind && a.to === to))
      actions.push({
        kind,
        to,
        cost,
        allIn: cost === stack,
        id: `${kind}:${to}`,
      });
  };
  if (call > 0) {
    add("fold", own);
    add("call", own + Math.min(stack, call));
  } else add("check", own);
  const opponentCanAct = state.stacks.some(
    (v, j) => j !== i && !state.folded[j] && v > 0,
  );
  if (!state.canRaise[i] || !opponentCanAct || stack <= call) return actions;
  const pot = state.deadPot + total(state.invested),
    cap = own + stack;
  if (state.currentBet === 0) {
    for (const fraction of rules.betFractions) {
      const to = Math.max(state.minBet, Math.round(fraction * pot));
      if (to <= cap) add("bet", to);
    }
    if (rules.includeAllIn) add("bet", cap);
  } else if (state.raises < rules.maxRaises) {
    const minRaise = Math.max(state.minBet, state.lastFullRaise);
    for (const fraction of rules.raiseFractions) {
      const to =
        state.currentBet +
        Math.max(minRaise, Math.round(fraction * (pot + call)));
      if (to <= cap) add("raise", to);
    }
    if (rules.includeAllIn) add("raise", cap);
  }
  return actions;
}
function nextPending(state: BettingState, after: number): number | undefined {
  for (let offset = 1; offset <= state.stacks.length; offset++) {
    const i = (after + offset) % state.stacks.length;
    if (state.pending[i] && !state.folded[i] && state.stacks[i] > 0) return i;
  }
  return undefined;
}
/** Return a new state; neither the input state nor its arrays are mutated. */
export function applyAction(
  state: BettingState,
  action: BettingAction,
  rules: BettingRules,
): BettingState {
  const legal = legalActions(state, rules).find(
    (a) =>
      a.id === action.id &&
      a.kind === action.kind &&
      a.to === action.to &&
      a.cost === action.cost &&
      a.allIn === action.allIn,
  );
  if (!legal) throw new Error("Illegal betting action");
  const s: BettingState = {
    ...state,
    stacks: [...state.stacks],
    bets: [...state.bets],
    invested: [...state.invested],
    folded: [...state.folded],
    pending: [...state.pending],
    canRaise: [...state.canRaise],
  };
  const actor = s.actor,
    previousBet = s.currentBet;
  s.pending[actor] = false;
  s.canRaise[actor] = false;
  s.history += `${s.history ? "|" : ""}${s.street}:${actor}:${legal.id}`;
  if (legal.kind === "fold") s.folded[actor] = true;
  else {
    s.stacks[actor] -= legal.cost;
    s.invested[actor] += legal.cost;
    s.bets[actor] = legal.to;
    if (legal.kind === "bet" || legal.kind === "raise") {
      const increment = legal.to - previousBet;
      const full =
        increment >= (previousBet === 0 ? s.minBet : s.lastFullRaise);
      s.currentBet = legal.to;
      if (legal.kind === "raise") s.raises++;
      if (full) s.lastFullRaise = increment;
      for (let i = 0; i < s.stacks.length; i++)
        if (i !== actor && !s.folded[i] && s.stacks[i] > 0) {
          if (s.bets[i] < s.currentBet) s.pending[i] = true;
          // Several short all-ins may cumulatively constitute a full raise to this seat.
          if (full || s.currentBet - s.bets[i] >= s.lastFullRaise)
            s.canRaise[i] = true;
        }
    }
  }
  if (s.folded.filter((v) => !v).length === 1) {
    s.terminal = true;
    s.pending.fill(false);
    return s;
  }
  const next = nextPending(s, actor);
  if (next !== undefined) {
    s.actor = next;
    return s;
  }
  const actionable = s.stacks.filter((v, i) => v > 0 && !s.folded[i]).length;
  if (s.street === "river" || actionable <= 1) {
    s.terminal = true;
    s.pending.fill(false);
    if (actionable <= 1) {
      s.street = "river";
      s.boardCount = 5;
    }
    return s;
  }
  s.street = streets[streets.indexOf(s.street) + 1];
  s.boardCount = s.street === "flop" ? 3 : s.street === "turn" ? 4 : 5;
  s.bets.fill(0);
  s.currentBet = 0;
  s.lastFullRaise = s.minBet;
  s.raises = 0;
  s.pending = s.stacks.map((v, i) => v > 0 && !s.folded[i]);
  s.canRaise = [...s.pending];
  s.actor = nextPending(s, s.dealer)!;
  return s;
}
