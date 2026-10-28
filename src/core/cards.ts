export const RANKS = "AKQJT98765432";
export const SUITS: Record<string, string> = {
  s: "♠", // taste-skill-ignore: literal poker card suit data.
  h: "♥", // taste-skill-ignore: literal poker card suit data.
  d: "♦", // taste-skill-ignore: literal poker card suit data.
  c: "♣", // taste-skill-ignore: literal poker card suit data.
}; // taste-skill-ignore: card suits are actual poker data.

export function normalizeCards(input: string | string[]): string[] {
  const text = Array.isArray(input) ? input.join(" ") : input;
  if (typeof text !== "string" || text.length > 180)
    throw new Error("Ogiltig kortlista.");
  const normalized = text
    .replace(/10/gi, "T")
    .replace(/♠/g, "s") // taste-skill-ignore: literal poker card suit data.
    .replace(/♥/g, "h") // taste-skill-ignore: literal poker card suit data.
    .replace(/♦/g, "d") // taste-skill-ignore: literal poker card suit data.
    .replace(/♣/g, "c") // taste-skill-ignore: literal poker card suit data.
    .replace(/[\s,]+/g, ""); // taste-skill-ignore: parse actual card suits.
  if (!normalized || !/^([2-9tjqka][shdc])+$/i.test(normalized))
    throw new Error("Ange kort som Ah Kd Qc.");
  const cards = normalized
    .match(/../g)!
    .map((c) => c[0].toUpperCase() + c[1].toLowerCase());
  if (new Set(cards).size !== cards.length)
    throw new Error("Dubbla kort är inte tillåtna.");
  return cards;
}
export function handKey(cards: string[] | string): string {
  return normalizeCards(cards).sort().join("");
}
export function handClass(cards: string): string {
  const [a, b] = normalizeCards(cards);
  const [h, l] = RANKS.indexOf(a[0]) < RANKS.indexOf(b[0]) ? [a, b] : [b, a];
  return h[0] + l[0] + (h[0] === l[0] ? "" : h[1] === l[1] ? "s" : "o");
}
