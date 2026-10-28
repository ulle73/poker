import { useEffect, useState } from "react";
import type { LiveSnapshot } from "../live/types";
import type { EquityResult } from "../multiway/equity";
export function MultiwayStats({
  snapshot: s,
  fresh,
}: {
  snapshot: LiveSnapshot | null;
  fresh: boolean;
}) {
  const active = s?.players.filter((p) => p.inHand && !p.folded) ?? [];
  const uncertain = s?.players.some((p) => !p.inHand && !p.folded) ?? true;
  const ready =
    fresh &&
    s?.valid &&
    s.heroCards.length === 2 &&
    active.some((p) => p.hero) &&
    active.length >= 2 &&
    !uncertain;
  const key = JSON.stringify([
    s?.handId,
    s?.heroCards,
    s?.board,
    active.map((p) => p.seat),
    ready,
  ]);
  const [answer, setAnswer] = useState<{
      key: string;
      result: EquityResult;
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    setAnswer(null);
    setError("");
    if (!ready || !s) return;
    const worker = new Worker(
      new URL("../multiway/equity-worker.ts", import.meta.url),
      { type: "module" },
    );
    const timer = setTimeout(() => {
      worker.terminate();
      setError("Beräkningen överskred tidsgränsen.");
    }, 5500);
    worker.onmessage = ({ data }) => {
      clearTimeout(timer);
      if (data.error) setError(data.error);
      else setAnswer({ key, result: data.result });
      worker.terminate();
    };
    worker.onerror = () => {
      clearTimeout(timer);
      setError("Equityberäkningen kunde inte startas.");
      worker.terminate();
    };
    worker.postMessage({
      id: key,
      config: {
        hero: s.heroCards,
        board: s.board,
        playerCount: active.length,
        samples: 8000,
        seed: 1973,
        maxTimeMs: 1500,
      },
    });
    return () => {
      clearTimeout(timer);
      worker.terminate();
    };
  }, [key]);
  const result = ready && answer?.key === key ? answer.result : null;
  const hero = s?.players.find((p) => p.hero),
    bets = s?.players.map((p) => p.bet);
  const toCall =
    hero?.stack !== null &&
    hero?.stack !== undefined &&
    hero.bet !== null &&
    bets?.every((b) => b !== null)
      ? Math.min(
          hero.stack,
          Math.max(0, Math.max(...(bets as number[])) - hero.bet),
        )
      : null;
  const odds =
    toCall !== null && toCall > 0 && s?.pot !== null && s?.pot !== undefined
      ? toCall / (s.pot + toCall)
      : null;
  return (
    <section className="panel multiway-stats" aria-label="Multiway equity">
      <div className="panel-heading">
        <h2>Potten i siffror</h2>
        <span className="quiet-badge">2–10 spelare · Equity</span>
      </div>
      <div className="multiway-body">
        <p className="microcopy">
          {active.length} synligt aktiva ·{" "}
          {s?.players.filter((p) => p.folded).length ?? 0} observerat foldade ·{" "}
          {s?.players.length ?? 0} upptagna säten.
        </p>
        {result ? (
          <>
            <div className="equity-number">
              <strong>{(result.equity * 100).toFixed(1)} %</strong>
              <span>Andel av potten vid showdown</span>
            </div>
            <p>
              Mot jämnt slumpade, okända motståndarhänder. Ingen range eller
              spelstil antas vara GTO.
            </p>
            <dl className="equity-facts">
              <div>
                <dt>Monte Carlo-fel, cirka 95 %</dt>
                <dd>
                  ± {(result.confidence95HalfWidth * 100).toFixed(1)}{" "}
                  procentenheter
                </dd>
              </div>
              <div>
                <dt>Simulerade givar</dt>
                <dd>{result.samples.toLocaleString("sv-SE")}</dd>
              </div>
              <div>
                <dt>Beräkning</dt>
                <dd>{Math.round(result.elapsedMs)} ms</dd>
              </div>
            </dl>
          </>
        ) : (
          <p>
            {!fresh
              ? "Inväntar aktuell bordsläsning."
              : uncertain
                ? "Deltagandet i ett upptaget säte är ännu oklart."
                : !s?.valid
                  ? "Inväntar stabila kort och belopp."
                  : !active.some((p) => p.hero)
                    ? "Du är inte bekräftat aktiv i handen."
                    : active.length < 2
                      ? "Ingen aktiv motståndare syns."
                      : error || "Beräknar mot alla synligt aktiva spelare…"}
          </p>
        )}
        {fresh && s?.valid && s.heroTurn && toCall !== null && (
          <div className="pot-odds">
            <span>
              Att syna:{" "}
              <strong>
                {toCall.toLocaleString("sv-SE", { maximumFractionDigits: 4 })}{" "}
                {s.currency}
              </strong>
            </span>
            {odds !== null && (
              <span>
                Enkel pottodds: <strong>{(odds * 100).toFixed(1)} %</strong>
              </span>
            )}
          </div>
        )}
        <p className="microcopy">
          Detta är kort- och pottmatematik, inte GTO-frekvenser eller ett
          spelråd. Equity förutsätter showdown utan framtida folds; sidopotter
          och framtida satsningar ingår inte. Felet ovan beskriver sampling,
          inte osäkerheten om motståndarranger.
        </p>
      </div>
    </section>
  );
}
