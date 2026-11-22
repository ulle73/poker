import type { DecisionProvider, ProviderInfo } from "./providers";
import type { DecisionInput, DecisionResult } from "./types";
import type { LiveSnapshot } from "../live/types";
import { LIVE_DECISION_MS } from "./quality";
import type { EquityResult } from "../multiway/equity";
import { legalActions } from "./betting";

export const FLOP_ALL_IN: ProviderInfo = {
  id: "flop-all-in", name: "Exakt all-in-jämförelse", cost: "free", variants: ["holdem"], streets: ["flop"],
  coverage: "2–6 spelare. Avslutande syn eller fold när samma val är bättre mot alla lagliga motståndarhänder.",
};

export function allInPrice(input: DecisionInput) {
  const { hero, state, rootKinds } = input;
  const count = input.seats.length;
  if (count < 2 || count > 6 || state.street !== "flop" || input.board.length !== 3 ||
      !rootKinds?.includes("fold") || !rootKinds.includes("call") || rootKinds.length !== 2) return null;
  const highest = Math.max(...state.bets);
  const call = highest - state.bets[hero];
  if (call <= 0 || state.stacks[hero] <= 0) return null;
  for (let seat = 0; seat < count; seat++) {
    if (seat === hero) continue;
    if (count === 2 && state.stacks[seat] > 0 && state.stacks[hero] > call) return null;
    // Equal, positive flop commitments by every rival exclude earlier all-ins
    // and unobservable side pots among the dealt players accepted below.
    if (count > 2 && (state.stacks[seat] !== 0 || state.bets[seat] !== highest)) return null;
  }
  const cost = Math.min(call, state.stacks[hero]);
  const pot = state.deadPot + (state.bets[hero] + cost) * count;
  return { cost, pot };
}

export function provenChoice(input: DecisionInput, bounds: EquityResult["bounds"]) {
  const price = allInPrice(input);
  // C(47,2) villain hands, C(45,2) runouts each. A win counts twice and a tie once.
  if (!price || !bounds || bounds.combinations !== 1081 || bounds.denominator !== 1980 ||
      !Number.isInteger(bounds.minimum) || !Number.isInteger(bounds.maximum) ||
      bounds.minimum < 0 || bounds.maximum > 1980 || bounds.minimum > bounds.maximum) return null;
  const rivals = input.seats.length - 1;
  const remaining = 47 - 2 * rivals;
  const denominator = remaining * (remaining - 1); // twice C(remaining, 2)
  // Fix any compatible joint assignment. Its runouts are a subset of each
  // rival's HU runouts. On every runout our multiway share is at most each HU
  // share. Its deficit from 1 is at most the sum of HU deficits, even on ties.
  const minimum = Math.max(0, denominator - rivals * (1980 - bounds.minimum));
  const maximum = Math.min(denominator, bounds.maximum);
  if (BigInt(minimum) * BigInt(price.pot) > BigInt(price.cost) * BigInt(denominator)) return "call";
  if (BigInt(maximum) * BigInt(price.pot) < BigInt(price.cost) * BigInt(denominator)) return "fold";
  return null;
}

export class FlopAllInProvider implements DecisionProvider {
  readonly info = FLOP_ALL_IN;
  private pending?: () => void;
  cancel() { this.pending?.(); }
  unsupportedReason(s: LiveSnapshot, input: DecisionInput) {
    if (input.rootKinds?.includes("check") && input.state.currentBet === 0)
      return "För den här floppen saknas en strategi som jämför check och satsning. Equity visar din förväntade andel av potten vid showdown mot vald range.";
    return allInPrice(input) && s.players.filter(p => !p.sittingOut).length === input.seats.length
      ? null : "All-in-jämförelsen kräver en avslutande syn eller fold. Med 3–6 utdelade måste alla motståndare vara kvar och all-in för samma insats på floppen.";
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
      limitations: ["Varje möjlig enskild motståndarhand prövas på alla lagliga turn- och riverkort. Vid flera motståndare begränsas den gemensamma pottandelen konservativt med hänsyn till blockerade kort och delade potter."] };
  }
}
