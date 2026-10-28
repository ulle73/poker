export interface LivePlayer {
  seat: number;
  hero: boolean;
  position: string;
  stack: number | null;
  bet: number | null;
  folded: boolean;
  inHand: boolean;
}
export interface LiveAction {
  seat: number;
  street: string;
  action: string;
  amount: number | null;
}
export interface LiveSnapshot {
  version: 1;
  source: "svenskaspel-dom";
  readerId: string;
  sequence: number;
  handId: string;
  capturedAt: number;
  currency: string;
  maxSeats: number;
  players: LivePlayer[];
  heroCards: string[];
  board: string[];
  pot: number | null;
  street: string;
  dealerSeat: number | null;
  heroTurn: boolean;
  availableActions: string[];
  valid: boolean;
  issues: string[];
  observedActions: LiveAction[];
}
export interface LiveState {
  available: boolean;
  endpoint?: string;
  token?: string;
  receivedAt?: number;
  snapshot: LiveSnapshot | null;
  history: LiveAction[];
  connectedAt?: number;
  error?: string;
}
