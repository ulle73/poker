import { cardCode } from "phe";
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
export function parseCard(text: string): number {
  if (typeof text !== "string" || !/^[2-9TJQKA][shdc]$/i.test(text))
    throw new Error(`Invalid card: ${String(text)}.`);
  return cardCode(text[0].toUpperCase(), text[1].toLowerCase());
}
export function comboKey(cards: readonly number[]): number {
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
export function prior(combos: Combo[]): Prior {
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
export function draw(distribution: Prior, random: () => number): Combo {
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
