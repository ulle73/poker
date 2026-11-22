import { startTableObserver } from "./table-observer";
import type { LiveSnapshot, LiveAction } from "./types";
import { seatPositions } from "./positions";
import { LiveHandMemory } from "./hand-memory";
const SUIT: Record<string, string> = {
  "♠": "s",
  "♥": "h",
  "♦": "d",
  "♣": "c",
}; // taste-skill-ignore: poker suit data.
export function parseMoney(
  value: string,
): { amount: number; currency: string } | null {
  const text = value.replace(/\u00a0|\u202f/g, " ").trim();
  const match = text.match(/^([\d\s]+(?:[.,]\d+)?)\s*(€|kr|SEK|EUR)$/i);
  if (!match) return null;
  const amount = Number(match[1].replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(amount) && amount >= 0
    ? { amount, currency: /€|EUR/i.test(match[2]) ? "EUR" : "SEK" }
    : null;
}
function visible(el: Element | null): boolean {
  if (!el) return false;
  for (let e: Element | null = el; e; e = e.parentElement) {
    const style = getComputedStyle(e);
    if (
      e.hasAttribute("hidden") ||
      e.getAttribute("aria-hidden") === "true" ||
      /\bpt-(?:visibility-)?hidden\b/.test(e.className) ||
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse" ||
      style.opacity === "0"
    )
      return false;
  }
  return true;
}
function readCards(zone: Element | null): string[] {
  if (!zone) return [];
  const result: string[] = [];
  for (const c of zone.querySelectorAll(".card")) {
    if (!visible(c)) continue;
    const rank = c
      .querySelector(".card-rank")
      ?.textContent?.trim()
      .toUpperCase()
      .replace("10", "T");
    const suit = SUIT[c.querySelector(".card-suit")?.textContent?.trim() ?? ""];
    let value = rank && suit && /^[2-9TJQKA]$/.test(rank) ? rank + suit : null;
    if (!value) {
      const src = c.querySelector(".card-image")?.getAttribute("src") ?? "";
      const m = src.match(/\/([shdc])([2-9tjqka])\.svg(?:[?#]|$)/i);
      if (m) value = m[2].toUpperCase() + m[1].toLowerCase();
    }
    if (value) result.push(value);
  }
  return result;
}
const actionLabel = (text: string) =>
  /fold|lägg/i.test(text)
    ? "fold"
    : /check|passa/i.test(text)
      ? "check"
      : /syna|call/i.test(text)
        ? "call"
        : /all.?in/i.test(text)
          ? "allin"
          : /höj|raise/i.test(text)
            ? "raise"
            : /bet|satsa/i.test(text)
              ? "bet"
              : "";
export function readSiteTable(
  doc: Document,
  sequence: number,
  readerId: string,
): LiveSnapshot | null {
  const roots = [...doc.querySelectorAll(".cash-table-view")].filter(visible);
  if (roots.length !== 1) return null;
  const root = roots[0],
    issues: string[] = [];
  const readMoney = (e: Element | null) =>
    visible(e) ? parseMoney(e?.textContent ?? "") : null;
  const pot = readMoney(root.querySelector(".total-pot .total-pot-amount"));
  const currencies = new Set<string>(pot ? [pot.currency] : []);
  const areas = [...root.querySelectorAll(".player-area")];
  const occupied = areas.filter((e) =>
    visible(e.querySelector(".player-nameplate .amount")),
  );
  const seat = (e: Element) =>
    Number(e.className.match(/\bplayer-seat-(\d+)\b/)?.[1]);
  const dealer = areas.find((e) =>
    visible(e.querySelector(".game-position .dealer")),
  );
  const dealerSeat = dealer ? seat(dealer) : null;
  const players = occupied.map((e) => {
    const stack = readMoney(e.querySelector(".player-nameplate .amount"));
    const betElement = e.querySelector(".player-bet .amount");
    const bet = readMoney(betElement);
    if (stack) currencies.add(stack.currency);
    if (bet) currencies.add(bet.currency);
    const foldBadge = !![
      ...e.querySelectorAll(".player-action.action-fold"),
    ].find(visible);
    const cards = [
      ...e.querySelectorAll(
        ".cards-holder-hero .card,.cards-holder-other-hidden .card,.cards-holder-other .card",
      ),
    ].filter(visible);
    const folded = foldBadge && cards.length < 2;
    if (foldBadge && cards.length >= 2)
      issues.push("Foldanimation pågår; väntar på stabilt deltagande.");
    const id = seat(e);
    return {
      seat: id,
      hero: e.classList.contains("my-player"),
      position: "Okänd",
      stack: stack?.amount ?? null,
      bet:
        bet?.amount ??
        (betElement && visible(betElement) && betElement.textContent?.trim()
          ? null
          : 0),
      ...(!e.classList.contains("my-player") && { shownCards: readCards(e.querySelector(".cards-holder-other")) }),
      sittingOut: !folded && cards.length === 0 && (!betElement || !visible(betElement) || bet?.amount === 0) && [...e.querySelectorAll(".player-sit-out")].some(visible),
      folded,
      inHand: cards.length >= 2 && !folded,
    };
  });
  const positions = seatPositions(
    players.filter(p => !p.sittingOut).map(p => p.seat), dealerSeat,
    Number(root.querySelector('.table')?.className.match(/table-(\d+)-players/)?.[1] ?? 0),
  );
  for (const p of players) p.position = p.sittingOut ? 'Står över' : positions[p.seat] ?? 'Okänd';
  const heroArea = occupied.find((e) => e.classList.contains("my-player"));
  const heroCards = readCards(
    heroArea?.querySelector(".cards-holder-hero") ?? null,
  );
  const board = readCards(root.querySelector(".community-cards"));
  const handId =
    doc.querySelector(".hand-id")?.textContent?.replace(/[^\d]/g, "") ?? "";
  const availableActions = [...doc.querySelectorAll("button,div,span")]
    .filter(
      (e) =>
        !e.children.length &&
        visible(e) &&
        !e.closest(".player-area") &&
        /^(Fold|Check|Syna(?:\s|$)|Call(?:\s|$)|Höj Till|Höj$|Bet$|Satsa)/i.test(
          e.textContent?.trim() ?? "",
        ),
    )
    .map((e) => e.textContent!.trim().slice(0, 80));
  const heroTurn =
    availableActions.some((a) => /^Fold$/i.test(a)) &&
    availableActions.some((a) => /^(Check|Syna|Call|Höj|Bet|Satsa)/i.test(a));
  if (!handId) issues.push("Handnummer saknas.");
  if (!pot) issues.push("Potten kan inte läsas.");
  if (currencies.size !== 1)
    issues.push("Valutan saknas eller skiljer sig mellan fält.");
  if (players.filter((p) => p.hero).length !== 1)
    issues.push("Ditt säte kan inte identifieras.");
  if (
    players.some(
      (p) => p.stack === null || p.bet === null || !Number.isInteger(p.seat),
    )
  )
    issues.push("Stack eller insats saknas.");
  if (![0, 3, 4, 5].includes(board.length))
    issues.push("Kortanimation eller ofullständig bräda.");
  if (
    new Set([...board, ...heroCards, ...players.flatMap(p => p.shownCards ?? [])]).size !==
    board.length + heroCards.length + players.reduce((n,p) => n + (p.shownCards?.length ?? 0), 0)
  )
    issues.push("Överlappande kort: väntar på en stabil bild.");
  if (heroCards.length !== 2) issues.push("Dina två kort är inte synliga.");
  const variant = root.classList.contains("POKER_GAME_TYPE_SIX_PLUS_HOLDEM")
    ? "sixplus" : root.classList.contains("POKER_GAME_TYPE_HOLDEM") ? "holdem" : "unknown";
  if (variant === "unknown")
    issues.push("Endast Texas Hold’em stöds.");
  if (variant === "sixplus" && [...heroCards, ...board].some(c => !/^[6-9TJQKA]/.test(c)))
    issues.push("Kort under sex är inte giltiga på ett 6+-bord.");
  const street =
    board.length === 0
      ? "preflop"
      : board.length === 3
        ? "flop"
        : board.length === 4
          ? "turn"
          : board.length === 5
            ? "river"
            : "unknown";
  const observedActions: LiveAction[] = occupied.flatMap((e) => {
    const a = [...e.querySelectorAll(".player-action .action-text")].find(
      visible,
    );
    const action = actionLabel(a?.textContent ?? "");
    return action
      ? [
          {
            seat: seat(e),
            street,
            action,
            amount: players.find((p) => p.seat === seat(e))?.bet ?? null,
          },
        ]
      : [];
  });
  return {
    version: 1,
    variant,
    source: "svenskaspel-dom",
    readerId,
    sequence,
    handId,
    capturedAt: Date.now(),
    currency: [...currencies][0] ?? "UNKNOWN",
    maxSeats: Number(
      root
        .querySelector(".table")
        ?.className.match(/table-(\d+)-players/)?.[1] ?? 0,
    ),
    players,
    heroCards,
    board,
    pot: pot?.amount ?? null,
    street,
    dealerSeat,
    heroTurn,
    availableActions,
    valid: issues.length === 0,
    issues,
    observedActions,
  };
}
export function connect(options: { endpoint: string; token: string }) {
  if (location.hostname !== "games-svenskaspel.onegameslink.com")
    throw new Error("Läsaren är begränsad till Svenska Spels pokerklient.");
  const url = new URL(options.endpoint);
  if (
    url.hostname !== "127.0.0.1" ||
    url.protocol !== "http:" ||
    url.pathname !== "/ingest"
  )
    throw new Error("Mottagaren måste vara den lokala appen.");
  const owner = window as unknown as {
    __pokerAdvisorLiveStop?: () => void;
    __pokerAdvisorLiveStatus?: unknown;
  };
  owner.__pokerAdvisorLiveStop?.();
  const reader = startTableObserver({
    capture: readSiteTable.bind(null, document),
    send: async (snapshot) => {
      const response = await fetch(options.endpoint, {
        method: 'POST', headers: {'Content-Type':'application/json', 'X-Poker-Token':options.token},
        body: JSON.stringify(snapshot), signal: AbortSignal.timeout(2000),
        credentials:'omit', cache:'no-store', redirect:'error',
      });
      return {status:response.status};
    },
    onStatus: status => {owner.__pokerAdvisorLiveStatus = status;},
  });
  owner.__pokerAdvisorLiveStop = () => { reader.stop(); delete owner.__pokerAdvisorLiveStop; };
  return {readerId: reader.readerId, endpoint:url.origin, mode:'read-only', stopsOnReload:true};
}
