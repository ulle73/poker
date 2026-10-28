import type {
  DecisionInput,
  DecisionResult,
  DecisionAction,
} from "../decision/types";
const names = {
  fold: "Fold",
  check: "Check",
  call: "Call",
  bet: "Bet",
  raise: "Raise",
};
const group = (a: DecisionAction) =>
  a.kind === "fold"
    ? "fold"
    : a.kind === "check" || a.kind === "call"
      ? "call"
      : "raise";
export function DecisionAdvisor({
  input,
  result,
  busy,
  error,
  experimental = false,
}: {
  input: DecisionInput | null;
  result: DecisionResult | null;
  busy: boolean;
  error: string;
  experimental?: boolean;
}) {
  const money = (chips: number) =>
    `${(chips * (input?.chipUnit ?? 0.01)).toLocaleString("sv-SE", { maximumFractionDigits: 2 })} ${input?.currency ?? ""}`;
  const title = (a: DecisionAction) =>
    `${names[a.kind]}${a.kind === "bet" || a.kind === "raise" ? ` till ${money(a.to)}` : a.kind === "call" ? ` ${money(a.cost)}` : ""}${a.allIn ? " · all-in" : ""}`;
  const blocked = result?.quality === "approximation" && !experimental;
  const a = blocked ? undefined : result?.actions[result.recommended];
  return (
    <section
      className="panel advisor-panel decision-advisor"
      aria-label="Automatiskt beslut"
    >
      <div className="panel-heading">
        <h2>Ditt beslut</h2>
        <span className="quiet-badge">
          {result?.quality === "verified-gto"
            ? "Verifierad GTO i valt träd"
            : result
              ? "MCCFR · Experimentell approximation"
              : "Beslutsmotor"}
        </span>
      </div>
      {error ? (
        <div className="advisor-state">
          <h3>Inväntar beslutsläge</h3>
          <p role="status">{error}</p>
        </div>
      ) : blocked ? (
        <div className="advisor-state">
          {busy && <span className="spinner" />}
          <h3>
            {busy
              ? "Beräknar verifierad strategi"
              : "Strategin saknar kvalitetsgodkännande"}
          </h3>
          <p>
            {busy ? (
              "Solvern räknar på det exakta trädet. Resultatet visas när kvalitets- och regelkontrollen är klar."
            ) : (
              <>
                Beräkningen fungerar, men den snabba MCCFR-modellen har visat
                systematiska strategifel. Experimentella frekvenser kan visas
                för studier och test via inställningen till vänster.
              </>
            )}
          </p>
        </div>
      ) : !a ? (
        <div className="advisor-state">
          {busy && <span className="spinner" />}
          <h3>{busy ? "Beräknar ditt beslut" : "Inväntar din tur"}</h3>
          <p>Kort, insatser och spelare måste matcha det aktuella beslutet.</p>
        </div>
      ) : (
        <>
          <div className={`recommendation ${group(a)}`}>
            <span>
              {result!.quality === "verified-gto"
                ? "Vanligaste handlingen i lösningen"
                : "Experimentell handling · inte kvalitetsvaliderad"}
            </span>
            <strong>{title(a)}</strong>
            <span>{(a.frequency * 100).toFixed(1)} % av gångerna</span>
          </div>
          <div className="action-mix">
            {(["fold", "call", "raise"] as const).map((g) => {
              const sum = result!.actions
                .filter((x) => group(x) === g)
                .reduce((v, x) => v + x.frequency, 0);
              return (
                <div className={`mix-lane ${g}`} key={g}>
                  <div>
                    <span className="signal-dot" />
                    <strong>
                      {g === "fold"
                        ? "Fold"
                        : g === "call"
                          ? "Check / Call"
                          : "Bet / Raise"}
                    </strong>
                    <b>{(sum * 100).toFixed(1)} %</b>
                  </div>
                  <div className="mix-track">
                    <span style={{ width: `${sum * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="sizing-table">
            <div className="sizing-header">
              <span>Handling / sizing</span>
              <span>Frekvens</span>
              <span>EV¹</span>
            </div>
            {result!.actions.map((x) => (
              <div className="sizing-row" key={x.id}>
                <span>
                  <i className={`tiny-dot ${group(x)}`} />
                  {title(x)}
                </span>
                <b>{(x.frequency * 100).toFixed(1)} %</b>
                <span>{x.ev === null ? "—" : money(x.ev)}</span>
              </div>
            ))}
          </div>
          <p className="microcopy">
            ¹{" "}
            {result!.quality === "verified-gto"
              ? `EV relativt den exakta ${result!.provider.endsWith("/turn") ? "turn" : "river"}-modellen.`
              : "Samplad netto-EV under träningspolicyn, inklusive modellens representerade insatser; inte en vinstprognos."}
          </p>
          <div className="solve-certificate">
            <strong>
              {result!.quality === "verified-gto"
                ? "Uppmätt lösningskvalitet"
                : "Beräknad strategi · inte GTO-certifierad"}
            </strong>
            <dl>
              <div>
                <dt>Beräkning</dt>
                <dd>{Math.round(result!.elapsedMs)} ms</dd>
              </div>
              <div>
                <dt>Iterationer</dt>
                <dd>{result!.iterations}</dd>
              </div>
              {result!.quality === "verified-gto" ? (
                <div>
                  <dt>Exploaterbarhet / rotpott</dt>
                  <dd>{result!.exploitabilityPct?.toFixed(3)} %</dd>
                </div>
              ) : (
                <div>
                  <dt>Besök vid ditt beslut</dt>
                  <dd>{result!.rootVisits}</dd>
                </div>
              )}
            </dl>
            <details>
              <summary>Modell och begränsningar</summary>
              <ul>
                {[...result!.assumptions, ...result!.limitations].map(
                  (x, i) => (
                    <li key={i}>{x}</li>
                  ),
                )}
              </ul>
              <p>{result!.provider}</p>
            </details>
          </div>
        </>
      )}
    </section>
  );
}
