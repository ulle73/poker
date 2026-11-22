import { parseCard, comboKey, prior, draw, parseRange, type Combo } from "../multiway/ranges";
export { parseRange, type Combo } from "../multiway/ranges";
import { createSeededRandom, shufflePrefix } from "../multiway/equity";
import type { DecisionInput, SampledDeal } from "./types";
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
  heroOversampling = 0.5,
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
  if (!Number.isFinite(heroOversampling) || heroOversampling < 0 || heroOversampling >= 1)
    throw new Error("Hero oversampling must be in [0, 1).");
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
    random() < heroOversampling
      ? rootPrior.combos.length === 1
        ? rootPrior.combos[0]
        : draw(rootPrior, random)
      : draw(priors[hero], random);
  const importance = (combo: Combo) =>
    rootKeys.has(comboKey(combo.cards))
      ? rootProbability / (heroOversampling + (1 - heroOversampling) * rootProbability)
      : 1 / (1 - heroOversampling);
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
