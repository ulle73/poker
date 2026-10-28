import type { SolveResult, TrainingConfig } from "../src/core/types";
export function initializeSolver(bytes?: Uint8Array): Promise<unknown>;
export function solveTree(
  toml: string,
  config: TrainingConfig,
  onProgress?: (iterations: number, chips: number, pct: number) => void,
  options?: { postflop?: boolean; line?: string[]; allStrategies?: boolean },
): Omit<SolveResult, "key" | "config"> & { selectedNodeId?: number };
