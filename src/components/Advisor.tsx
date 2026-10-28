import type { SolvedHand, SolvedNode, SolveResult } from "../core/types";
import { actionCost, actionGroup, actionName } from "../core/strategy";
const percent = (n: number) =>
  `${(n * 100).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} %`;
export function Advisor({
  node,
  hand,
  result,
  revealed,
  connected,
  busy,
  error,
  onReveal,
  currency = "bb",
}: {
  node?: SolvedNode;
  hand: SolvedHand | null;
  result: SolveResult | null;
  revealed: boolean;
  connected: boolean;
  busy: boolean;
  error: string;
  onReveal: () => void;
  currency?: string;
}) {
  const ready = !!hand && !!node && connected;
  const top = ready
    ? hand.frequencies.indexOf(Math.max(...hand.frequencies))
    : -1;
  return (
    <section className="advisor-panel panel" aria-label="GTO-rekommendation">
      <div className="panel-heading">
        <h2>Ditt beslut</h2>
        <span className="quiet-badge">DCFR / River</span>
      </div>
      {busy ? (
        <div className="advisor-state">
          <span className="spinner" />
          <h3>Beräknar strategin</h3>
          <p>Rangerna möts i riktig solver-självspelning.</p>
        </div>
      ) : error ? (
        <div className="advisor-state">
          <h3>Ingen rekommendation</h3>
          <p role="alert">{error}</p>
        </div>
      ) : !ready ? (
        <div className="advisor-state">
          <span className="state-mark">—</span>
          <h3>
            {node?.kind === "terminal"
              ? "Handen är avslutad"
              : node?.player !== undefined
                ? "Inväntar bordet"
                : "Ansluter träningsbord"}
          </h3>
          <p>
            En rekommendation visas bara när kort, pott och aktuell nod är
            verifierade.
          </p>
        </div>
      ) : !revealed ? (
        <div className="advisor-state practice-state">
          <span className="state-mark">?</span>
          <h3>Vad väljer du?</h3>
          <p>
            Spela din handling i bordet. Därefter får du solverns frekvenser och
            återkoppling.
          </p>
          <button onClick={onReveal}>Visa strategin</button>
        </div>
      ) : (
        <>
          <div
            className={`recommendation ${actionGroup(node!.actions[top].label)}`}
          >
            <span>Vanligaste handlingen</span>
            <strong>
              {actionName(node!.actions[top].label)}
              {node!.actions[top].amount_to !== null
                ? ` ${node!.actions[top].amount_to} ${currency}`
                : node!.actions[top].label === "allin"
                  ? ` ${actionCost(node!, node!.actions[top], result!.config.stack)} ${currency}`
                  : ""}
            </strong>
            <span>
              {percent(hand!.frequencies[top])} av gångerna · en blandstrategi
            </span>
          </div>
          <div className="action-mix" aria-label="Handlingsfrekvenser">
            {(["fold", "call", "raise"] as const).map((group) => {
              const sum = node!.actions.reduce(
                (s, a, i) =>
                  s +
                  (actionGroup(a.label) === group ? hand!.frequencies[i] : 0),
                0,
              );
              const labels =
                group === "fold"
                  ? "Fold"
                  : group === "call"
                    ? node!.actions.some((a) => a.label === "call")
                      ? "Call"
                      : "Check"
                    : node!.actions.some((a) => a.label === "raise")
                      ? "Raise / All-in"
                      : "Bet / All-in";
              return (
                <div key={group} className={`mix-lane ${group}`}>
                  <div>
                    <span className="signal-dot" />
                    <strong>{labels}</strong>
                    <b>{percent(sum)}</b>
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
              <span>Exakt handling</span>
              <span>Frekvens</span>
              <span>EV¹</span>
            </div>
            {node!.actions.map((a, i) => (
              <div className="sizing-row" key={a.child}>
                <span>
                  <i className={`tiny-dot ${actionGroup(a.label)}`} />
                  {actionName(a.label)}
                  {a.amount_to !== null
                    ? ` till ${a.amount_to} ${currency}`
                    : a.label === "call" || a.label === "allin"
                      ? ` ${actionCost(node!, a, result!.config.stack)} ${currency}`
                      : ""}
                </span>
                <b>{percent(hand!.frequencies[i])}</b>
                <span>
                  {hand!.actionEvs[i] === null
                    ? "—"
                    : `${hand!.actionEvs[i]!.toFixed(2)} ${currency}`}
                </span>
              </div>
            ))}
          </div>
          <p className="microcopy">
            ¹ EV mot löst fortsättningsspel, relativt solverns start. Att blanda
            frekvenser är en del av strategin.
          </p>
        </>
      )}
      {result && (
        <div className="solve-certificate">
          <div>
            <span
              className={`status-dot ${result.meta.exploitability_pct_of_pot <= result.config.targetPct ? "good" : "pending"}`}
            />
            <strong>
              {result.meta.exploitability_pct_of_pot <= result.config.targetPct
                ? "Målfel uppnått"
                : "Iterationsgräns nådd"}
            </strong>
          </div>
          <dl>
            <div>
              <dt>Uppmätt exploaterbarhet</dt>
              <dd>{result.meta.exploitability_pct_of_pot.toFixed(3)} %</dd>
            </div>
            <div>
              <dt>Iterationer</dt>
              <dd>{result.meta.iterations.toLocaleString("sv-SE")}</dd>
            </div>
            <div>
              <dt>Beräkning</dt>
              <dd>{Math.round(result.wallMs)} ms</dd>
            </div>
          </dl>
          <p>
            Felet gäller rotpotten och just detta träd. Heads-up, chip EV, ingen
            rake.
          </p>
        </div>
      )}
    </section>
  );
}
