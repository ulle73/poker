import { useEffect, useRef, useState } from "react";
import type { LiveSnapshot } from "../live/types";
import type { DecisionInput, DecisionResult } from "./types";
import { DecisionContext } from "./context";
import { decisionKey } from "./adapter";
import { DecisionClient } from "./client";
import { SolverClient } from "../solver/client";
import { verifiedPostflop } from "./verified-river";
export function useDecision(
  snapshot: LiveSnapshot | null,
  fresh: boolean,
  enabled = true,
) {
  const context = useRef(new DecisionContext()),
    client = useRef(new DecisionClient()),
    exact = useRef(new SolverClient()),
    generation = useRef(0);
  const [input, setInput] = useState<DecisionInput | null>(null),
    [result, setResult] = useState<DecisionResult | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [, setRangeVersion] = useState(0);
  // Observe all snapshots, including opponents' turns, without changing capture.
  if (snapshot) context.current.observe(snapshot);
  const key = snapshot
    ? decisionKey(snapshot, context.current.rangeRevision)
    : "";
  useEffect(() => {
    const seq = ++generation.current;
    client.current.cancel();
    exact.current.cancel();
    setResult(null);
    setInput(null);
    setBusy(false);
    setError("");
    if (!enabled) {
      setError("Automatisk strategi är avstängd.");
      return;
    }
    if (!fresh || !snapshot) {
      setError("Inväntar färsk avläsning.");
      return;
    }
    if (!snapshot.heroTurn) {
      setError("Inväntar ditt nästa beslut.");
      return;
    }
    let prepared: DecisionInput;
    try {
      prepared = context.current.prepare(snapshot);
      setInput(prepared);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setBusy(true);
    let certified = false;
    let pending = 2;
    let genericFailure = "";
    const finished = () => {
      pending--;
      if (pending || seq !== generation.current) return;
      setBusy(false);
      if (genericFailure && !certified) setError(genericFailure);
    };
    client.current
      .compute(prepared)
      .then((answer) => {
        if (seq !== generation.current || certified) return;
        setResult(answer);
        setError("");
      })
      .catch((e) => {
        genericFailure = e.message;
      })
      .finally(finished);
    verifiedPostflop(snapshot, prepared, exact.current)
      .then((answer) => {
        if (seq !== generation.current || !answer) return;
        certified = true;
        setResult(answer);
        setError("");
      })
      .catch(() => {})
      .finally(finished);
    return () => {
      client.current.cancel();
      exact.current.cancel();
    };
  }, [key, fresh, enabled]);
  const current =
    enabled &&
    !!input &&
    input.key === key &&
    fresh &&
    !!snapshot?.valid &&
    snapshot.heroTurn;
  return {
    input: current ? input : null,
    result: current && result?.key === key ? result : null,
    busy: current && busy,
    error: !fresh
      ? "Inväntar färsk avläsning."
      : !snapshot?.heroTurn
        ? "Inväntar ditt nästa beslut."
        : error,
    ranges: context.current.facts().ranges ?? {},
    setRange: (seat: number, range: string) => {
      context.current.setRange(seat, range);
      setRangeVersion((v) => v + 1);
    },
  };
}
