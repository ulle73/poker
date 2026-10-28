import type { LiveSnapshot } from "../live/types";
import type {
  DecisionActionKind,
  DecisionInput,
  DecisionStreet,
} from "./types";
export interface DecisionFacts {
  minBet?: number;
  lastFullRaise?: number;
  actedAt?: Record<number, number>;
  rangeRevision?: number;
  ranges?: Record<number, string>;
  notes?: string[];
}
/** A current BB contribution may be a raise. Infer only an intact blind post. */
export function observedBlind(s: LiveSnapshot): number | undefined {
  const bb = s.players.find((p) => p.position === "BB"),
    sb = s.players.find((p) => p.position.includes("SB"));
  if (
    s.street !== "preflop" ||
    !bb?.bet ||
    !sb?.bet ||
    Math.abs(bb.bet - 2 * sb.bet) > 1e-7 ||
    s.players.some((p) => p !== bb && p !== sb && (p.bet ?? 0) > 0) ||
    s.observedActions.some(
      (a) =>
        a.street === "preflop" && ["bet", "raise", "allin"].includes(a.action),
    )
  )
    return undefined;
  return Math.round(bb.bet / 0.01);
}
export function decisionKey(s: LiveSnapshot, revision = 0): string {
  return JSON.stringify([
    s.readerId,
    s.handId,
    s.street,
    s.board,
    s.heroCards,
    s.pot,
    s.currency,
    s.dealerSeat,
    s.heroTurn,
    s.valid,
    s.issues,
    s.availableActions,
    s.observedActions,
    s.players.map((p) => [
      p.seat,
      p.hero,
      p.position,
      p.stack,
      p.bet,
      p.folded,
      p.inHand,
    ]),
    revision,
  ]);
}
export function prepareDecision(
  s: LiveSnapshot,
  facts: DecisionFacts = {},
): DecisionInput {
  if (!s.valid)
    throw new Error(s.issues.join(" ") || "Bordets avläsning är inte giltig.");
  if (!s.heroTurn) throw new Error("Inväntar ditt nästa beslut.");
  if (
    !["preflop", "flop", "turn", "river"].includes(s.street) ||
    s.board.length !==
      ({ preflop: 0, flop: 3, turn: 4, river: 5 } as Record<string, number>)[
        s.street
      ]
  )
    throw new Error("Gata och bräda stämmer inte överens.");
  if (
    s.heroCards.length !== 2 ||
    new Set([...s.heroCards, ...s.board]).size !==
      s.heroCards.length + s.board.length
  )
    throw new Error("Dina kort och brädan måste vara unika.");
  if (s.pot === null || s.pot <= 0 || s.dealerSeat === null)
    throw new Error("Pott eller dealerposition saknas.");
  if (s.players.some((p) => !p.inHand && !p.folded))
    throw new Error(
      "Ett upptaget sätes deltagande är oklart. Inväntar bekräftat deltagande eller fold.",
    );
  const active = s.players
    .filter((p) => p.inHand && !p.folded)
    .sort((a, b) => {
      const distance = (seat: number) =>
        (seat - s.dealerSeat! + s.maxSeats) % s.maxSeats || s.maxSeats;
      return distance(a.seat) - distance(b.seat);
    });
  const hero = active.findIndex((p) => p.hero),
    n = active.length;
  if (hero < 0) throw new Error("Du är inte aktiv i handen.");
  if (n < 2 || n > 10)
    throw new Error("Ett beslut kräver 2–10 aktiva spelare.");
  if (active.some((p) => p.bet === null || p.stack === null))
    throw new Error("En aktiv spelares insats eller stack saknas.");
  const unit = 0.01;
  const chips = (v: number) => {
    const rounded = Math.round(v / unit);
    if (
      !Number.isSafeInteger(rounded) ||
      rounded < 0 ||
      Math.abs(rounded * unit - v) > 1e-6
    )
      throw new Error(
        "Belopp kan inte representeras i hundradels valutaenheter.",
      );
    return rounded;
  };
  const bets = active.map((p) => chips(p.bet!)),
    stacks = active.map((p) => chips(p.stack!)),
    pot = chips(s.pot),
    highest = Math.max(...bets);
  const knownBlind = facts.minBet ?? observedBlind(s);
  const minBet = Math.max(1, Math.round(knownBlind ?? 2));
  const lastFullRaise = Math.max(
    minBet,
    Math.round(facts.lastFullRaise ?? highest),
  );
  const deadPot = pot - bets.reduce((a, b) => a + b, 0);
  if (deadPot < 0)
    throw new Error("Aktuella insatser överstiger den avlästa totalpotten.");
  const pending = active.map(
    (p, i) =>
      stacks[i] > 0 &&
      (highest === 0
        ? i >= hero
        : bets[i] < highest ||
          (s.street === "preflop" &&
            knownBlind !== undefined &&
            p.position === "BB" &&
            highest === knownBlind)),
  );
  pending[hero] = true;
  const canRaise = active.map((p, i) => {
    const previous = facts.actedAt?.[p.seat];
    return (
      stacks[i] > 0 &&
      (previous === undefined || highest - previous >= lastFullRaise)
    );
  });
  const names = s.availableActions;
  const kinds: DecisionActionKind[] = [];
  if (names.some((x) => /^fold|lägg/i.test(x))) kinds.push("fold");
  if (names.some((x) => /^check|passa/i.test(x))) kinds.push("check");
  if (names.some((x) => /^syna|^call/i.test(x))) kinds.push("call");
  if (names.some((x) => /^höj|^raise|^bet|^satsa|^all.?in/i.test(x)))
    kinds.push(highest === 0 ? "bet" : "raise");
  const assumptions = [
    `Ranger anges som modellantaganden; tom range betyder jämnt fördelade lagliga händer.`,
    ...(facts.notes ?? []),
  ];
  if (knownBlind === undefined)
    assumptions.push(
      "Blinden är okänd; modellens minsta bet är satt till 0,02. Storlekar avrundas till 0,01.",
    );
  if (!facts.actedAt)
    assumptions.push(
      "Återstående turordning och höjningsrätt rekonstrueras från nuvarande insatser.",
    );
  if (deadPot)
    assumptions.push(
      "Tidigare pott behandlas som gemensam huvudpott; tidigare okända sidopotter kan inte verifieras.",
    );
  return {
    key: decisionKey(s, facts.rangeRevision ?? 0),
    hero,
    seats: active.map((p) => p.seat),
    heroCards: s.heroCards,
    board: s.board,
    state: {
      street: s.street as DecisionStreet,
      stacks,
      bets,
      invested: [...bets],
      folded: active.map(() => false),
      pending,
      canRaise,
      actor: hero,
      dealer: n - 1,
      currentBet: highest,
      lastFullRaise,
      minBet,
      raises: 0,
      history: "",
      boardCount: s.board.length,
      terminal: false,
      deadPot,
    },
    rules: {
      betFractions: [0.5, 1],
      raiseFractions: [0.5, 1],
      maxRaises: 1,
      includeAllIn: true,
    },
    chipUnit: unit,
    currency: s.currency,
    ranges: active.map((p) => facts.ranges?.[p.seat] ?? ""),
    rangeRevision: facts.rangeRevision ?? 0,
    assumptions,
    rootKinds: kinds.length ? kinds : undefined,
  };
}
