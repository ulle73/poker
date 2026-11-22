import { cardCode, evaluateCardCodes, handRank } from "phe";
import { handClass } from "../core/cards";
import { evaluate5, evaluate7 } from "../shortdeck/audit";

const holdemNames = ["Färgstege", "Fyrtal", "Kåk", "Färg", "Stege", "Triss", "Tvåpar", "Par", "Högt kort"];
const shortNames = ["Högt kort", "Par", "Tvåpar", "Stege", "Triss", "Kåk", "Färg", "Fyrtal", "Färgstege"];

function shortScore(cards: string[]) {
  if (cards.length === 5) return evaluate5(cards);
  if (cards.length === 7) return evaluate7(cards);
  return Math.max(...cards.map((_, i) => evaluate5(cards.filter((_, j) => i !== j))));
}

export function currentStrength(hero: string[], board: string[], dead: string[] = [], short = false) {
  const ranks = short ? "6789TJQKA" : "23456789TJQKA";
  const known = [...hero, ...board, ...dead];
  if (hero.length !== 2 || ![0, 3, 4, 5].includes(board.length) ||
      known.some(c => !/^[2-9TJQKA][shdc]$/.test(c) || !ranks.includes(c[0])) ||
      new Set(known).size !== known.length) return null;
  if (!board.length) return { category: handClass(hero.join("")), counts: null };
  const remaining = [...ranks].flatMap(r => [..."shdc"].map(s => r+s)).filter(c => !known.includes(c));
  const codes = board.map(c => cardCode(c[0], c[1]));
  const score = (a: string, b: string) => short ? shortScore([...board, a, b])
    : -evaluateCardCodes([...codes, cardCode(a[0], a[1]), cardCode(b[0], b[1])]);
  const mine = score(hero[0], hero[1]);
  const category = short ? shortNames[Math.floor(mine / 15 ** 5)] : holdemNames[handRank(-mine)];
  const counts = { stronger: 0, equal: 0, weaker: 0 };
  for (let i = 0; i < remaining.length; i++) {
    for (let j = i + 1; j < remaining.length; j++) {
      const theirs = score(remaining[i], remaining[j]);
      counts[theirs > mine ? "stronger" : theirs < mine ? "weaker" : "equal"]++;
    }
  }
  return { category, counts };
}
