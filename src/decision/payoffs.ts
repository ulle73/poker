import type { BettingState } from "./types";
import { validateBettingState } from "./betting";
/** Net chips relative to represented investments. Lower showdown scores are stronger. */
export function settlePayoffs(state: BettingState, scores: number[]): number[] {
  validateBettingState(state);
  const n = state.stacks.length,
    live = state.folded.flatMap((folded, i) => (folded ? [] : [i]));
  if (
    !live.length ||
    scores.length !== n ||
    (live.length > 1 && live.some((i) => !Number.isFinite(scores[i])))
  )
    throw new Error("Missing showdown scores or survivors");
  const net = state.invested.map((v) => -v);
  const award = (amount: number, eligible: number[]) => {
    if (!amount) return;
    const best = Math.min(...eligible.map((i) => scores[i]));
    const winners = eligible
      .filter((i) => scores[i] === best)
      .sort(
        (a, b) =>
          ((a - state.dealer - 1 + n) % n) - ((b - state.dealer - 1 + n) % n),
      );
    // A fold win requires no hand evaluation.
    if (eligible.length === 1) {
      net[eligible[0]] += amount;
      return;
    }
    if (!winners.length) throw new Error("Unsettleable pot");
    const share = Math.floor(amount / winners.length),
      extra = amount % winners.length;
    winners.forEach((seat, index) => {
      net[seat] += share + (index < extra ? 1 : 0);
    });
  };
  const tiers = [...new Set(state.invested.filter((v) => v > 0))].sort(
    (a, b) => a - b,
  );
  // Merge prior chips into the main pot when eligibility matches. A surviving seat
  // with zero new contribution still claims the prior pot, but not new side bets.
  const mergeDead =
    tiers.length > 0 && live.every((i) => state.invested[i] >= tiers[0]);
  if (!mergeDead) award(state.deadPot, live);
  let previous = 0;
  for (const tier of tiers) {
    const contributors = state.invested.flatMap((v, i) =>
      v >= tier ? [i] : [],
    );
    const isMain = previous === 0;
    const contribution = (tier - previous) * contributors.length;
    previous = tier;
    const dead = isMain && mergeDead ? state.deadPot : 0;
    if (contributors.length === 1) {
      net[contributors[0]] += contribution;
      award(dead, live);
      continue;
    }
    const eligible = contributors.filter((i) => !state.folded[i]);
    award(contribution + dead, eligible.length ? eligible : live);
  }
  return net;
}
