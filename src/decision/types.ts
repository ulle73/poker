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
  preflop?: import('../preflop/types').PreflopFacts;
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
  quality: "verified-gto" | "approximation" | "solver-unverified" | "chart-reference" | "proven-action";
  bounds?: import("../multiway/equity").EquityResult["bounds"];
  reference?: import('../preflop/types').PreflopReference;
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
  qualityMetric?: 'max-unilateral';
  qualityLimitPct?: number;
  qualityNote?: string;
  modelVerified?: boolean;
  sourceProof?: {solver:'holdem-0.93';solveId:string;handIndex:number;history:string;visits:number;entryExact:true};
  diagnostics?: {
    informationSets: number;
    cachedCardViews: number;
    suitPermutations: number;
    rootClassSize: number;
    tableLimited: boolean;
    completedEpisodes?: number;
    maximumEpisodeNodes?: number;
    baselineUpdates?: number;
    baselineBytes?: number;
    publicTreeNodes?: number;
    publicTreeLimited?: boolean;
  };
}
export interface SampledDeal {
  holes: number[][];
  runout: number[];
  importance: number;
}
/** Completed average policy for offline independent quality evaluation.
 * Queries contain only the acting seat's cards and the visible public state.
 */
export interface DecisionPolicy {
  query(
    state: BettingState,
    ownCards: readonly number[],
    visibleBoard: readonly number[],
  ): {
    actions: BettingAction[];
    frequencies: number[];
    trained: boolean;
  };
}
export interface SolveOptions {
  sampling?: "external" | "outcome";
  baseline?: "none" | "learned";
  /** Diagnostic reference path; outcome sampling caches public transitions by default. */
  publicTreeCache?: boolean;
  seed?: number;
  maxIterations?: number;
  timeBudgetMs?: number;
  maxNodes?: number;
  maxDepth?: number;
  maxInfosets?: number;
}
