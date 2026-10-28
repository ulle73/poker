import { cardCode } from "phe";
import { createSeededRandom, shufflePrefix } from "../multiway/equity";
import type { DecisionInput, SampledDeal } from "./types";
export interface Combo {
  cards: number[];
  weight: number;
}
const RANKS = "23456789TJQKA";
const SUITS = "shdc";
interface Shape {
  high: number;
  low: number;
  suit: "" | "s" | "o";
  exact?: number[];
}
function parseCard(text: string): number {
  if (typeof text !== "string" || !/^[2-9TJQKA][shdc]$/i.test(text))
    throw new Error(`Invalid card: ${String(text)}.`);
  return cardCode(text[0].toUpperCase(), text[1].toLowerCase());
}
function comboKey(cards: readonly number[]): number {
  return Math.min(cards[0], cards[1]) * 52 + Math.max(cards[0], cards[1]);
}
function shape(text: string): Shape {
  if (/^[2-9TJQKA][shdc][2-9TJQKA][shdc]$/i.test(text)) {
    const cards = [parseCard(text.slice(0, 2)), parseCard(text.slice(2))].sort(
      (a, b) => a - b,
    );
    if (cards[0] === cards[1])
      throw new Error("An exact combo must contain two different cards.");
    return { high: 0, low: 0, suit: "", exact: cards };
  }
  const match = /^([2-9TJQKA])([2-9TJQKA])([so]?)$/i.exec(text);
  if (!match) throw new Error(`Invalid range token: ${text}.`);
  const first = RANKS.indexOf(match[1].toUpperCase()),
    second = RANKS.indexOf(match[2].toUpperCase());
  const suit = match[3].toLowerCase() as Shape["suit"];
  if (first === second && suit)
    throw new Error("A pair cannot have a suited/offsuit suffix.");
  return { high: Math.max(first, second), low: Math.min(first, second), suit };
}
function expand(text: string): Shape[] {
  if (text.endsWith("+")) {
    const base = shape(text.slice(0, -1));
    if (base.exact)
      throw new Error("An exact combo cannot have a plus suffix.");
    const result: Shape[] = [];
    for (
      let rank = base.low;
      rank <= (base.high === base.low ? 12 : base.high - 1);
      rank++
    )
      result.push(
        base.high === base.low
          ? { ...base, high: rank, low: rank }
          : { ...base, low: rank },
      );
    return result;
  }
  if (text.includes("-")) {
    const ends = text.split("-");
    if (ends.length !== 2) throw new Error(`Invalid dash range: ${text}.`);
    const a = shape(ends[0]),
      b = shape(ends[1]);
    if (a.exact || b.exact || a.suit !== b.suit)
      throw new Error(`Incompatible dash range: ${text}.`);
    const pair = a.high === a.low && b.high === b.low;
    const fixedHigh = a.high === b.high && a.low < a.high && b.low < b.high;
    const diagonal = a.high - a.low === b.high - b.low;
    if (!pair && !fixedHigh && !diagonal)
      throw new Error(`Incompatible dash range: ${text}.`);
    const steps = Math.max(Math.abs(a.high - b.high), Math.abs(a.low - b.low)),
      result: Shape[] = [];
    for (let i = 0; i <= steps; i++)
      result.push({
        high: a.high + i * Math.sign(b.high - a.high),
        low: a.low + i * Math.sign(b.low - a.low),
        suit: a.suit,
      });
    return result;
  }
  return [shape(text)];
}
/** Standard hold'em notation: AA, AKs, AKo, TT+, A2s+, exact combos and dash ranges.
 * Weights are 0..1; later entries override earlier entries, including zero.
 * Only the supplied public blockers are removed. Empty text means all combos.
 */
