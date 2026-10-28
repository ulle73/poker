export type Player = 0 | 1;
export type ActionLabel = "fold" | "check" | "call" | "bet" | "raise" | "allin";
export interface TrainingConfig {
  board: string[];
  oopRange: string;
  ipRange: string;
  pot: number;
  stack: number;
  betSizes: number[];
  raiseSizes: number[];
  maxIterations: number;
  targetPct: number;
}
export interface TreeAction {
  label: string;
  text: string;
  amount_to: number | null;
  percent_of_pot: number | null;
  child: number;
}
export interface SolvedHand {
  cards: string;
  weight: number;
  compatibleMass: number;
  frequencies: number[];
  ev: number | null;
  actionEvs: (number | null)[];
}
export interface SolvedNode {
  id: number;
  kind: "decision" | "terminal" | "chance";
  player?: number;
  board: string[];
  street: string;
  pot: number;
  stacks: number[];
  actions: TreeAction[];
  hands: SolvedHand[];
  terminal?: { kind: string; folder?: number; pot: number };
  valid_cards?: { card: string; child: number }[];
}
export interface SolveMeta {
  iterations: number;
  exploitability_chips: number;
  exploitability_pct_of_pot: number;
  root_evs: { zero_sum: number[]; pot_share: number[] };
  node_count: number;
}
export interface SolveResult {
  key: string;
  meta: SolveMeta;
  nodes: SolvedNode[];
  wallMs: number;
  config: TrainingConfig;
  memoryBytes: number;
  rootRanges: { cards: string; weight: number }[][];
}
export interface HistoryEntry {
  player: number;
  street: string;
  action: string;
  amount: number;
  description: string;
}
export interface TableSnapshot {
  version: 1;
  source: "local-training-dom";
  token: string;
  handId: string;
  revision: number;
  configKey: string;
  nodeId: number;
  hero: number;
  heroCards: string[];
  board: string[];
  pot: number;
  stacks: number[];
  street: string;
  history: HistoryEntry[];
  capturedAt: number;
}
export interface Drill {
  id: string;
  title: string;
  subtitle: string;
  config: TrainingConfig;
  hero: Player;
  heroCards: string[];
  line: string[];
  lesson: string;
}
export interface TrainingRecord {
  id: string;
  at: string;
  drill: string;
  cards: string[];
  board: string[];
  action: string;
  frequency: number;
  evLoss: number | null;
  exploitabilityPct: number;
  config: TrainingConfig;
  nodeId: number;
  player: number;
  actions: { label: string; frequency: number; amountTo: number | null }[];
}
