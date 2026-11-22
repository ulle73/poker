import { useEffect, useState } from "react";
import type { LiveState } from "./types";
import { Card } from "../components/Card";
import { postflopOrder } from "./positions";
import { HandReview } from "./HandReview";
export function LivePanel() {
  const [state, setState] = useState<LiveState>({
      available: false,
      snapshot: null,
      history: [],
    }),
    [clock, setClock] = useState(Date.now());
  const s = state.snapshot;
  const fresh =
    !!s && Math.max(clock, Date.now()) - s.capturedAt >= -500 &&
    clock - (state.receivedAt ?? 0) < 3000 &&
    clock - s.capturedAt < 4000;
  const active = s ? postflopOrder(s) : [];
  useEffect(() => {
    const controller = new AbortController();
    let revision: number | undefined;
    let retry: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      let delay = 500;
      try {
        const url = new URL("live-state", document.baseURI);
        if (revision !== undefined) url.searchParams.set("after", String(revision));
        const response = await fetch(url, {cache:"no-store", signal:controller.signal});
        if (!response.ok) throw Error();
        const data: LiveState = await response.json();
        if (controller.signal.aborted) return;
        setState(data);
        setClock(Date.now());
        revision = data.revision;
        if (revision !== undefined) delay = 0;
      } catch {
        if (controller.signal.aborted) return;
        revision = undefined;
        setState({available:false,snapshot:null,history:[],error:"Liveanslutningen är tillgänglig i Windows-appen."});
      }
      retry = setTimeout(refresh, delay);
    };
    refresh();
    const timer = setInterval(() => setClock(Date.now()), 200);
    return () => {controller.abort(); clearTimeout(retry); clearInterval(timer);};
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
          {s && !fresh && state.readerIssue && <p role="status">{state.readerIssue.message}</p>}
          {!s ? (
            <p>
              {state.readerIssue?.message ?? state.error ??
                "Öppna bordet i Edge med tillägget Poker Advisor aktiverat. Vid privat surfning behöver tillägget åtkomst i InPrivate. Parningskoden finns under Teknisk anslutning."}
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
                  <span>Din stack bakom</span>
                  <strong>{money(s.players.find(p => p.hero)?.stack ?? null)}</strong>
                </div>
                <div>
                  <span>Tur att agera</span>
                  <strong className={fresh && s.valid && s.heroTurn ? "hero-turn" : ""}>{fresh && s.valid ? s.heroTurn ? "Din tur" : "Inväntar din tur" : "Okänd"}</strong>
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
                        : p.sittingOut ? "Står över" : p.inHand
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
        <HandReview review={state.review} />
      </div>
    </div>
  );
}