export function parseRange(
  text: string,
  blockedCards: readonly number[] = [],
): Combo[] {
  if (typeof text !== "string") throw new Error("A range must be text.");
  if (blockedCards.some((c) => !Number.isInteger(c) || c < 0 || c >= 52))
    throw new Error("Invalid range blocker.");
  const blocked = new Set(blockedCards),
    weights = new Map<number, Combo>();
  const add = (a: number, b: number, weight: number) => {
    if (a === b || blocked.has(a) || blocked.has(b)) return;
    const cards = a < b ? [a, b] : [b, a];
    weights.set(comboKey(cards), { cards, weight });
  };
  if (!text.trim()) {
    for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) add(a, b, 1);
  } else {
    const tokens = text
      .trim()
      .replace(/\s*:\s*/g, ":")
      .split(/[,;\s]+/)
      .filter(Boolean);
    if (!tokens.length) throw new Error("The explicit range is empty.");
    for (const token of tokens) {
      const parts = token.split(":");
      if (
        parts.length > 2 ||
        (parts.length === 2 && !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(parts[1]))
      )
        throw new Error(`Invalid range weight: ${token}.`);
      const weight = parts.length === 2 ? Number(parts[1]) : 1;
      if (!Number.isFinite(weight) || weight < 0 || weight > 1)
        throw new Error("Range weights must be between 0 and 1.");
      for (const item of expand(parts[0])) {
        if (item.exact) {
          add(item.exact[0], item.exact[1], weight);
          continue;
        }
        for (let a = 0; a < SUITS.length; a++)
          for (let b = 0; b < SUITS.length; b++) {
            if (item.high === item.low && a >= b) continue;
            if (
              (item.suit === "s" && a !== b) ||
              (item.suit === "o" && a === b)
            )
              continue;
            add(item.high * 4 + a, item.low * 4 + b, weight);
          }
      }
    }
  }
  return [...weights.values()]
    .filter((combo) => combo.weight > 0)
    .sort((a, b) => comboKey(a.cards) - comboKey(b.cards));
}
interface Prior {
  combos: Combo[];
  cumulative: number[];
  total: number;
}
function prior(combos: Combo[]): Prior {
  const cumulative: number[] = [];
  let total = 0;
  for (const combo of combos) {
    total += combo.weight;
    cumulative.push(total);
  }
  if (!combos.length || !Number.isFinite(total) || total <= 0)
    throw new Error("A range has no legal unblocked combos.");
  return { combos, cumulative, total };
}
function draw(distribution: Prior, random: () => number): Combo {
  const target = random() * distribution.total;
  let lo = 0,
    hi = distribution.combos.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (target < distribution.cumulative[mid]) hi = mid;
    else lo = mid + 1;
  }
  return distribution.combos[lo];
}
/** Samples product range priors conditioned on card uniqueness, plus a uniform
 * runout. The root class C is oversampled by q(h)=.5*p(h)+.5*p(h|C).
 * By default C contains only the actual physical hand. A solver using exact
 * card isomorphism supplies the whole equivalent root class to reduce variance.
 * Every rejection redraws the ENTIRE proposal, including hero, so p(hero)/q(hero)
 * corrects the joint sample up to a constant acceptance normalizer. Opponent
 * priors never block the actual root hand; they see only the sampled hero hand.
 */
