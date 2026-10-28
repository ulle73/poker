import type { LiveSnapshot } from "../live/types";
import type {
  DecisionInput,
  DecisionResult,
  DecisionActionKind,
} from "./types";
import { prepareLiveSolve, liveAdvice } from "../live/analysis";
import { SolverClient } from "../solver/client";
import { actionCost } from "../core/strategy";
import { legalRiverTree, legalRiverRoot } from "./river-legality";
export const FULL_RANGE = [
  "22+",
  ..."3456789TJQKA".split("").flatMap((r) => [`${r}2s+`, `${r}2o+`]),
].join(",");
export async function verifiedRiver(
  s: LiveSnapshot,
  input: DecisionInput,
  solver: SolverClient,
): Promise<DecisionResult | null> {
  if (input.board.length !== 5 || input.seats.length !== 2) return null;
  let prepared: ReturnType<typeof prepareLiveSolve>;
  try {
    prepared = prepareLiveSolve(
      s,
      input.ranges[0] || FULL_RANGE,
      input.ranges[1] || FULL_RANGE,
    );
  } catch {
    return null;
  }
  const solved = await solver.solve(prepared.config, () => {});
  if (solved.meta.exploitability_pct_of_pot > solved.config.targetPct)
    return null;
  if (!legalRiverTree(solved, input)) return null;
  // Fractional chips cannot be presented as a verified legal-client tree.
  if (
    solved.nodes.some((n) =>
      n.actions.some(
        (a) =>
          a.amount_to !== null &&
          Math.abs(
            a.amount_to / input.chipUnit -
              Math.round(a.amount_to / input.chipUnit),
          ) > 1e-5,
      ),
    )
  )
    return null;
  const { node, hand } = liveAdvice(solved, prepared, s),
    hero = input.hero,
    own = input.state.bets[hero],
    call = Math.max(0, input.state.currentBet - own);
  const actions = node.actions.map((a, i) => {
    const cost = Math.round(
        actionCost(node, a, solved.config.stack) / input.chipUnit,
      ),
      kind: DecisionActionKind =
        a.label === "allin"
          ? cost <= call
            ? "call"
            : input.state.currentBet === 0
              ? "bet"
              : "raise"
          : (a.label as DecisionActionKind);
    return {
      kind,
      to: own + cost,
      cost,
      allIn: cost === input.state.stacks[hero],
      id: `${kind}:${own + cost}`,
      frequency: hand.frequencies[i],
      ev:
        hand.actionEvs[i] === null ? null : hand.actionEvs[i]! / input.chipUnit,
    };
  });
  if (actions.some((a) => input.rootKinds && !input.rootKinds.includes(a.kind)))
    return null;
  if (!legalRiverRoot(input, actions)) return null;
  return {
    key: input.key,
    rangeRevision: input.rangeRevision,
    quality: "verified-gto",
    provider: "postflop-dcfr/river",
    actions,
    recommended: actions.findIndex(
      (a) => a.frequency === Math.max(...actions.map((x) => x.frequency)),
    ),
    iterations: solved.meta.iterations,
    rootVisits: 0,
    elapsedMs: solved.wallMs,
    cutoffCount: 0,
    assumptions: [
      ...input.assumptions,
      "DCFR löser de angivna rangerna i det valda riverträdet.",
    ],
    limitations: [
      "GTO-kontrollen gäller det valda heads-up-trädet och rangeantagandena, inte hela no-limit-spelet.",
      "Ingen rake. EV i denna provider anges relativt riverstart med halva startpotten per spelare.",
    ],
    exploitabilityPct: solved.meta.exploitability_pct_of_pot,
  };
}
