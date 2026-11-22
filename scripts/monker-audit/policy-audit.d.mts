export interface MonkerNode {
  id: number;
  actor?: number;
  street: number;
  contributions: number[];
  active: number[];
  actions: number[];
  children: number[];
  policy?: Record<string, number[]>;
}
export interface MonkerModel {
  players: number;
  board: string[];
  deadPot: number;
  ranges: {cards: string; weight: number}[][];
  nodes: MonkerNode[];
  averages?: (number[] | null)[];
  currentRegrets?: (number[] | null)[];
  bucketMaps?: Record<string, Record<string, number | undefined>[]>;
  strategyMode?: 'average' | 'current-regret-matching';
}
export interface AuditOptions {
  maxWorlds?: number;
  maxVisits?: number;
  collectBestResponses?: boolean;
  qualityMetric?: 'nashconv' | 'max-unilateral';
  maxErrorPct?: number;
}
export interface AuditResult {
  method: string;
  values: number[];
  bestResponses: number[];
  gains: number[];
  nashConv: number;
  nashConvPct: number;
  maxGainPct: number;
  qualityMetric: 'nashconv' | 'max-unilateral';
  qualityErrorPct: number;
  limitPct: number;
  accepted: boolean;
  rootPot: number;
  rootActions: Record<string, number[]>;
  jointDeals: number;
  visits: number;
  elapsedMs: number;
  bestResponseActions?: Record<string, number>;
}
export function auditMultiway(model: MonkerModel, options: AuditOptions & {collectBestResponses: true}): AuditResult & {bestResponseActions: Record<string, number>};
export function auditMultiway(model: MonkerModel, options?: AuditOptions): AuditResult;
export function auditPairSymmetry(model: MonkerModel, options?: AuditOptions): (AuditResult & {sourceRangeCounts: number[]}) | null;
export function monkerPolicy(raw: unknown, bucket: number, actions: number): number[];
export function monkerCurrentPolicy(raw: unknown, bucket: number, actions: number): number[];
interface StoredNode {action: number; children: StoredNode[]}
export function monkerRuntimeTree(stored: StoredNode): {id: number; action: number; children: number[]}[];
