import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LiveSnapshot } from "../live/types";
import type { DecisionInput } from "./types";
import { DecisionContext } from "./context";
import { decisionKey, tableChoice } from "./adapter";
import { LIVE_DECISION_MS } from "./quality";
import { createDecisionEngine, type DecisionOutcome } from "./providers";

const timeoutMessage = "Inget godkänt strategiråd blev klart inom 10 sekunder.";
export function useDecision(snapshot: LiveSnapshot | null, fresh: boolean, enabled = true, receivedAt?: number) {
  const [context] = useState(() => new DecisionContext());
  const [engine] = useState(createDecisionEngine);
  const generation = useRef(0);
  const [input, setInput] = useState<DecisionInput | null>(null);
  const [outcome, setOutcome] = useState<DecisionOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [, setRangeVersion] = useState(0);
  const rangeEditedAt = useRef(0);
  const deadline = useRef(0);
  const [origin, setOrigin] = useState<number>();
  const [activeKey, setActiveKey] = useState("");
  const start = Math.max(receivedAt ?? 0, rangeEditedAt.current);
  if (snapshot) context.observe(snapshot);
  const key = snapshot ? decisionKey(snapshot, context.rangeRevision) : "";
  useEffect(() => {
    const seq = ++generation.current;
    setOrigin(start);
    setActiveKey(key);
    deadline.current = (start || Date.now()) + LIVE_DECISION_MS;
    engine.cancel();
    setOutcome(null);
    setInput(null);
    setBusy(false);
    setError("");
    if (!enabled) { setError("Automatisk strategi är avstängd."); return; }
    if (!fresh || !snapshot) { setError("Inväntar färsk avläsning."); return; }
    if (!snapshot.heroTurn) { setError("Inväntar ditt nästa beslut."); return; }
    if (!snapshot.variant && snapshot.issues.includes("Endast Texas Hold’em stöds.")) {
      setError("Bordsläsaren använder en äldre version. Ladda om Edge-tillägget och sedan pokerfliken för 6+-stöd.");
      return;
    }
    let prepared: DecisionInput;
    try {
      prepared = context.prepare(snapshot);
      setInput(prepared);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    const expire = () => {
      if (seq !== generation.current) return;
      generation.current++;
      engine.cancel();
      setOutcome({status:"error", message:timeoutMessage});
      setError(timeoutMessage);
      setBusy(false);
    };
    const remaining = deadline.current - Date.now();
    if (remaining <= 0) { expire(); return; }
    const timer = setTimeout(expire, remaining);
    setBusy(true);
    engine.compute(snapshot, prepared).then((answer) => {
      if (seq !== generation.current || answer.status === "cancelled") return;
      clearTimeout(timer);
      if (Date.now() >= deadline.current) { expire(); return; }
      setOutcome(answer);
      setError(answer.status === "ready" ? "" : answer.message);
      setBusy(false);
    });
    return () => {
      clearTimeout(timer);
      generation.current++;
      engine.cancel();
    };
  }, [key, start, fresh, enabled, context, engine]);
  useLayoutEffect(() => {
    if (outcome?.status === "ready" && Date.now() >= deadline.current) {
      setOutcome({status:"error", message:timeoutMessage});
      setError(timeoutMessage);
    }
  }, [outcome]);
  const current = origin === start && enabled && !!input && input.key === key && fresh &&
    !!snapshot?.valid && snapshot.heroTurn;
  const result = outcome?.status === "ready" ? outcome.result : null;
  return {
    tableChoice: enabled && fresh && snapshot ? tableChoice(snapshot) : null,
    input: current ? input : null,
    result: current && result?.key === key ? result : null,
    busy: current && busy,
    status: current ? outcome?.status : undefined,
    provider: current && outcome && "provider" in outcome ? outcome.provider : undefined,
    error: !enabled ? "Automatisk strategi är avstängd."
      : !fresh ? "Inväntar färsk avläsning."
      : !snapshot?.heroTurn ? "Inväntar ditt nästa beslut." : origin === start && activeKey === key ? error : "",
    ranges: context.facts().ranges ?? {},
    setRange: (seat: number, range: string) => {
      const previous = context.rangeRevision;
      context.setRange(seat, range);
      if (context.rangeRevision !== previous) rangeEditedAt.current = Date.now();
      setRangeVersion((v) => v + 1);
    },
  };
}
