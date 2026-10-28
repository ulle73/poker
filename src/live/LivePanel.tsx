import { useEffect, useState } from "react";
import type { LiveState } from "./types";
import { Card } from "../components/Card";
import { DecisionAdvisor } from "../components/DecisionAdvisor";
import { useDecision } from "../decision/use-decision";
import { postflopOrder } from "./positions";
import { MultiwayStats } from "../components/MultiwayStats";
export function LivePanel() {
  const [state, setState] = useState<LiveState>({
      available: false,
      snapshot: null,
      history: [],
    }),
    [clock, setClock] = useState(Date.now());
  const [automatic, setAutomatic] = useState(true);
  const [experimental, setExperimental] = useState(false);
  const s = state.snapshot;
  const fresh =
    !!s &&
    clock - (state.receivedAt ?? 0) < 3000 &&
    clock - s.capturedAt < 4000;
  const active = s ? postflopOrder(s) : [];
  const decision = useDecision(s, fresh, automatic);
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
    };
  }, []);
  const money = (v: number | null) =>
    v === null
      ? "—"
      : `${v.toLocaleString("sv-SE", { maximumFractionDigits: 4 })} ${s?.currency ?? ""}`;
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
                mottagning. Beloppen visas i den avlästa valutan, utan omräkning
                till bb.
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
            <h2>Strategimodell · {active.length} spelare</h2>
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
            Beslut räknas automatiskt från preflop till river för 2–10 aktiva
            spelare. Tom range använder alla lagliga händer. Egna ranger är
            valfria modellantaganden; motståndarnas dolda kort är okända.
          </p>
          <div className="form-grid">
            {active.map((p) => (
              <label key={p.seat}>
                {p.hero ? "Du" : "Motståndare"} · Säte {p.seat} · {p.position}
                <input
                  value={decision.ranges[p.seat] ?? ""}
                  placeholder="Alla händer · valfritt: 22+,A2s+,ATo+"
                  onChange={(e) => decision.setRange(p.seat, e.target.value)}
                />
              </label>
            ))}
          </div>
          <p className="microcopy">
            MCCFR beräknar en approximation i ett begränsat spelträd. Verifierad
            GTO visas bara när riversolverns kvalitetskontroll är godkänd för
            det valda heads-up-trädet. Totalpotten antas inkludera aktuella
            insatser. Tidigare okända ranger och sidopotter kan påverka råden.
          </p>
          <label>
            <input
              type="checkbox"
              data-testid="experimental-strategies"
              checked={experimental}
              onChange={(e) => setExperimental(e.target.checked)}
            />{" "}
            Visa experimentella strategier för studier och test
          </label>
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
        <DecisionAdvisor
          input={decision.input}
          result={decision.result}
          busy={decision.busy}
          error={decision.error}
          experimental={experimental}
        />
        <MultiwayStats snapshot={s} fresh={fresh} />
      </div>
    </div>
  );
}
