import {cardCode} from "phe";
import {applyAction, legalActions} from "../decision/betting";
import type {BettingAction, DecisionInput} from "../decision/types";
import type {LiveSnapshot} from "../live/types";
import three from "./qualified-3-way.json";
import four from "./qualified-4-way.json";

const profiles = new Map([[3, three], [4, four]]);
const suits = "cdhs";
const validCard = /^[2-9TJQKA][cdhs]$/;
const chips = (money: number | null, unit: number) => {
  const rounded = Math.round(Number(money) / unit);
  return money !== null && Math.abs(money - rounded * unit) < 1e-7 ? rounded : NaN;
};
const same = <T>(a: readonly T[], b: readonly T[]) =>
  a.length === b.length && a.every((value, i) => value === b[i]);

function suitMap(board: string[], source: string[]) {
  const mapping = new Map<string, string>();
  for (const [rank, suit] of board) {
    const target = source.find(card => card[0] === rank)?.[1];
    if (!target || (mapping.has(suit) ? mapping.get(suit) !== target :
      [...mapping.values()].includes(target))) return;
    mapping.set(suit, target);
  }
  for (const suit of suits) if (!mapping.has(suit)) {
    mapping.set(suit, [...suits].find(next => ![...mapping.values()].includes(next))!);
  }
  return (card: string) => card[0] + mapping.get(card[1]);
}

function readRow(profile: typeof three, hand: string[]) {
  const [a, b] = hand.map(card => cardCode(card[0], card[1])).sort((x, y) => x - y);
  const key = a * 52 + b;
  const table = new DataView(Uint8Array.from(atob(profile.rows), byte => byte.charCodeAt(0)).buffer);
  const stride = 8 * (1 + profile.actions.length);
  let low = 0, high = table.byteLength / stride;
  while (low < high) {
    const offset = Math.floor((low + high) / 2) * stride;
    const current = table.getFloat64(offset, true);
    if (current === key) {
      return profile.actions.map((_, i) => table.getFloat64(offset + 8 * (i + 1), true));
    }
    if (current < key) low = offset / stride + 1;
    else high = offset / stride;
  }
}

/** Match the observed prefix to the saved decision root. The audit applies to
 * the root model's uniform joint deal and fixed sizing menu. */
export function qualifiedFlopReview(frames: LiveSnapshot[], input: DecisionInput) {
  const snapshot = frames.at(-1);
  const profile = profiles.get(input.seats.length);
  const pre = input.preflop;
  if (!snapshot || snapshot.variant !== "holdem" || !profile || input.state.street !== "flop" ||
      !pre || pre.error || pre.handId !== snapshot.handId || pre.readerId !== snapshot.readerId ||
      pre.bigBlind !== profile.state.minBet || input.hero !== profile.state.actor ||
      input.ranges.some(range => range.trim()) || !same(input.state.stacks, profile.state.stacks) ||
      !same(input.state.bets, profile.state.bets) || input.state.deadPot !== profile.state.deadPot ||
      input.board.length !== 3 || input.heroCards.length !== 2 ||
      new Set([...input.board, ...input.heroCards]).size !== 5 ||
      [...input.board, ...input.heroCards].some(card => !validCard.test(card))) return;
  const mapSuit = suitMap(input.board, profile.board);
  if (!mapSuit || !same(input.board.map(mapSuit).sort(), [...profile.board].sort())) return;

  const flopStacks = profile.state.stacks.map((stack, i) => stack + profile.state.bets[i]);
  const money = (amount: number | null) => chips(amount, input.chipUnit);
  const previous = [...frames].reverse().find(frame => frame.valid && frame.street === "preflop");
  if (!previous || money(previous.pot) !== profile.state.deadPot ||
      !same([...previous.heroCards].sort(), [...snapshot.heroCards].sort()) ||
      previous.dealerSeat !== snapshot.dealerSeat || previous.currency !== snapshot.currency) return;
  const paid = input.seats.map((seat, i) => pre.startingStacks[seat] - flopStacks[i]);
  if (paid.some(p => !Number.isSafeInteger(p) || p < pre.bigBlind! || p !== paid[0]) ||
      previous.players.filter(p => p.inHand && !p.folded).length !== input.seats.length ||
      input.seats.some((seat, i) => {
        const p = previous.players.find(player => player.seat === seat);
        return !p || p.folded || !p.inHand || money(p.stack) !== flopStacks[i] || money(p.bet) !== paid[i];
      })) return;

  let state = { ...profile.state, street: "flop" as const, pending: flopStacks.map(() => true),
    canRaise: flopStacks.map(() => true), stacks: flopStacks, bets: flopStacks.map(() => 0),
    invested: flopStacks.map(() => 0), actor: 0, currentBet: 0, lastFullRaise: pre.bigBlind,
    raises: 0, history: "" };
  const advance = (kind: BettingAction["kind"], to: number) => {
    const action = legalActions(state, profile.rules).find(a => a.kind === kind && a.to === to);
    if (!action) return false;
    const next = applyAction(state, action, profile.rules);
    if (next.street !== "flop" || next.terminal) return false;
    state = { ...next, street: "flop" };
    return true;
  };
  let stages = 0;
  for (const frame of frames.slice(frames.indexOf(previous) + 1)) {
    if (!frame.valid) continue;
    if (frame.street !== "flop" || frame.handId !== snapshot.handId || frame.readerId !== snapshot.readerId ||
        frame.dealerSeat !== snapshot.dealerSeat || frame.currency !== snapshot.currency ||
        !same(frame.board, snapshot.board) || !same(frame.heroCards, snapshot.heroCards)) return;
    const seats = frame.players.filter(p => p.inHand && !p.folded);
    if (seats.length !== input.seats.length || seats.find(p => p.hero)?.seat !== input.seats[input.hero]) return;
    const players = input.seats.map(seat => seats.find(p => p.seat === seat));
    if (players.some(p => !p)) return;
    const bets = players.map(p => money(p!.bet));
    const stacks = players.map(p => money(p!.stack));
    if (!same(stacks, flopStacks.map((stack, i) => stack - bets[i])) ||
        money(frame.pot) !== profile.state.deadPot + bets.reduce((sum, bet) => sum + bet, 0)) return;
    if (same(bets, state.bets)) {
      if (!stages) stages = 1;
      continue;
    }
    if (stages === 1 && bets[1] === profile.state.bets[1]) {
      // With the pot intact and no folds, the second seat can open only after the first checks.
      if (!advance("check", 0) || !advance("bet", bets[1])) return;
    } else if (stages === 2 && bets[2] === profile.state.bets[2]) {
      if (!advance("raise", bets[2])) return;
    } else return;
    if (!same(bets, state.bets)) return;
    stages++;
  }
  if (stages !== 3 || state.history !== profile.state.history || state.actor !== input.hero ||
      state.lastFullRaise !== profile.state.lastFullRaise ||
      !same(state.pending, profile.state.pending) || !same(state.canRaise, profile.state.canRaise)) return;
  const actions = legalActions(state, profile.rules);
  if (!same(actions.map(a => a.id), profile.actions.map(a => a.id)) ||
      !actions.every(a => input.rootKinds?.includes(a.kind))) return;
  const frequencies = readRow(profile, input.heroCards.map(mapSuit));
  if (frequencies) return {actions, frequencies, upperPct: profile.upperPct};
}
