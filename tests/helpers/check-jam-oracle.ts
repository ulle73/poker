// Independent finite river-game oracle: no production betting/payoff/CFR code.
// The policy is observed only through own cards and public state. Best responses
// aggregate compatible hidden deals BEFORE selecting an action.
import { cardCode } from "phe";
import { evaluate7 } from "../../scripts/river-oracle.mjs";
import type {
  BettingAction,
  BettingState,
  DecisionPolicy,
} from "../../src/decision/types";
export interface CheckJamSpot {
  board: string[];
  ranges: { cards: [string, string]; weight: number }[][];
  investment: number;
  stack: number;
}
const handKey = (cards: readonly string[]) => [...cards].sort().join("");
const codes = (cards: readonly string[]) =>
  cards.map((c) => cardCode(c[0], c[1]));
export function checkJamInitial(spot: CheckJamSpot): BettingState {
  const n = spot.ranges.length;
  return {
    street: "river",
    stacks: Array(n).fill(spot.stack),
    bets: Array(n).fill(0),
    invested: Array(n).fill(spot.investment),
    folded: Array(n).fill(false),
    pending: Array(n).fill(true),
    canRaise: Array(n).fill(true),
    actor: 0,
    dealer: n - 1,
    currentBet: 0,
    lastFullRaise: 1,
    minBet: 1,
    deadPot: 0,
    raises: 0,
    history: "",
    boardCount: 5,
    terminal: false,
  };
}
function actions(state: BettingState): BettingAction[] {
  const i = state.actor,
    own = state.bets[i],
    call = Math.max(0, state.currentBet - own);
  const make = (kind: BettingAction["kind"], cost: number): BettingAction => ({
    kind,
    cost,
    to: own + cost,
    allIn: cost === state.stacks[i],
    id: `${kind}:${own + cost}`,
  });
  return call > 0
    ? [make("fold", 0), make("call", Math.min(call, state.stacks[i]))]
    : [make("check", 0), make("bet", state.stacks[i])];
}
function step(state: BettingState, action: BettingAction): BettingState {
  const next = {
      ...state,
      stacks: [...state.stacks],
      bets: [...state.bets],
      invested: [...state.invested],
      folded: [...state.folded],
      pending: [...state.pending],
      canRaise: [...state.canRaise],
    },
    i = state.actor;
  next.pending[i] = false;
  next.canRaise[i] = false;
  next.history += `${next.history ? "|" : ""}river:${i}:${action.id}`;
  if (action.kind === "fold") next.folded[i] = true;
  else {
    next.stacks[i] -= action.cost;
    next.bets[i] += action.cost;
    next.invested[i] += action.cost;
  }
  if (action.kind === "bet") {
    next.currentBet = action.to;
    next.lastFullRaise = action.cost;
    next.pending.forEach((_, j) => {
      if (j !== i && !next.folded[j] && next.stacks[j] > 0) {
        next.pending[j] = true;
        next.canRaise[j] = true;
      }
    });
  }
  if (next.folded.filter((f) => !f).length === 1) {
    next.terminal = true;
    next.pending.fill(false);
    return next;
  }
  for (let offset = 1; offset <= next.stacks.length; offset++) {
    const j = (i + offset) % next.stacks.length;
    if (next.pending[j] && !next.folded[j] && next.stacks[j] > 0) {
      next.actor = j;
      return next;
    }
  }
  next.terminal = true;
  next.pending.fill(false);
  return next;
}

/** Enumerate the independent public game, including every off-policy action. */
export function independentCheckJamPublicNodes(spot: CheckJamSpot) {
  const result: {state: BettingState; actions: BettingAction[]}[] = [];
  const visit = (state: BettingState) => {
    if (state.terminal) return;
    if (result.length >= 20000) throw new Error("Independent public tree budget exceeded.");
    const edges = actions(state);
    result.push({state, actions: edges});
    edges.forEach((a) => visit(step(state, a)));
  };
  visit(checkJamInitial(spot));
  return result;
}

