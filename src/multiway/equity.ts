import { cardCode, evaluateCardCodes } from "phe";

import { parseRange, prior, draw } from "./ranges";

export interface EquityConfig {
  hero: string[];
  board: string[];
  /** Total active players, including hero; folded seats are excluded. */
  playerCount: number;
  opponentRanges?: string[];
  deadCards?: string[];
  exactHeadsUp?: boolean;
  samples?: number;
  seed?: number;
  maxTimeMs?: number;
  /** Opponents in seat order, excluding hero. null means unknown. */
  knownOpponents?: (string[] | null)[];
}

export interface EquityResult {
  /** Expected share of an equally contested showdown pot, including splits. */
  equity: number;
  /** Min/max pot share in half-runouts over individual possible opponent hands. */
  bounds?: { minimum: number; maximum: number; denominator: number; combinations: number };
  winFraction: number;
  /** Hero shares first place with at least one opponent. */
  tieFraction: number;
  standardError: number;
  /** Normal-approximation sampling error; excludes opponent-model uncertainty. */
  confidence95HalfWidth: number;
  samples: number;
  requestedSamples: number;
  elapsedMs: number;
  playerCount: number;
  method: "monte-carlo" | "exact";
  /** Assumption: unknown opponents hold uniformly random legal card pairs. */
  opponentsModel: "uniform" | "weighted";
  timedOut: boolean;
}

/** Mulberry32: deterministic across worker/browser/Node executions. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Partial Fisher–Yates; the first count cards form an ordered legal deal. */
export function shufflePrefix(
  deck: number[],
  count: number,
  random: () => number,
): void {
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(random() * (deck.length - i));
    const card = deck[i];
    deck[i] = deck[j];
    deck[j] = card;
  }
}

function parseCards(cards: string[], label: string): number[] {
  if (!Array.isArray(cards)) throw new Error(`${label}: ange en kortlista.`);
  return cards.map((card) => {
    if (typeof card !== "string" || !/^[2-9TJQKA][shdc]$/i.test(card))
      throw new Error(
        `${label}: ogiltigt kort. Använd exempelvis Ah eller Td.`,
      );
    return cardCode(card[0].toUpperCase(), card[1].toLowerCase());
  });
}

/**
 * Showdown equity only: no betting, ranges, side pots, strategy or Nash/GTO claim.
 * Unknown cards are sampled without replacement, jointly across all seats and
 * missing board cards. Reported uncertainty describes Monte Carlo sampling only.
 */
