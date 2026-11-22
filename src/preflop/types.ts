export type PreflopStep = {seat: number; kind: 'raise'|'call'|'fold'; to: number};
export interface PreflopFacts {
  handId: string;
  readerId: string;
  participants: number[];
  positions: Record<number, string>;
  startingStacks: Record<number, number>;
  bigBlind?: number;
  steps: PreflopStep[];
  error?: string;
}
export interface ChartAction {token: string; bb: number; weights: number[]}
export interface ShortstackCharts {
  schema: 1;
  source: 'rangeconverter';
  archiveSha256: string;
  nodes: Record<string,ChartAction[]>;
  coverage: Record<string,boolean[]>;
  metadata: {depthBB:40; modelPlayers:6; nodes:number; rake:string; license:string};
}
export interface PreflopLibrary {
  schema: 1;
  source: 'artgto';
  archiveSha256: string;
  order: string[];
  nodes: Record<string, ChartAction[]>;
  shortstack?: ShortstackCharts;
  hu: {source: 'holdemmath'; depths: number[]; order: string[]; data: Record<string, Record<string, {s: number[]}>>};
  metadata: {rangeFiles: number; nodes: number; depthBB: 100; license: string; rake: string};
}
export interface PreflopReference {
  source: 'artgto'|'holdemmath'|'rangeconverter';
  archiveSha256: string;
  modelDepthBB: number;
  actualDepthBB: number;
  activeDepthsBB?: number[];
  tablePlayers: number;
  modelPlayers: number;
  history: string;
  sizingNotes: string[];
}