export function independentCheckJamReport(
  spot: CheckJamSpot,
  profile: DecisionPolicy,
) {
  const n = spot.ranges.length;
  if (
    n < 2 ||
    n > 10 ||
    spot.board.length !== 5 ||
    new Set(spot.board).size !== 5 ||
    !Number.isSafeInteger(spot.investment) ||
    !Number.isSafeInteger(spot.stack) ||
    spot.stack < 1 ||
    spot.investment < 1
  )
    throw new Error("Invalid independent river fixture.");
  const ranges = spot.ranges.map((range) => {
    const keys = range.map((hand) => handKey(hand.cards));
    if (new Set(keys).size !== keys.length)
      throw new Error("Duplicate independent private combination.");
    return range.map((hand) => ({
      ...hand,
      key: handKey(hand.cards),
      rank: evaluate7([...spot.board, ...hand.cards]),
    }));
  });
  type Hand = (typeof ranges)[number][number];
  type Deal = { hands: Hand[]; weight: number };
  const tuples: Deal[] = [];
  const enumerate = (
    seat: number,
    hands: Hand[],
    used: Set<string>,
    weight: number,
  ) => {
    if (seat === n) {
      if (tuples.length >= 4096)
        throw new Error("Independent deal budget exceeded.");
      tuples.push({ hands, weight });
      return;
    }
    for (const hand of ranges[seat]) {
      if (
        hand.cards.length !== 2 ||
        new Set(hand.cards).size !== 2 ||
        !Number.isFinite(hand.weight) ||
        hand.weight <= 0
      )
        throw new Error("Invalid independent private range.");
      if (hand.cards.some((c) => used.has(c))) continue;
      enumerate(
        seat + 1,
        [...hands, hand],
        new Set([...used, ...hand.cards]),
        weight * hand.weight,
      );
    }
  };
  enumerate(0, [], new Set(spot.board), 1);
  const mass = tuples.reduce((sum, t) => sum + t.weight, 0);
  if (!(mass > 0)) throw new Error("No compatible independent deal.");
  const initial = checkJamInitial(spot),
    policyCache = new Map<string, number[]>(),
    untrained = new Set<string>();
  let visits = 0;
  const policy = (state: BettingState, hand: Hand) => {
    const key = state.history + "#" + hand.key;
    const saved = policyCache.get(key);
    if (saved) return saved;
    const row = profile.query(state, codes(hand.cards), codes(spot.board)),
      expected = actions(state);
    if (
      row.actions.length !== expected.length ||
      row.frequencies.length !== expected.length ||
      row.actions.some(
        (a, i) =>
          a.kind !== expected[i].kind ||
          a.cost !== expected[i].cost ||
          a.to !== expected[i].to,
      )
    )
      throw new Error("Solver and independent public game disagree.");
    if (
      row.frequencies.some((p) => !Number.isFinite(p) || p < 0) ||
      Math.abs(row.frequencies.reduce((sum, p) => sum + p, 0) - 1) > 1e-9
    )
      throw new Error("Invalid independent policy row.");
    if (!row.trained) untrained.add(key);
    policyCache.set(key, row.frequencies);
    return row.frequencies;
  };
  const payoff = (state: BettingState, deal: Deal, hero: number) => {
    // Split each contribution tier independently, including its odd chips.
    // Dealer is n-1 in this fixture, so ascending seats start left of the button.
    const levels = [...new Set(state.invested)].filter((v) => v > 0).sort((a, b) => a - b);
    let previous = 0, net = -state.invested[hero];
    for (const level of levels) {
      const funded = state.invested.flatMap((v, i) => v >= level ? [i] : []);
      const pot = (level - previous) * funded.length;
      previous = level;
      if (funded.length === 1) {
        if (funded[0] === hero) net += pot; // Uncalled excess is returned.
        continue;
      }
      const eligible = funded.filter((i) => !state.folded[i]);
      if (!eligible.length) throw new Error("Independent pot has no eligible winner.");
      const best = Math.max(...eligible.map((i) => deal.hands[i].rank));
      const winners = eligible.filter((i) => deal.hands[i].rank === best);
      const index = winners.indexOf(hero);
      if (index >= 0)
        net += Math.floor(pot / winners.length) + (index < pot % winners.length ? 1 : 0);
    }
    return net;
  };
  const value = (
    state: BettingState,
    belief: Deal[],
    hero: number,
    own: Hand,
    bestResponse: boolean,
  ): number => {
    if (++visits > 2000000)
      throw new Error("Independent tree budget exceeded.");
    if (!belief.length) return 0;
    if (state.terminal)
      return belief.reduce(
        (sum, deal) => sum + deal.weight * payoff(state, deal, hero),
        0,
      );
    const edges = actions(state);
    if (state.actor === hero) {
      if (bestResponse)
        return Math.max(
          ...edges.map((a) => value(step(state, a), belief, hero, own, true)),
        );
      const frequencies = policy(state, own);
      return edges.reduce(
        (sum, a, i) =>
          sum +
          (frequencies[i] > 0
            ? frequencies[i] * value(step(state, a), belief, hero, own, false)
            : 0),
        0,
      );
    }
    return edges.reduce((sum, a, i) => {
      const childBelief = belief.flatMap((deal) => {
        const weight = deal.weight * policy(state, deal.hands[state.actor])[i];
        return weight > 0 ? [{ hands: deal.hands, weight }] : [];
      });
      return sum + value(step(state, a), childBelief, hero, own, bestResponse);
    }, 0);
  };
  const ev: number[] = [],
    bestResponse: number[] = [];
  for (let hero = 0; hero < n; hero++) {
    let v = 0,
      b = 0;
    for (const own of ranges[hero]) {
      const belief = tuples.filter((deal) => deal.hands[hero].key === own.key);
      v += value(initial, belief, hero, own, false);
      b += value(initial, belief, hero, own, true);
    }
    ev.push(v / mass);
    bestResponse.push(b / mass);
  }
  const gains = bestResponse.map((b, i) => b - ev[i]),
    nashConv = gains.reduce((sum, g) => sum + g, 0);
  return {
    ev,
    bestResponse,
    gains,
    nashConv,
    nashConvPct: (nashConv / (n * spot.investment)) * 100,
    compatibleDeals: tuples.length,
    queriedInformationSets: policyCache.size,
    untrainedInformationSets: untrained.size,
    visits,
  };
}