export function calculateEquity(config: EquityConfig): EquityResult {
  const started = Date.now();
  if (
    !config ||
    !Number.isInteger(config.playerCount) ||
    config.playerCount < 2 ||
    config.playerCount > 10
  )
    throw new Error("Ange 2–10 aktiva spelare inklusive dig själv.");
  const hero = parseCards(config.hero, "Dina kort");
  const board = parseCards(config.board, "Bordet");
  if (hero.length !== 2) throw new Error("Ange exakt två egna kort.");
  if (![0, 3, 4, 5].includes(board.length))
    throw new Error("Bordet måste ha 0, 3, 4 eller 5 kort.");
  const opponents = config.knownOpponents ?? [];
  if (!Array.isArray(opponents) || opponents.length > config.playerCount - 1)
    throw new Error("För många kända motståndarhänder.");
  const known = Array.from({ length: config.playerCount - 1 }, (_, i) => {
    if (opponents[i] === null || opponents[i] === undefined) return null;
    const cards = parseCards(opponents[i]!, "Motståndarens kort");
    if (cards.length !== 2)
      throw new Error("En känd motståndare måste ha exakt två kort.");
    return cards;
  });
  const blocked = [...hero, ...board, ...parseCards(config.deadCards ?? [], "Övriga visade kort"), ...known.flatMap((cards) => cards ?? [])];
  if (new Set(blocked).size !== blocked.length)
    throw new Error(
      "Dubbla kort är inte tillåtna, även mellan olika spelare och bordet.",
    );
  const sampleLimit = config.samples ?? 8000;
  if (!Number.isInteger(sampleLimit) || sampleLimit < 1)
    throw new Error("Antalet simuleringar måste vara ett positivt heltal.");
  const requestedSamples = Math.min(50000, Math.max(1000, sampleLimit));
  const seed = config.seed ?? 0x47544f;
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error(
      "Slumpfröet måste vara ett heltal mellan 0 och 4294967295.",
    );
  const budget = config.maxTimeMs ?? 1500;
  if (!Number.isFinite(budget) || budget <= 0)
    throw new Error("Tidsgränsen måste vara positiv.");
  const maxTimeMs = Math.min(5000, Math.max(50, budget));
  const random = createSeededRandom(seed);
  const blockedSet = new Set(blocked);
  const deck = Array.from({ length: 52 }, (_, i) => i).filter(
    (card) => !blockedSet.has(card),
  );
  const missingBoard = 5 - board.length;
  const drawCount =
    missingBoard + known.filter((cards) => cards === null).length * 2;
  if (deck.length < drawCount) throw Error("För få okända kort för given.");
  const ranges = config.opponentRanges ?? [];
  if (ranges.length > known.length) throw Error("För många motståndarranger.");
  const priors = known.map((cards, seat) => !cards && ranges[seat]?.trim()
    ? prior(parseRange(ranges[seat], blocked)) : null);
  const weighted = priors.some(Boolean);
  if (config.exactHeadsUp && known.length === 1 && board.length >= 3) {
    const combos = known[0] ? [{ cards: known[0], weight: 1 }] :
      (priors[0]?.combos ?? parseRange("", blocked));
    const final = [...board, ...Array(missingBoard).fill(0), ...hero];
    let total = 0, wins = 0, ties = 0, deals = 0;
    let minimum = Infinity, maximum = -Infinity, denominator = 0;
    for (const { cards, weight } of combos) {
      const available = deck.filter(card => !cards.includes(card));
      let halves = 0, runouts = 0;
      const evaluate = () => {
        final[5] = hero[0]; final[6] = hero[1];
        const mine = evaluateCardCodes(final);
        final[5] = cards[0]; final[6] = cards[1];
        const other = evaluateCardCodes(final);
        if (mine < other) wins += weight;
        if (mine === other) ties += weight;
        halves += mine < other ? 2 : mine === other ? 1 : 0;
        runouts++; deals++; total += weight;
      };
      if (!missingBoard) evaluate();
      else for (let i = 0; i < available.length; i++) {
        final[board.length] = available[i];
        if (missingBoard === 1) evaluate();
        else for (let j = i + 1; j < available.length; j++) {
          final[4] = available[j]; evaluate();
        }
      }
      denominator = 2 * runouts;
      minimum = Math.min(minimum, halves);
      maximum = Math.max(maximum, halves);
    }
    if (!total) throw Error("Motståndarens range saknar lagliga händer.");
    return { bounds: { minimum, maximum, denominator, combinations: combos.length }, equity: (wins + ties / 2) / total, winFraction: wins / total, tieFraction: ties / total,
      samples: deals, requestedSamples: deals, playerCount: 2, method: "exact",
      opponentsModel: weighted ? "weighted" : "uniform", elapsedMs: Date.now() - started,
      standardError: 0, confidence95HalfWidth: 0, timedOut: false };
  }
  const hand = [...board, ...Array(missingBoard).fill(0), ...hero];
  let samples = 0,
    wins = 0,
    ties = 0,
    mean = 0,
    squaredDeviations = 0;
  for (let sample = 0; sample < requestedSamples; sample++) {
    // Checks are amortized to keep the hot loop small. A worker can additionally
    // be terminated by its caller when superseded or cancelled.
    if (sample > 0 && sample % 128 === 0 && Date.now() - started >= maxTimeMs)
      break;
    let available = deck;
    const holes = known.slice();
    if (weighted) {
      // Redraw the entire independent proposal on collision to preserve joint weights.
      const used = new Set<number>();
      let accepted = false;
      for (let attempt = 0; attempt < 10000; attempt++) {
        used.clear();
        accepted = priors.every((distribution, seat) => {
          if (!distribution) return true;
          const cards = draw(distribution, random).cards;
          if (cards.some(card => used.has(card))) return false;
          for (const card of cards) used.add(card);
          holes[seat] = cards;
          return true;
        });
        if (accepted) break;
        if (attempt % 64 === 0 && Date.now() - started >= maxTimeMs) break;
      }
      if (!accepted) throw Error("Rangerna gav för få gemensamt lagliga givar.");
      available = deck.filter(card => !used.has(card));
    }
    shufflePrefix(available, missingBoard + holes.filter(h => h === null).length * 2, random);
    for (let i = 0; i < missingBoard; i++) hand[board.length + i] = available[i];
    hand[5] = hero[0];
    hand[6] = hero[1];
    const heroScore = evaluateCardCodes(hand);
    let firstPlaceCount = 1;
    let beaten = false;
    let offset = missingBoard;
    for (let seat = 0; seat < known.length; seat++) {
      const cards = holes[seat];
      hand[5] = cards ? cards[0] : available[offset++];
      hand[6] = cards ? cards[1] : available[offset++];
      const opponentScore = evaluateCardCodes(hand);
      if (opponentScore < heroScore) {
        beaten = true;
        break;
      }
      if (opponentScore === heroScore) firstPlaceCount++;
    }
    const share = beaten ? 0 : 1 / firstPlaceCount;
    if (!beaten) {
      if (firstPlaceCount === 1) wins++;
      else ties++;
    }
    samples++;
    // Welford's variance stays zero for a deterministic split such as 1/10.
    const delta = share - mean;
    mean += delta / samples;
    squaredDeviations += delta * (share - mean);
  }
  const standardError =
    samples > 1
      ? Math.sqrt(Math.max(0, squaredDeviations) / (samples - 1) / samples)
      : 0;
  return {
    equity: mean,
    winFraction: wins / samples,
    tieFraction: ties / samples,
    standardError,
    confidence95HalfWidth: 1.96 * standardError,
    samples,
    requestedSamples,
    elapsedMs: Date.now() - started,
    playerCount: config.playerCount,
    method: "monte-carlo",
    opponentsModel: weighted ? "weighted" : "uniform",
    timedOut: samples < requestedSamples,
  };
}
