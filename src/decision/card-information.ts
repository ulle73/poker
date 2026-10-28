import { parseRange } from "./sampler";

/** Permutations preserve each player's weighted prior. No rank/strength bucketing. */
export interface CardInformation {
  permutations: readonly (readonly number[])[];
  cache?: Map<number, number>;
  cacheLimit?: number;
}
const permutations: number[][] = [];
for (let a = 0; a < 4; a++)
  for (let b = 0; b < 4; b++)
    if (b !== a)
      for (let c = 0; c < 4; c++)
        if (c !== a && c !== b) permutations.push([a, b, c, 6 - a - b - c]);
const identity = [0, 1, 2, 3];
const transform = (card: number, permutation: readonly number[]) =>
  (card & ~3) | permutation[card & 3];
const pairKey = (a: number, b: number) => Math.min(a, b) * 52 + Math.max(a, b);

export function createCardInformation(
  ranges: readonly string[],
  cacheLimit = 50000,
): CardInformation {
  const distributions = ranges
    .filter((range) => range.trim())
    .map(
      (range) =>
        new Map(
          parseRange(range).map((combo) => [
            pairKey(combo.cards[0], combo.cards[1]),
            combo.weight,
          ]),
        ),
    );
  const allowed = permutations.filter((permutation) =>
    distributions.every((distribution) => {
      for (const [key, weight] of distribution) {
        const a = Math.floor(key / 52),
          b = key % 52;
        const moved =
          distribution.get(
            pairKey(transform(a, permutation), transform(b, permutation)),
          ) ?? 0;
        if (weight !== moved) return false;
      }
      return true;
    }),
  );
  return { permutations: allowed, cache: new Map(), cacheLimit };
}

/** Physical root hands in the same information-set orbit. A permissible
 * relabeling must also preserve the already fixed public board. */
export function rootCardOrbit(
  own: readonly number[],
  board: readonly number[],
  information: CardInformation,
): number[][] {
  const ordered = (cards: readonly number[]) =>
    [...cards.slice(0, 3)].sort((a, b) => a - b).concat(cards.slice(3));
  const original = ordered(board),
    orbit = new Map<number, number[]>();
  for (const permutation of information.permutations) {
    const moved = ordered(board.map((card) => transform(card, permutation)));
    if (moved.some((card, i) => card !== original[i])) continue;
    const pair = own
      .map((card) => transform(card, permutation))
      .sort((a, b) => a - b);
    orbit.set(pairKey(pair[0], pair[1]), pair);
  }
  return [...orbit.values()];
}

/** Seven six-bit card digits fit exactly in a JS number. The first three board
 * cards are one unordered flop; later cards retain their reveal order. */
function pack(
  own: readonly number[],
  board: readonly number[],
  permutation: readonly number[],
): number {
  const a = transform(own[0], permutation),
    b = transform(own[1], permutation);
  let value = (Math.min(a, b) + 1) * 64 + Math.max(a, b) + 1;
  if (board.length >= 3) {
    let x = transform(board[0], permutation),
      y = transform(board[1], permutation),
      z = transform(board[2], permutation);
    if (x > y) [x, y] = [y, x];
    if (y > z) [y, z] = [z, y];
    if (x > y) [x, y] = [y, x];
    value = ((value * 64 + x + 1) * 64 + y + 1) * 64 + z + 1;
  }
  for (let i = 3; i < board.length; i++)
    value = value * 64 + transform(board[i], permutation) + 1;
  return value;
}
/** Caller supplies only visible cards. Hidden players and future runouts are
 * deliberately absent. A simultaneous suit relabeling retains blocker/draw facts. */
export function cardInformationKey(
  own: readonly number[],
  visibleBoard: readonly number[],
  information: CardInformation,
): number {
  const raw = pack(own, visibleBoard, identity),
    saved = information.cache?.get(raw);
  if (saved !== undefined) return saved;
  let key = raw;
  for (const permutation of information.permutations)
    key = Math.min(key, pack(own, visibleBoard, permutation));
  if (
    information.cache &&
    information.cache.size < (information.cacheLimit ?? 50000)
  )
    information.cache.set(raw, key);
  return key;
}
