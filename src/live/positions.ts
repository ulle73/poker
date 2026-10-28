import type { LiveSnapshot, LivePlayer } from "./types";
const tails: Record<number, string[]> = {
  3: [],
  4: ["CO"],
  5: ["UTG", "CO"],
  6: ["UTG", "HJ", "CO"],
  7: ["UTG", "UTG+1", "HJ", "CO"],
  8: ["UTG", "UTG+1", "LJ", "HJ", "CO"],
  9: ["UTG", "UTG+1", "UTG+2", "LJ", "HJ", "CO"],
  10: ["UTG", "UTG+1", "UTG+2", "UTG+3", "LJ", "HJ", "CO"],
};
export function seatPositions(
  seats: number[],
  dealer: number | null,
  maxSeats: number,
): Record<number, string> {
  const result: Record<number, string> = {};
  for (const seat of seats) result[seat] = "Okänd";
  if (
    dealer === null ||
    !seats.includes(dealer) ||
    new Set(seats).size !== seats.length ||
    seats.length < 2 ||
    seats.length > 10
  )
    return result;
  const clockwise = [...seats].sort(
    (a, b) =>
      ((a - dealer + maxSeats) % maxSeats) -
      ((b - dealer + maxSeats) % maxSeats),
  );
  const labels =
    seats.length === 2
      ? ["BTN / SB", "BB"]
      : ["BTN", "SB", "BB", ...tails[seats.length]];
  clockwise.forEach((seat, i) => {
    result[seat] = labels[i];
  });
  return result;
}
export function postflopOrder(s: LiveSnapshot): LivePlayer[] {
  if (s.dealerSeat === null) return [];
  const offset = (seat: number) =>
    (seat - s.dealerSeat! + s.maxSeats) % s.maxSeats || s.maxSeats;
  return s.players
    .filter((p) => p.inHand && !p.folded)
    .sort((a, b) => offset(a.seat) - offset(b.seat));
}
