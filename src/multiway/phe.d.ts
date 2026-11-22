declare module "phe" {
  /** Evaluates 5–7 distinct cards. Lower scores represent stronger hands. */
  export function evaluateCardCodes(cards: number[]): number;
  export function handRank(score: number): number;
  export function cardCode(rank: string, suit: string): number;
}
