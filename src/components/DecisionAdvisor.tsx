import type {
  DecisionInput,
  DecisionResult,
  DecisionAction,
} from "../decision/types";
import type { DecisionOutcome, ProviderInfo } from "../decision/providers";
import { POSTFLOP_ALL_IN } from "../decision/postflop-all-in";
import type { tableChoice as readTableChoice } from "../decision/adapter";
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
  tableChoice,
  input,
  result,
  busy,
  error,
  status,
  provider,
}: {
  tableChoice?: ReturnType<typeof readTableChoice>;
  input: DecisionInput | null;
  result: DecisionResult | null;
  busy: boolean;
  error: string;
  status?: DecisionOutcome["status"];
  provider?: ProviderInfo;
}) {
  const money = (chips: number) =>
    `${(chips * (input?.chipUnit ?? 0.01)).toLocaleString("sv-SE", { maximumFractionDigits: 2 })} ${input?.currency ?? ""}`;
  const title = (a: DecisionAction) =>
    `${names[a.kind]}${a.kind === "bet" || a.kind === "raise" ? ` till ${money(a.to)}` : a.kind === "call" ? ` ${money(a.cost)}` : ""}${a.allIn ? " · all-in" : ""}`;
  const provenBounds = result?.quality === "proven-action" && result.provider === POSTFLOP_ALL_IN.id ? result.bounds : undefined;
  const proven = !!provenBounds;
  const holdem=result?.provider==='holdem-solver-0.93'&&result.sourceProof?.entryExact===true&&result.sourceProof.visits>=32;
  const unverified=result?.quality==='solver-unverified'&&(result.provider==='monker-free-10114'||holdem)&&result.modelVerified===true;
  const solverName=holdem?'Holdem Solver':'Monker';
  const chart=result?.quality==='chart-reference'&&result.modelVerified===true&&!!result.reference&&['artgto-preflop','holdemmath-preflop','rangeconverter-preflop'].includes(result.provider);
  const chartName=result?.reference?.source==='rangeconverter'?'RangeConverter · förenklad PDF-tabell':result?.reference?.source==='artgto'?'ART/GTO':'HoldemMath push/fold';
  const activeDepths=chart?result!.reference!.activeDepthsBB:undefined;
  const blocked = (result?.quality === "proven-action" && !proven) || result?.quality === "approximation"||(result?.quality==='solver-unverified'&&!unverified)||(result?.quality==='chart-reference'&&!chart);
  const a = blocked ? undefined : result?.actions[result.recommended];
  const relaxed = (provider?.maxExploitabilityPct ?? 0.2) > 0.2;
  return (
    <section
      className="panel advisor-panel decision-advisor"
      aria-label="Automatiskt beslut"
    >
      <div className="panel-heading">
        <h2>Ditt beslut</h2>
        <span className="quiet-badge">
          {result?.quality === "verified-gto"
            ? relaxed ? `Solverstrategi · ${provider!.maxExploitabilityPct!.toLocaleString('sv-SE')} % felgräns` : "Verifierad GTO i valt träd"
            : proven ? "Matematiskt avgjort · all-in"
            : chart ? 'Prefloptabell · referensmodell'
            : unverified ? `${solverName} · felgräns ej verifierad`
            : result
              ? "Strategi inte godkänd"
              : "Beslutsmotor"}
        </span>
      </div>
      {!a && tableChoice && <div className="decision-choices">
        {tableChoice.check && !!error && <><strong>Försiktigt träningsval · Check</strong>
          <p>Du behåller handen utan att lägga mer i potten. Högst EV är okänt i det här läget.</p></>}
        Du kan {tableChoice.text}.
      </div>}
      {error ? (
        <div className="advisor-state">
          <h3>{status === "unsupported" ? "Strategi saknas för detta läge"
            : status === "rejected" ? "Lösningen är inte godkänd"
            : status === "error" ? "Solvern kunde inte slutföra"
            : tableChoice ? "Strategin kan inte beräknas" : "Inväntar beslutsläge"}</h3>
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
                Lösningen klarade inte kvalitetskontrollen. Inget råd visas.
              </>
            )}
          </p>
        </div>
      ) : !a ? (
        <div className="advisor-state">
          {busy && <span className="spinner" />}
          <h3>{busy ? "Beräknar ditt beslut" : "Inväntar din tur"}</h3>
          <p>{busy ? "Tidsgränsen är 10 sekunder från mottaget beslutsläge." : "Kort, insatser och spelare måste matcha det aktuella beslutet."}</p>
        </div>
      ) : (
        <>
          {proven && <p className="microcopy">Samma val ger högre chip-EV för varje laglig kombination av motståndarnas händer. Modellen räknar utan rake.</p>}
          {chart&&<p className="microcopy" role="status"><strong>Tabellreferens, inte en verifierad lösning av ditt exakta bord.</strong> {chartName}: {result!.reference!.modelDepthBB} BB, {result!.reference!.modelPlayers} spelare i modellen. Din effektiva stack: {result!.reference!.actualDepthBB.toLocaleString('sv-SE',{maximumFractionDigits:1})} BB; {result!.reference!.tablePlayers} utdelade spelare. Ingen oberoende felgräns är verifierad.</p>}
          {activeDepths?.length&&activeDepths.some(d=>Math.abs(d-result!.reference!.modelDepthBB)>1e-7)?<p className="microcopy" role="status"><strong>Stackskillnad:</strong> aktiva startstackar {Math.min(...activeDepths).toLocaleString('sv-SE',{maximumFractionDigits:1})}–{Math.max(...activeDepths).toLocaleString('sv-SE',{maximumFractionDigits:1})} BB. Rådet använder fortfarande källans {result!.reference!.modelDepthBB} BB-modell.</p>:null}
          {unverified&&<p className="microcopy" role="status"><strong>Felgräns ej verifierad.</strong> {!holdem&&'Mål: 2,1 % per spelare. '}{result!.qualityNote} Detta är en beräknad träningsstrategi från {solverName}, inte verifierad GTO.</p>}
          <div data-decision-key={result!.key} data-provider={result!.provider} className={`recommendation ${group(a)}`}>
            <span>
              {result!.quality === "verified-gto"
                ? "Vanligaste handlingen i lösningen"
                : proven ? "Bättre val mot varje möjlig hand" : chart ? 'Vanligaste handlingen i källtabellen'
                : unverified ? `Vanligaste handlingen i beräkningen från ${solverName}`
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
            {proven ? "En enskild action-EV beror på motståndarens range." : chart?'Ingen verifierad action-EV redovisas för tabellreferensen.':result!.provider==='monker-free-10114'?'Monkers samplade tränings-EV visas inte som action-EV.':result!.quality === "verified-gto"
              ? `EV för den valda ${input?.state.street ?? "poker"}-modellen. Referenspunkten anges under Modell och begränsningar.`
              : "Samplad netto-EV under träningspolicyn, inklusive modellens representerade insatser; inte en vinstprognos."}
          </p>
          <div className="solve-certificate">
            <strong>
              {proven ? "Exakt handjämförelse" : chart?'Tabellens modell och täckning':result!.quality === "verified-gto"
                ? "Uppmätt lösningskvalitet"
                : "Beräknad strategi · inte GTO-certifierad"}
            </strong>
            <dl>
              {provider && <div><dt>Källa</dt><dd>{chart?chartName:result!.provider.startsWith('b-inary-') ? 'b-inary Postflop · lokal' : provider.name}</dd></div>}
              {relaxed && <div><dt>{unverified?'Mål, ej verifierad gräns':'Vald felgräns / rotpott'}</dt><dd>{provider!.maxExploitabilityPct!.toLocaleString('sv-SE')} %</dd></div>}
              <div>
                <dt>Beräkning</dt>
                <dd>{Math.round(result!.elapsedMs)} ms</dd>
              </div>
              {!chart && !proven && <div>
                <dt>Iterationer</dt>
                <dd>{result!.iterations}</dd>
              </div>}
              {result!.quality === "verified-gto" ? (
                <div>
                  <dt>{result!.qualityMetric==='max-unilateral'?'Största ensidiga förbättring / rotpott':result!.provider.includes("sixplus") ? "NashConv / rotpott" : "Exploaterbarhet / rotpott"}</dt>
                  <dd>{result!.exploitabilityPct?.toFixed(3)} %</dd>
                </div>
              ) : provenBounds ? <div><dt>Jämförelser mot en motståndare</dt><dd>{(provenBounds.combinations * provenBounds.denominator / 2).toLocaleString("sv-SE")}</dd></div> : chart ? <div><dt>Oberoende felgräns</dt><dd>Ej verifierad</dd></div> : unverified ? <div><dt>Uppmätt fel</dt><dd>Okänt</dd></div> : (
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
