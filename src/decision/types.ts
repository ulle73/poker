export type DecisionStreet = "preflop" | "flop" | "turn" | "river";
export type DecisionActionKind = "fold" | "check" | "call" | "bet" | "raise";
export interface BettingAction {
  kind: DecisionActionKind;
  to: number;
  cost: number;
  allIn: boolean;
  id: string;
}
export interface BettingState {
  /** All amounts are integer chip units, arrays aligned to seat index. */
  street: DecisionStreet;
  stacks: number[];
  bets: number[];
  invested: number[];
  folded: boolean[];
  pending: boolean[];
  canRaise: boolean[];
  actor: number;
  dealer: number;
  currentBet: number;
  lastFullRaise: number;
  minBet: number;
  deadPot: number;
  raises: number;
  history: string;
  boardCount: number;
  terminal: boolean;
}
export interface BettingRules {
  betFractions: number[];
  raiseFractions: number[];
  maxRaises: number;
  includeAllIn: boolean;
}
export interface DecisionInput {
  key: string;
  hero: number;
  seats: number[];
  heroCards: string[];
  board: string[];
  state: BettingState;
  rules: BettingRules;
  chipUnit: number;
  currency: string;
  /** Explicit per-seat range priors; empty string means uniform legal combinations. */
  ranges: string[];
  rangeRevision: number;
  assumptions: string[];
  rootKinds?: DecisionActionKind[];
}
export interface DecisionAction extends BettingAction {
  frequency: number;
  ev: number | null;
}
export interface DecisionResult {
  key: string;
  rangeRevision: number;
  quality: "verified-gto" | "approximation";
  provider: string;
  actions: DecisionAction[];
  recommended: number;
  iterations: number;
  rootVisits: number;
  elapsedMs: number;
  cutoffCount: number;
  assumptions: string[];
  limitations: string[];
  exploitabilityPct: number | null;
  diagnostics?: {
    informationSets: number;
    cachedCardViews: number;
    suitPermutations: number;
    rootClassSize: number;
    tableLimited: boolean;
  };
}
export interface SampledDeal {
  holes: number[][];
  runout: number[];
  importance: number;
}
export interface SolveOptions {
  seed?: number;
  maxIterations?: number;
  timeBudgetMs?: number;
  maxNodes?: number;
  maxDepth?: number;
  maxInfosets?: number;
}
