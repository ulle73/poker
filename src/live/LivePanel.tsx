import { useEffect, useRef, useState } from "react";
import type { LiveState, LiveSnapshot } from "./types";
import { Card } from "../components/Card";
import { Advisor } from "../components/Advisor";
import { SolverClient } from "../solver/client";
import type { SolveResult, SolvedNode, SolvedHand } from "../core/types";
import { prepareLiveSolve, liveKey, liveAdvice } from "./analysis";
import { postflopOrder } from "./positions";
import { MultiwayStats } from "../components/MultiwayStats";
export function LivePanel() {
  const [state, setState] = useState<LiveState>({
      available: false,
      snapshot: null,
      history: [],
    }),
    [clock, setClock] = useState(Date.now());
  const [ranges, setRanges] = useState({ oop: "", ip: "" }),
    [automatic, setAutomatic] = useState(true);
  const [solution, setSolution] = useState<{
      key: string;
      result: SolveResult;
      node: SolvedNode;
      hand: SolvedHand;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const solver = useRef(new SolverClient()),
    latest = useRef<LiveSnapshot | null>(null),
    generation = useRef(0);
  const s = state.snapshot;
  latest.current = s;
  const fresh =
    !!s &&
    clock - (state.receivedAt ?? 0) < 3000 &&
    clock - s.capturedAt < 4000;
  const identity = s ? liveKey(s) : "";
  const active = s ? postflopOrder(s) : [];
  useEffect(() => {
    let stopped = false,
      pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const res = await fetch(new URL("live-state", document.baseURI), {
          cache: "no-store",
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!stopped) {
          setState(data);
          setClock(Date.now());
        }
      } catch {
        if (!stopped)
          setState({
            available: false,
            snapshot: null,
            history: [],
            error: "Liveanslutningen är tillgänglig i Windows-appen.",
          });
      } finally {
        pending = false;
      }
    };
    refresh();
    const timer = setInterval(() => {
      setClock(Date.now());
      refresh();
    }, 500);
    return () => {
      stopped = true;
      clearInterval(timer);
      solver.current.cancel();
    };
  }, []);
  useEffect(() => {
    const seq = ++generation.current;
    solver.current.cancel();
    setSolution(null);
    setBusy(false);
    setError("");
    if (!fresh || !s || !automatic) return;
    let prepared: ReturnType<typeof prepareLiveSolve>;
    try {
      prepared = prepareLiveSolve(s, ranges.oop, ranges.ip);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setBusy(true);
    solver.current
      .solve(prepared.config, () => {})
      .then((result) => {
        if (seq !== generation.current || !latest.current) return;
        const answer = liveAdvice(result, prepared, latest.current);
        setSolution({ key: prepared.key, result, ...answer });
      })
      .catch((e) => {
        if (seq === generation.current) setError(e.message);
      })
      .finally(() => {
        if (seq === generation.current) setBusy(false);
      });
  }, [identity, ranges.oop, ranges.ip, automatic, fresh]);
  const money = (v: number | null) =>
    v === null
      ? "—"
      : `${v.toLocaleString("sv-SE", { maximumFractionDigits: 4 })} ${s?.currency ?? ""}`;
  const adviceCurrent =
    automatic && fresh && s?.valid && s.heroTurn && solution?.key === identity;
  return (
    <div className="live-grid">
      <div className="live-primary">
        <section className="panel live-status">
          <div className="panel-heading">
            <h2>Svenska Spel · Liveavläsning</h2>
            <span className="connection">
              <span className={`status-dot ${fresh ? "good" : "pending"}`} />
              {fresh
                ? "Live · uppdateras automatiskt"
                : s
                  ? "Anslutningen är inaktuell"
                  : "Väntar på Edge-anslutning"}
            </span>
          </div>
          {!s ? (
            <p>
              {state.error ??
                "Den lokala mottagaren är redo. Anslut den läsande bordssensorn till din öppna Edge-flik."}
            </p>
          ) : (
            <>
              <div className="live-facts">
                <div>
                  <span>Hand</span>
                  <strong>#{s.handId}</strong>
                </div>
                <div>
                  <span>Gata</span>
                  <strong>{s.street}</strong>
                </div>
                <div>
                  <span>Pott</span>
                  <strong>{money(s.pot)}</strong>
                </div>
                <div>
                  <span>Aktiva / upptagna / säten</span>
                  <strong>
                    {active.length} / {s.players.length} / {s.maxSeats}
                  </strong>
                </div>
              </div>
              <div className="live-cards">
                <div>
                  <span>Dina kort</span>
                  <div>
                    {s.heroCards.map((c, i) => (
                      <Card key={c + i} card={c} />
                    ))}
                  </div>
                </div>
                <div>
                  <span>Bräda</span>
                  <div>
                    {s.board.length ? (
                      s.board.map((c, i) => <Card key={c + i} card={c} />)
                    ) : (
                      <span className="muted">Inga gemensamma kort</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="live-players">
                <div className="live-player header">
                  <span>Säte / position</span>
                  <span>Stack bakom</span>
                  <span>Synlig insats</span>
                  <span>Tillstånd</span>
                </div>
                {s.players.map((p) => (
                  <div className="live-player" key={p.seat}>
                    <span>
                      <strong>{p.hero ? "Du" : `Spelare ${p.seat}`}</strong>
                      <small>
                        Säte {p.seat} · {p.position}
                      </small>
                    </span>
                    <span>{money(p.stack)}</span>
                    <span>{money(p.bet)}</span>
                    <span>
                      {p.folded
                        ? "Foldat"
                        : p.inHand
                          ? "I handen"
                          : "Oklart / väntar"}
                    </span>
                  </div>
                ))}
              </div>
              <p className="microcopy">
                {s.heroTurn
                  ? "Dina handlingsknappar är synliga."
                  : "Din tur är inte bekräftad."}{" "}
                Avläst {new Date(s.capturedAt).toLocaleTimeString("sv-SE")} ·{" "}
                {Math.max(0, clock - (state.receivedAt ?? 0))} ms sedan
                mottagning. Valutan är avläst direkt; inga antagna blinds eller
                omräknade bb.
              </p>
              {!!s.issues.length && (
                <p className="inline-error">{s.issues.join(" ")}</p>
              )}
            </>
          )}
        </section>
        <section className="panel live-history">
          <div className="panel-heading">
            <h2>Observerad handlinje</h2>
            <span className="quiet-badge">Delvis historik</span>
          </div>
          <p className="microcopy">
            Insamlingen börjar när anslutningen öppnas. Tidigare händelser och
            animationer kan saknas; listan är inte en komplett handhistorik.
          </p>
          {state.history.length ? (
            <ol>
              {state.history.map((h, i) => (
                <li key={i}>
                  {h.street} · Säte {h.seat} · {h.action}
                  {h.amount !== null
                    ? ` · synlig insats ${money(h.amount)}`
                    : ""}
                </li>
              ))}
            </ol>
          ) : (
            <p>Ingen ny handling har observerats.</p>
          )}
        </section>
        <section className="panel live-ranges">
          <div className="panel-heading">
            <h2>Antaganden för heads-up-strategi</h2>
            <label>
              <input
                type="checkbox"
                checked={automatic}
                onChange={(e) => setAutomatic(e.target.checked)}
              />{" "}
              Räkna automatiskt
            </label>
          </div>
          <p>
            Ranger är modellantaganden. Dolda motståndarkort eller en komplett
            tidigare spellinje kan inte avläsas. Inga träningsråd återanvänds på
            livebordet.
          </p>
          {active.length === 2 ? (
            <div className="form-grid">
              <label>
                OOP range {active[0] ? `· Säte ${active[0].seat}` : ""}
                <input
                  value={ranges.oop}
                  placeholder="Till exempel 22+,A2s+,ATo+,KTs+,QTs+,JTs"
                  onChange={(e) =>
                    setRanges({ ...ranges, oop: e.target.value })
                  }
                />
              </label>
              <label>
                IP range {active[1] ? `· Säte ${active[1].seat}` : ""}
                <input
                  value={ranges.ip}
                  placeholder="Ange antagen range vid riverstart"
                  onChange={(e) => setRanges({ ...ranges, ip: e.target.value })}
                />
              </label>
            </div>
          ) : (
            <p>
              Den inkopplade strategimotorn löser två kvarvarande spelare. En
              verifierad multiway-GTO-motor är ännu inte integrerad.
              Bordsläsning och equity hanterar alla synligt aktiva spelare.
            </p>
          )}
          <p className="microcopy">
            Stöder två deltagare och verifierbar riverlinje: ingen satsning,
            eller en första bet. En raise från båda spelarna kräver full
            linjemappning och ger ännu inga råd. Totalpotten antas inkludera
            aktuella synliga insatser. Solverns belopp visas i avläst valuta.
          </p>
        </section>
        <details className="panel live-connection">
          <summary>Teknisk anslutning</summary>
          <p>
            Endast avläsning av denna pokerklients DOM till appen på 127.0.0.1.
            Inga satsningar eller andra pokerhandlingar utförs. Läsaren stannar
            om fliken laddas om.
          </p>
          {state.available && (
            <>
              <code>{state.endpoint}</code>
              <label>
                Parningskod
                <input readOnly value={state.token ?? ""} />
              </label>
            </>
          )}
        </details>
      </div>
      <div className="live-advisor">
        <MultiwayStats snapshot={s} fresh={fresh} />
        <Advisor
          node={adviceCurrent ? solution.node : undefined}
          hand={adviceCurrent ? solution.hand : null}
          result={adviceCurrent ? solution.result : null}
          revealed
          connected={!!adviceCurrent}
          busy={busy}
          error={!fresh ? "Inväntar aktuell avläsning från Edge." : error}
          onReveal={() => {}}
          currency={s?.currency}
        />
      </div>
    </div>
  );
}
