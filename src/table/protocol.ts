import type { HistoryEntry, SolvedNode, TrainingConfig } from "../core/types";
export interface TableLoad {
  token: string;
  handId: string;
  revision: number;
  configKey: string;
  hero: number;
  heroCards: string[];
  node: SolvedNode;
  config: TrainingConfig;
  history: HistoryEntry[];
  locked: boolean;
}
export const MESSAGE = "poker-trainer-v1";
