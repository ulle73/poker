import type { DecisionProvider, ProviderInfo } from "./providers";
import type { DecisionInput, DecisionResult } from "./types";
import type { LiveSnapshot } from "../live/types";
import { LIVE_DECISION_MS } from "./quality";
import type { EquityResult } from "../multiway/equity";
import { legalActions } from "./betting";

export const POSTFLOP_ALL_IN: ProviderInfo = {
  id: "postflop-all-in", name: "Exakt all-in-jämförelse", cost: "free", variants: ["holdem"], streets: ["flop", "turn", "river"],
  coverage: "2–6 spelare på flop, turn och river. Avslutande syn eller fold när samma val är bättre mot alla lagliga motståndarhänder.",
};

const boardLengths = {preflop: 0, flop: 3, turn: 4, river: 5};
const pairs = (available: number) => available * (available - 1) / 2;
const runouts = (available: number, missing: number) => [1, available, pairs(available)][missing];

export function allInPrice(input: DecisionInput) {
  const { hero, state, rootKinds } = input;
  const count = input.seats.length;
  if (count < 2 || count > 6 || state.street === "preflop" || input.board.length !== boardLengths[state.street] ||
      !rootKinds?.includes("fold") || !rootKinds.includes("call") || rootKinds.length !== 2) return null;
  const highest = Math.max(...state.bets);
  const call = highest - state.bets[hero];
  if (call <= 0 || state.stacks[hero] <= 0) return null;
  for (let seat = 0; seat < count; seat++) {
    if (seat === hero) continue;
    if (count === 2 && state.stacks[seat] > 0 && state.stacks[hero] > call) return null;
    // Equal, positive commitments on this street exclude earlier all-ins
    // and unobservable side pots among the dealt players accepted below.
    if (count > 2 && (state.stacks[seat] !== 0 || state.bets[seat] !== highest)) return null;
  }
  const cost = Math.min(call, state.stacks[hero]);
  const pot = state.deadPot + (state.bets[hero] + cost) * count;
  return Number.isSafeInteger(pot) && Number.isSafeInteger(cost) && pot > cost ? { cost, pot } : null;
}

export function provenChoice(input: DecisionInput, bounds: EquityResult["bounds"]) {
  const price = allInPrice(input);
  if (!price || !bounds) return null;
  const unknown = 52 - input.heroCards.length - input.board.length;
  const missing = 5 - input.board.length;
  // For each possible HU opponent the evaluator counts a win twice and a tie once.
  const headsUp = 2 * runouts(unknown - 2, missing);
  if (bounds.combinations !== pairs(unknown) || bounds.denominator !== headsUp ||
      !Number.isInteger(bounds.minimum) || !Number.isInteger(bounds.maximum) ||
      bounds.minimum < 0 || bounds.maximum > headsUp || bounds.minimum > bounds.maximum) return null;
  const count = input.seats.length;
  const rivals = count - 1;
  let denominator = 2 * runouts(unknown - 2 * rivals, missing);
  // Fix any compatible joint assignment. Its runouts are a subset of each
  // rival's HU runouts. On every runout our multiway share is at most each HU
  // share. Its deficit from 1 is at most the sum of HU deficits, even on ties.
  let minimum = Math.max(0, denominator - rivals * (headsUp - bounds.minimum));
  let maximum = Math.min(denominator, bounds.maximum);
  if (!missing && bounds.minimum === 1) {
    // With no card to come, nobody can beat hero and at worst everyone ties.
    denominator = count;
    minimum = 1;
    maximum = bounds.maximum === 1 ? 1 : count;
  }
  const pot = BigInt(price.pot), cost = BigInt(price.cost), scale = BigInt(denominator);
  const lower = BigInt(minimum) * pot, upper = BigInt(maximum) * pot;
  if (!missing) {
    if (lower / scale > cost) return "call";
    if ((upper + scale - 1n) / scale < cost) return "fold";
    return null;
  }
  // With a card to come the fractional bounds apply to an average over runouts.
  // A split can move each individual payout by strictly less than one chip.
  const unevenSplit = Array.from({ length: rivals }, (_, i) => i + 2).some(size => price.pot % size !== 0);
  if (unevenSplit && minimum < denominator ? lower >= (cost + 1n) * scale : lower > cost * scale) return "call";
  if (unevenSplit && maximum > 0 ? upper <= (cost - 1n) * scale : upper < cost * scale) return "fold";
  return null;
}

export class PostflopAllInProvider implements DecisionProvider {
  readonly info = POSTFLOP_ALL_IN;
  private pending?: () => void;
  cancel() { this.pending?.(); }
  unsupportedReason(s: LiveSnapshot, input: DecisionInput) {
    if (input.state.street === "flop" && input.rootKinds?.includes("check") && input.state.currentBet === 0)
      return "För den här floppen saknas en strategi som jämför check och satsning. Equity visar din förväntade andel av potten vid showdown mot vald range.";
    return allInPrice(input) && s.players.filter(p => !p.sittingOut).length === input.seats.length
      ? null : "All-in-jämförelsen kräver att syn eller fold avslutar satsningen och att alla utdelade är kvar. Med 3–6 spelare måste motståndarna vara all-in för samma insats på gatan.";
  }
  async solve(_s: LiveSnapshot, input: DecisionInput): Promise<DecisionResult | null> {
    const started = performance.now();
    const equity = await new Promise<EquityResult | null>((resolve, reject) => {
      const worker = new Worker(new URL("../multiway/equity-worker.ts", import.meta.url), { type: "module" });
      const stop = () => { clearTimeout(timer); worker.terminate(); this.pending = undefined; };
      const timer = setTimeout(() => { stop(); reject(Error("Tidsgränsen för all-in-jämförelsen överskreds.")); }, LIVE_DECISION_MS);
      this.pending = () => { stop(); resolve(null); };
      worker.onerror = () => { stop(); reject(Error("Handjämförelsen misslyckades.")); };
      worker.onmessage = ({ data }) => {
        stop();
        if (data.error || data.id !== input.key) reject(Error("Handjämförelsen kunde inte verifieras."));
        else resolve(data.result);
      };
      worker.postMessage({ id: input.key, config: { hero: input.heroCards, board: input.board, playerCount: 2, exactHeadsUp: true } });
    });
    const choice = provenChoice(input, equity?.bounds);
    if (!equity) return null;
    if (!choice) throw new RangeError("Gränserna för pottandelen räcker inte för att avgöra syn eller fold mot alla lagliga händer.");
    const best = legalActions(input.state, input.rules).find(a => a.kind === choice);
    if (!best) return null;
    return { key: input.key, rangeRevision: input.rangeRevision, provider: this.info.id,
      quality: "proven-action", bounds: equity.bounds, recommended: 0,
      actions: [{ ...best, frequency: 1, ev: null }], iterations: 0, rootVisits: 0, cutoffCount: 0,
      elapsedMs: performance.now() - started, exploitabilityPct: null,
      assumptions: ["Låtsaspengar, chip-EV utan rake. Potten inkluderar synliga insatser."],
      limitations: ["Varje möjlig enskild motståndarhand prövas med alla återstående brädkort. Vid flera motståndare används försiktiga gränser för gemensam pottandel, blockerade kort och delade potter."] };
  }
}
