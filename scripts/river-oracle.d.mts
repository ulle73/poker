import type { SolveResult } from "../src/core/types";
export function evaluate7(cards: readonly string[]): number;
export function independentRiverReport(
  result: Pick<SolveResult, "nodes" | "rootRanges">,
): {
  ev: number[];
  bestResponse: number[];
  gains: number[];
  exploitabilityChips: number;
};
