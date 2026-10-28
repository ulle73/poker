import { solveDecision } from "./mccfr";
import type { DecisionInput, SolveOptions } from "./types";
self.onmessage = ({
  data,
}: {
  data: {
    id: number;
    input: DecisionInput;
    options?: SolveOptions;
  };
}) => {
  try {
    self.postMessage({
      id: data.id,
      result: solveDecision(data.input, data.options),
    });
  } catch (error) {
    self.postMessage({
      id: data.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
