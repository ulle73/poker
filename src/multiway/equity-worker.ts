import {
  calculateEquity,
  type EquityConfig,
  type EquityResult,
} from "./equity";

export interface EquityWorkerRequest {
  id: string | number;
  config: EquityConfig;
}

export type EquityWorkerResponse =
  | { id: string | number; result: EquityResult }
  | { id: string | number; error: string };

self.onmessage = (event: MessageEvent<EquityWorkerRequest>) => {
  const { id, config } = event.data;
  try {
    self.postMessage({
      id,
      result: calculateEquity(config),
    } satisfies EquityWorkerResponse);
  } catch (error) {
    self.postMessage({
      id,
      error:
        error instanceof Error
          ? error.message
          : "Equityberäkningen misslyckades.",
    } satisfies EquityWorkerResponse);
  }
};
