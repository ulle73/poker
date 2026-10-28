import { validateConfig } from "../core/config";
import { matchLine, adviceFor } from "../core/strategy";
import type {
  SolveResult,
  TrainingConfig,
  SolvedNode,
  SolvedHand,
} from "../core/types";
import type { LiveSnapshot } from "./types";
import { postflopOrder } from "./positions";
export function liveKey(s: LiveSnapshot): string {
  return JSON.stringify([
    s.readerId,
    s.handId,
    s.valid,
    s.issues,
    s.board,
    s.heroCards,
    s.pot,
    s.currency,
    s.dealerSeat,
    s.heroTurn,
    s.players.map((p) => [
      p.seat,
      p.position,
      p.stack,
      p.bet,
      p.folded,
      p.inHand,
    ]),
  ]);
}
export function prepareLiveSolve(
  s: LiveSnapshot,
  oopRange: string,
  ipRange: string,
  options: { postflop?: boolean } = {},
): { config: TrainingConfig; line: string[]; hero: 0 | 1; key: string } {
  if (!s.valid) throw new Error(s.issues.join(" "));
  if (
    (s.street !== "river" || s.board.length !== 5) &&
    !(options.postflop && s.street === "turn" && s.board.length === 4)
  )
    throw new Error(
      `${s.street === "preflop" ? "Preflop" : s.street === "flop" ? "Flop" : "Turn"} läses live. Solverns verifierade strategitäckning är fortfarande river.`,
    );
  const active = postflopOrder(s);
  if (!active.some((p) => p.hero))
    throw new Error("Du är inte bekräftat aktiv i handen.");
  if (active.length !== 2)
    throw new Error(
      `${active.length} aktiva spelare i potten. Den anslutna GTO-motorn saknar multiway-lösning för detta läge.`,
    );
  if (s.players.some((p) => !p.inHand && !p.folded))
    throw new Error(
      "Ett upptaget sätes deltagande är oklart. Väntar på en verifierad fold eller aktiv hand.",
    );
  if (s.players.some((p) => p.folded && (p.bet ?? 0) > 0))
    throw new Error(
      "En foldad spelares insats på denna gata kräver en verifierad multiway-linje innan heads-up-strategin kan användas.",
    );
  if (!s.heroTurn)
    throw new Error("Inväntar din tur med synliga handlingsknappar.");
  if (!oopRange.trim() || !ipRange.trim())
    throw new Error(
      "Ange båda spelarnas antagna ranger. De går inte att läsa ur motståndarens dolda kort.",
    );
  const [oop, ip] = active;
  if (
    !oop ||
    !ip ||
    s.pot === null ||
    [oop, ip].some(
      (p) => p.stack === null || p.bet === null || p.folded || !p.inHand,
    )
  )
    throw new Error("Positioner, deltagare eller belopp kan inte bekräftas.");
  const bets = [oop.bet!, ip.bet!],
    pot = s.pot - bets[0] - bets[1],
    stack = Math.min(oop.stack! + bets[0], ip.stack! + bets[1]);
  if (pot <= 0 || stack <= 0)
    throw new Error("En positiv startpott och effektiv stack krävs.");
  if (bets[0] > 0 && bets[1] > 0)
    throw new Error(
      "Båda spelarna har satsat på denna gata. Den fulla bet/raise-linjen är ännu inte verifierad för detta läge.",
    );
  const hero: 0 | 1 = oop.hero ? 0 : 1;
  let line: string[] = [],
    betSizes = s.street === "turn" ? [50] : [50, 100];
  if (bets[0] || bets[1]) {
    const bettor = bets[0] > 0 ? 0 : 1;
    if (bettor === hero) throw new Error("Din senaste insats väntar på svar.");
    const pct = (bets[bettor] / pot) * 100;
    const allin = bets[bettor] >= stack - 1e-7;
    if (!allin && (pct < 10 || pct > 200))
      throw new Error(
        "Den observerade betstorleken ligger utanför den verifierade modellen (10–200 %).",
      );
    if (!allin) betSizes = [pct];
    const action = allin ? "allin" : `bet:${pct}`;
    line = bettor === 0 ? [action] : ["check", action];
  } else if (hero === 1) line = ["check"];
  const config = validateConfig(
    {
      board: s.board,
      oopRange,
      ipRange,
      pot,
      stack,
      betSizes,
      raiseSizes: [50],
      maxIterations: s.street === "turn" ? 300 : 1500,
      targetPct: 0.2,
    },
    options,
  );
  return { config, line, hero, key: liveKey(s) };
}
export function liveAdvice(
  result: SolveResult,
  prepared: ReturnType<typeof prepareLiveSolve>,
  s: LiveSnapshot,
): { node: SolvedNode; hand: SolvedHand } {
  if (!s.valid || !s.heroTurn)
    throw new Error("Avläsningen är inte giltig för ett aktuellt beslut.");
  if (liveKey(s) !== prepared.key)
    throw new Error("Bordet ändrades medan solvern räknade.");
  const id = matchLine(result.nodes, prepared.line),
    node = result.nodes.find((n) => n.id === id)!;
  if (node.player !== prepared.hero)
    throw new Error("Den lösta noden matchar inte din tur.");
  const hand = adviceFor(node, s.heroCards);
  if (!hand)
    throw new Error("Dina kort saknar nåbar strategi i den angivna rangen.");
  return { node, hand };
}