export function createDealSampler(
  input: DecisionInput,
  seed: number,
  rootClass?: readonly (readonly number[])[],
): () => SampledDeal {
  const count = input.seats.length,
    hero = input.hero;
  if (count < 2 || count > 10 || new Set(input.seats).size !== count)
    throw new Error("Sampling requires 2–10 distinct seats.");
  if (!Number.isInteger(hero) || hero < 0 || hero >= count)
    throw new Error("Invalid hero seat index.");
  if (!Array.isArray(input.ranges) || input.ranges.length !== count)
    throw new Error("Provide one range per seat.");
  if (!Array.isArray(input.heroCards) || input.heroCards.length !== 2)
    throw new Error("Provide exactly two hero cards.");
  if (!Array.isArray(input.board) || ![0, 3, 4, 5].includes(input.board.length))
    throw new Error("Board must contain 0, 3, 4 or 5 cards.");
  if (!Number.isFinite(seed)) throw new Error("Invalid random seed.");
  const actual = input.heroCards.map(parseCard).sort((a, b) => a - b),
    board = input.board.map(parseCard);
  if (new Set([...actual, ...board]).size !== 2 + board.length)
    throw new Error("Known cards must be unique.");
  if (input.state.boardCount !== board.length)
    throw new Error("Board count does not match the betting state.");
  const priors = input.ranges.map((text) => prior(parseRange(text, board)));
  const actualKey = comboKey(actual),
    actualCombo = priors[hero].combos.find(
      (combo) => comboKey(combo.cards) === actualKey,
    );
  const actualProbability = actualCombo
    ? actualCombo.weight / priors[hero].total
    : 0;
  if (!(actualProbability > 0))
    throw new Error(
      "The actual hero hand must have positive weight in the hero prior.",
    );
  const rootKeys = new Set<number>();
  for (const hand of rootClass ?? [actual]) {
    if (
      hand.length !== 2 ||
      hand[0] === hand[1] ||
      hand.some(
        (card) =>
          !Number.isInteger(card) ||
          card < 0 ||
          card >= 52 ||
          board.includes(card),
      )
    )
      throw new Error("Invalid oversampled root class.");
    rootKeys.add(comboKey(hand));
  }
  const representedKeys = new Set(
    priors[hero].combos.map((combo) => comboKey(combo.cards)),
  );
  if (
    !rootKeys.has(actualKey) ||
    [...rootKeys].some((key) => !representedKeys.has(key))
  )
    throw new Error(
      "The oversampled root class must contain the actual hand and only positive-weight prior hands.",
    );
  const rootPrior = prior(
    priors[hero].combos.filter((combo) => rootKeys.has(comboKey(combo.cards))),
  );
  const rootProbability = rootPrior.total / priors[hero].total;
  const random = createSeededRandom(seed),
    boardSet = new Set(board);
  const publicDeck = Array.from({ length: 52 }, (_, i) => i).filter(
    (c) => !boardSet.has(c),
  );
  const uniform = input.ranges.every((text) => !text.trim());
  const chooseHero = () =>
    random() < 0.5
      ? rootPrior.combos.length === 1
        ? rootPrior.combos[0]
        : draw(rootPrior, random)
      : draw(priors[hero], random);
  const importance = (combo: Combo) =>
    rootKeys.has(comboKey(combo.cards))
      ? rootProbability / (0.5 + 0.5 * rootProbability)
      : 2;
  const complete = (
    holes: number[][],
    used: Set<number>,
    heroCombo: Combo,
  ): SampledDeal => {
    const deck = publicDeck.filter((c) => !used.has(c));
    shufflePrefix(deck, 5 - board.length, random);
    return {
      holes,
      runout: [...board, ...deck.slice(0, 5 - board.length)],
      importance: importance(heroCombo),
    };
  };
  if (uniform)
    return () => {
      // Conditional uniform opponents have the same normalizer for every hero
      // combo, so drawing directly without replacement avoids futile rejection.
      const heroCombo = chooseHero(),
        used = new Set(heroCombo.cards),
        holes: number[][] = Array(count);
      holes[hero] = [...heroCombo.cards];
      const deck = publicDeck.filter((c) => !used.has(c));
      shufflePrefix(deck, 2 * (count - 1) + 5 - board.length, random);
      let offset = 0;
      for (let seat = 0; seat < count; seat++)
        if (seat !== hero) {
          holes[seat] = deck.slice(offset, offset + 2);
          offset += 2;
        }
      return {
        holes,
        runout: [...board, ...deck.slice(offset, offset + 5 - board.length)],
        importance: importance(heroCombo),
      };
    };
  return () => {
    const deadline = Date.now() + 100;
    for (let attempt = 0; attempt < 10000; attempt++) {
      if (attempt % 64 === 0 && Date.now() > deadline) break;
      const heroCombo = chooseHero(),
        holes: number[][] = Array(count),
        used = new Set(heroCombo.cards);
      holes[hero] = [...heroCombo.cards];
      let collision = false;
      for (let seat = 0; seat < count; seat++)
        if (seat !== hero) {
          const combo = draw(priors[seat], random),
            [a, b] = combo.cards;
          if (used.has(a) || used.has(b)) {
            collision = true;
            break;
          }
          holes[seat] = [a, b];
          used.add(a);
          used.add(b);
        }
      if (!collision) return complete(holes, used, heroCombo);
    }
    throw new Error(
      "Unable to sample a legal compatible joint deal; ranges overlap too tightly or have no compatible deal.",
    );
  };
}
