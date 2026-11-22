export interface LivePlayer {
  seat: number;
  hero: boolean;
  position: string;
  stack: number | null;
  bet: number | null;
  folded: boolean;
  inHand: boolean;
  sittingOut?: boolean;
  shownCards?: string[];
}
export interface LiveAction {
  seat: number;
  street: string;
  action: string;
  amount: number | null;
}
export interface LiveSnapshot {
  variant?: "holdem" | "sixplus" | "unknown";
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
  review?: {lag:number; completed:number; hands:string[]; reader?:string};
  revision?: number;
  readerIssue?: {message: string; at: number} | null;
  available: boolean;
  endpoint?: string;
  token?: string;
  receivedAt?: number;
  decisionReceivedAt?: number;
  snapshot: LiveSnapshot | null;
  history: LiveAction[];
  connectedAt?: number;
  error?: string;
}
