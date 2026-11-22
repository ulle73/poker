import { unknownParticipation } from "../live/participation";
import { useEffect, useState } from "react";
import type { LiveSnapshot } from "../live/types";
import type { EquityResult } from "../multiway/equity";
export function MultiwayStats({
  snapshot: s,
  fresh,
  ranges = {},
}: {
  snapshot: LiveSnapshot | null;
  fresh: boolean;
  ranges?: Record<number, string>;
}) {
  const active = s?.players.filter((p) => p.inHand && !p.folded) ?? [];
  const uncertain = s?.players.some(unknownParticipation) ?? true;
  const villains = active.filter(p => !p.hero);
  const partial = villains.some(p => p.shownCards?.length === 1);
  const dead = s?.players.filter(p => !active.includes(p)).flatMap(p => p.shownCards ?? []) ?? [];
  const opponentRanges = villains.map(p => ranges[p.seat] ?? "");
  const known = villains.map(p => p.shownCards?.length === 2 ? p.shownCards : null);
  const ready =
    fresh &&
    s?.valid &&
    !partial && s.variant !== "unknown" && s.variant !== "sixplus" &&
    s.heroCards.length === 2 &&
    active.some((p) => p.hero) &&
    active.length >= 2 &&
    !uncertain;
  const key = JSON.stringify([
    s?.readerId, s?.handId, s?.variant, dead, known, opponentRanges,
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
        deadCards: dead, knownOpponents: known, opponentRanges, exactHeadsUp: true,
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
  const villain = villains.length === 1 ? villains[0] : null;
  const headsUp = active.length === 2 && villain?.bet != null && hero?.bet != null && hero.stack != null;
  const unmatched = headsUp ? Math.max(0, villain.bet! - hero.bet! - hero.stack!) : 0;
  const odds =
    toCall !== null && toCall > 0 && s?.pot !== null && s?.pot !== undefined
      ? toCall / (s.pot - unmatched + toCall)
      : null;
  return (
    <section className="panel multiway-stats" aria-label="Multiway equity">
      <div className="panel-heading">
        <h2>Equity vid showdown</h2>
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
              {villains.map((p,i) => `Säte ${p.seat} · ${known[i]?.join(" ") ?? (opponentRanges[i].trim() || "alla lagliga händer, jämnt viktade")}`).join(" / ")}.
              {dead.length > 0 && " Övriga visade kort är borträknade."}
            </p>
            <dl className="equity-facts">
              {result.method === "monte-carlo" && <div>
                <dt>Monte Carlo-fel, cirka 95 %</dt>
                <dd>
                  ± {(result.confidence95HalfWidth * 100).toFixed(1)}{" "}
                  procentenheter
                </dd>
              </div>}
              <div>
                <dt>{result.method === "exact" ? "Exakt uppräknade givar" : "Simulerade givar"}</dt>
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
              : s?.variant === "sixplus"
                ? "Separat showdown-equity för 6+ är inte inkopplad. Solverns strategikontroll använder 36 kort."
              : partial ? "En motståndarhand är bara delvis visad."
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
            {result?.method === "exact" && headsUp && odds !== null && (villain.stack === 0 || hero.stack === toCall) &&
              <span>Synens netto-EV mot vald range, utan rake: <strong>{((s.pot! - unmatched + toCall) * result.equity - toCall)
                .toLocaleString("sv-SE", { maximumFractionDigits: 4 })} {s.currency}</strong></span>}
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
