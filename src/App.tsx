import { useCallback, useEffect, useRef, useState } from "react";
import { DRILLS } from "./core/drills";
import { configKey, configToToml } from "./core/config";
import { normalizeCards } from "./core/cards";
import {
  actionCost,
  actionName,
  adviceFor,
  matchLine,
  validateSnapshot,
} from "./core/strategy";
import {
  backupSession,
  downloadJson,
  loadBackup,
  loadSession,
  parseSessionImport,
  saveSession,
  summarizeSession,
} from "./core/session";
import type {
  Drill,
  HistoryEntry,
  Player,
  SolveResult,
  TableSnapshot,
  TrainingConfig,
  TrainingRecord,
  TreeAction,
} from "./core/types";
import { SolverClient, type Progress } from "./solver/client";
import { MESSAGE, type TableLoad } from "./table/protocol";
import { Card } from "./components/Card";
import { Advisor } from "./components/Advisor";
import { ConfigLab } from "./components/ConfigLab";
import { LivePanel } from "./live/LivePanel";

const solver = new SolverClient();
const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { maximumFractionDigits: 2 });
function prefixHistory(c: TrainingConfig): HistoryEntry[] {
  if (c.pot < 8) return [];
  const q = c.pot / 4;
  return [
    {
      player: 1,
      street: "preflop",
      action: "blind",
      amount: 0.5,
      description: "BTN lägger small blind 0,5 bb",
    },
    {
      player: 0,
      street: "preflop",
      action: "blind",
      amount: 1,
      description: "BB lägger big blind 1 bb",
    },
    {
      player: 1,
      street: "preflop",
      action: "raise",
      amount: q - 0.5,
      description: `BTN höjer till ${fmt(q)} bb`,
    },
    {
      player: 0,
      street: "preflop",
      action: "call",
      amount: q - 1,
      description: `BB synar ${fmt(q - 1)} bb`,
    },
    {
      player: 0,
      street: "flop",
      action: "check",
      amount: 0,
      description: "BB checkar",
    },
    {
      player: 1,
      street: "flop",
      action: "bet",
      amount: q,
      description: `BTN bettar ${fmt(q)} bb`,
    },
    {
      player: 0,
      street: "flop",
      action: "call",
      amount: q,
      description: `BB synar ${fmt(q)} bb`,
    },
    {
      player: 0,
      street: "turn",
      action: "check",
      amount: 0,
      description: "BB checkar",
    },
    {
      player: 1,
      street: "turn",
      action: "check",
      amount: 0,
      description: "BTN checkar",
    },
  ];
}
export function App() {
  const [view, setView] = useState<
    "trainer" | "session" | "lab" | "method" | "live"
  >(
    new URLSearchParams(location.search).get("view") === "live"
      ? "live"
      : "trainer",
  );
  const [mode, setMode] = useState<"study" | "practice">("study");
  const [drill, setDrill] = useState<Drill>(DRILLS[0]);
  const [result, setResult] = useState<SolveResult | null>(null);
  const [table, setTable] = useState<TableLoad | null>(null);
  const [snapshot, setSnapshot] = useState<TableSnapshot | null>(null);
  const [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [ready, setReady] = useState(false),
    [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<{
    record: TrainingRecord;
    child: number;
  } | null>(null);
  const [records, setRecords] = useState<TrainingRecord[]>(loadSession);
  const [backup, setBackup] = useState<TrainingRecord[]>(loadBackup);
  const [notice, setNotice] = useState(""),
    [clock, setClock] = useState(Date.now());
  const frame = useRef<HTMLIFrameElement>(null),
    sequence = useRef(0),
    lastRevision = useRef(-1),
    choiceLock = useRef(false);
  const stats = summarizeSession(records);
  const node = result?.nodes.find((n) => n.id === table?.node.id);
  const connected =
    !!snapshot &&
    !!table &&
    clock - snapshot.capturedAt < 3500 &&
    snapshot.nodeId === node?.id;
  const hand =
    node && snapshot && snapshot.hero === node.player
      ? adviceFor(node, snapshot.heroCards)
      : null;
  const adviceError =
    error ||
    (connected &&
    node?.kind === "decision" &&
    node.player === table?.hero &&
    !hand
      ? "Handen saknar nåbar strategi efter den här linjen. Välj en ny övning eller ändra studiens ranger."
      : "");

  const start = useCallback(async (next: Drill, selectView = true) => {
    const seq = ++sequence.current;
    solver.cancel();
    setBusy(true);
    setError("");
    setProgress(null);
    setSnapshot(null);
    setTable(null);
    setResult(null);
    setFeedback(null);
    setRevealed(false);
    setDrill(next);
    if (selectView) setView("trainer");
    lastRevision.current = -1;
    choiceLock.current = false;
    try {
      const solved = await solver.solve(next.config, setProgress);
      if (seq !== sequence.current) return;
      const id = matchLine(solved.nodes, next.line),
        n = solved.nodes.find((n) => n.id === id)!;
      normalizeCards([...next.config.board, ...next.heroCards]);
      if (
        !solved.rootRanges[next.hero].some(
          (h) =>
            normalizeCards(h.cards).sort().join("") ===
              [...next.heroCards].sort().join("") && h.weight > 0,
        )
      )
        throw new Error("Dina hålkort ingår inte i din angivna range.");
      // Reject a user-selected hand outside their range before publishing a board.
      const heroNode = solved.nodes.find(
        (n) => n.kind === "decision" && n.player === next.hero && n.id === id,
      );
      if (heroNode && !adviceFor(heroNode, next.heroCards))
        throw new Error(
          "Hålkorten saknar nåbar strategi i din range vid denna nod. Ändra kort, range eller startlinje.",
        );
      let history = prefixHistory(next.config),
        cursor = solved.nodes[0];
      for (let i = 0; i < next.line.length; i++) {
        const target = matchLine(solved.nodes, next.line.slice(0, i + 1));
        const a = cursor.actions.find((a) => a.child === target)!;
        history = [
          ...history,
          {
            player: cursor.player!,
            street: "river",
            action: a.label,
            amount: actionCost(cursor, a, next.config.stack),
            description: `${cursor.player === 0 ? "BB" : "BTN"} ${actionName(a.label)}${a.amount_to !== null ? ` till ${fmt(a.amount_to)} bb` : ""}`,
          },
        ];
        cursor = solved.nodes.find((n) => n.id === target)!;
      }
      setResult(solved);
      setTable({
        token: crypto.randomUUID(),
        handId: crypto.randomUUID(),
        revision: 0,
        configKey: solved.key,
        hero: next.hero,
        heroCards: next.heroCards,
        node: n,
        config: next.config,
        history,
        locked: false,
      });
    } catch (e) {
      if (seq === sequence.current) setError((e as Error).message);
    } finally {
      if (seq === sequence.current) setBusy(false);
    }
  }, []);
  useEffect(() => {
    start(DRILLS[0], false);
    const timer = setInterval(() => setClock(Date.now()), 750);
    return () => {
      ++sequence.current;
      solver.cancel();
      clearInterval(timer);
    };
  }, [start]);
  useEffect(() => {
    if (!saveSession(records))
      setNotice(
        "Sessionen kunde inte sparas lokalt. Exportera den innan du stänger appen.",
      );
  }, [records]);
  useEffect(() => {
    if (ready)
      frame.current?.contentWindow?.postMessage(
        table
          ? {
              channel: MESSAGE,
              kind: "load",
              state: {
                ...table,
                node: { ...table.node, hands: [] },
                locked:
                  !!feedback ||
                  busy ||
                  (table.node.player === table.hero && (!connected || !hand)),
              },
            }
          : { channel: MESSAGE, kind: "reset" },
        location.origin,
      );
  }, [table, ready, feedback, busy, connected, hand]);

  const advance = useCallback(
    (action: TreeAction) => {
      if (!table || !result) return;
      const n = table.node,
        child = result.nodes.find((n) => n.id === action.child);
      if (!child) return;
      setSnapshot(null);
      setFeedback(null);
      setRevealed(false);
      choiceLock.current = false;
      setTable({
        ...table,
        node: child,
        revision: table.revision + 1,
        history: [
          ...table.history,
          {
            player: n.player!,
            street: "river",
            action: action.label,
            amount: actionCost(n, action, result.config.stack),
            description: `${n.player === 0 ? "BB" : "BTN"} ${actionName(action.label)}${action.amount_to !== null ? ` till ${fmt(action.amount_to)} bb` : ["call", "allin"].includes(action.label) ? ` ${fmt(actionCost(n, action, result.config.stack))} bb` : ""}`,
          },
        ],
      });
    },
    [table, result],
  );
  useEffect(() => {
    const receive = (e: MessageEvent) => {
      if (
        e.source !== frame.current?.contentWindow ||
        e.origin !== location.origin ||
        e.data?.channel !== MESSAGE
      )
        return;
      if (e.data.kind === "ready") {
        setReady(true);
        return;
      }
      if (e.data.kind === "snapshot") {
        if (!table || !node) return;
        const s = e.data.snapshot;
        if (
          validateSnapshot(s, {
            token: table.token,
            handId: table.handId,
            configKey: table.configKey,
            node,
          }) &&
          s.revision === table.revision &&
          s.hero === table.hero &&
          s.heroCards.join(" ") === table.heroCards.join(" ") &&
          s.revision >= lastRevision.current
        ) {
          lastRevision.current = s.revision;
          setSnapshot(s);
        } else setSnapshot(null);
      }
      if (e.data.kind === "action") {
        if (
          !table ||
          !node ||
          !result ||
          !connected ||
          !hand ||
          feedback ||
          choiceLock.current ||
          e.data.token !== table.token ||
          e.data.handId !== table.handId ||
          e.data.nodeId !== node.id ||
          node.player !== table.hero
        )
          return;
        const i = node.actions.findIndex((a) => a.child === e.data.child);
        if (i < 0) return;
        choiceLock.current = true;
        const evs = hand.actionEvs.filter(
          (e): e is number => e !== null && Number.isFinite(e),
        );
        const chosenEv = hand.actionEvs[i];
        const record: TrainingRecord = {
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          drill: drill.title,
          cards: table.heroCards,
          board: table.config.board,
          action:
            actionName(node.actions[i].label) +
            (node.actions[i].amount_to !== null
              ? ` till ${fmt(node.actions[i].amount_to!)} bb`
              : ""),
          frequency: hand.frequencies[i],
          evLoss:
            chosenEv !== null && evs.length
              ? Math.max(0, Math.max(...evs) - chosenEv)
              : null,
          exploitabilityPct: result.meta.exploitability_pct_of_pot,
          config: table.config,
          nodeId: node.id,
          player: table.hero,
          actions: node.actions.map((a, j) => ({
            label: a.label,
            frequency: hand.frequencies[j],
            amountTo: a.amount_to,
          })),
        };
        setRecords((rs) => [...rs, record].slice(-1000));
        setFeedback({ record, child: node.actions[i].child });
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [table, node, result, connected, hand, feedback, drill.title]);
  useEffect(() => {
    if (
      !table ||
      !node ||
      !connected ||
      feedback ||
      node.kind !== "decision" ||
      node.player === table.hero
    )
      return;
    const timer = setTimeout(() => {
      const heroCards = new Set(table.heroCards),
        mix = node.actions.map(() => 0);
      for (const h of node.hands) {
        if (normalizeCards(h.cards).some((c) => heroCards.has(c))) continue;
        h.frequencies.forEach((f, i) => (mix[i] += h.weight * f));
      }
      const total = mix.reduce((a, b) => a + b, 0);
      if (total <= 1e-9) {
        setError("Motståndaren saknar räckvidd i denna nod.");
        return;
      }
      const random =
        (crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296) * total;
      let cumulative = 0,
        index = mix.length - 1;
      for (let i = 0; i < mix.length; i++) {
        cumulative += mix[i];
        if (random < cumulative) {
          index = i;
          break;
        }
      }
      advance(node.actions[index]);
    }, 850);
    return () => clearTimeout(timer);
  }, [table, node, connected, feedback, advance]);

  const nextDrill = () => {
    const i = DRILLS.findIndex((d) => d.id === drill.id);
    start(DRILLS[(i + 1 + DRILLS.length) % DRILLS.length]);
  };
  const showAdvice = mode === "study" || revealed || !!feedback;
  const exportSession = () =>
    downloadJson("poker-traning.json", {
      version: 1,
      exportedAt: new Date().toISOString(),
      records,
    });
  return (
    <div className="app-shell">
      <header className="app-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("trainer");
          }}
        >
          <svg
            className="brand-mark"
            viewBox="0 0 24 28"
            width="24"
            height="28"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M12 1C9 6 1 10 1 16a6 6 0 0 0 10 4c0 3-2 5-4 6h10c-2-1-4-3-4-6a6 6 0 0 0 10-4C23 10 15 6 12 1Z"
            />
          </svg>
          <span>
            Poker <b>GTO Advisor</b>
          </span>
        </a>
        <nav aria-label="Huvudmeny">
          {(
            [
              ["trainer", "Träningsbord"],
              ["live", "Live · Edge"],
              ["session", "Min session"],
              ["lab", "Egen studie"],
              ["method", "Metod & källor"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <span className="local-indicator">
          <span className="status-dot good" />
          {view === "live" ? "Lokalt · DOM-avläsning" : "Lokalt · Offline"}
        </span>
      </header>
      <main className="workspace">
        <div className="page-heading">
          <div>
            <div className="section-context">
              {view === "live"
                ? "Texas hold’em · Svenska Spel · Endast avläsning"
                : "Heads-up no-limit hold’em · Träningsmiljö"}
            </div>
            <h1>
              {view === "live"
                ? "Ditt bord, live."
                : view === "session"
                  ? "Min session"
                  : view === "lab"
                    ? "Studera en egen river"
                    : view === "method"
                      ? "Det här bygger råden på"
                      : "Ett bättre beslut i taget."}
            </h1>
            <p>
              {view === "live"
                ? "Alla spelare, positioner och insatser. Aktuell pottmatematik och strategins faktiska täckning."
                : view === "trainer"
                  ? "Läs bordet. Förstå frekvenserna. Träna ditt nästa beslut."
                  : view === "session"
                    ? "Dina sparade beslut, med den strategi som faktiskt användes."
                    : view === "lab"
                      ? "Ändra förutsättningarna och låt solvern räkna om."
                      : "Tydliga antaganden, riktig solver och mätbar lösningskvalitet."}
            </p>
          </div>
          {view === "trainer" && (
            <div className="mode-switch" aria-label="Träningsläge">
              <button
                className={mode === "study" ? "selected" : ""}
                onClick={() => setMode("study")}
              >
                Studera
              </button>
              <button
                className={mode === "practice" ? "selected" : ""}
                onClick={() => {
                  setMode("practice");
                  setRevealed(false);
                }}
              >
                Öva utan facit
              </button>
            </div>
          )}
        </div>
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button onClick={() => setNotice("")} aria-label="Stäng meddelande">
              ×
            </button>
          </div>
        )}
        <div style={{ display: view === "trainer" ? "contents" : "none" }}>
          <div className="trainer-grid">
            <div className="table-column">
              <section className="table-panel panel">
                <div className="panel-heading">
                  <div>
                    <h2>{drill.title}</h2>
                    <span className="muted">{drill.subtitle}</span>
                  </div>
                  <span
                    className={`connection ${connected ? "connected" : ""}`}
                  >
                    <span
                      className={`status-dot ${connected ? "good" : "pending"}`}
                    />
                    {connected
                      ? "DOM synkroniserad"
                      : busy
                        ? "Solvern arbetar"
                        : "Inväntar avläsning"}
                  </span>
                </div>
                <iframe
                  ref={frame}
                  src="./table.html"
                  title="Lokalt pokerträningsbord"
                  className="training-frame"
                  onLoad={() => setReady(true)}
                />
                {busy && (
                  <div className="solve-overlay">
                    <span className="spinner" />
                    <strong>Räknar verkliga strategier…</strong>
                    <span>
                      {progress
                        ? `${progress.iterations} iterationer · ${progress.pct.toFixed(3)} % fel`
                        : "Laddar den lokala solvermotorn"}
                    </span>
                    <button
                      onClick={() => {
                        ++sequence.current;
                        solver.cancel();
                        setBusy(false);
                        setError(
                          "Beräkningen avbröts. Välj en övning för att börja igen.",
                        );
                      }}
                    >
                      Avbryt
                    </button>
                  </div>
                )}
                <div className="table-footer">
                  <span>
                    {snapshot
                      ? `${snapshot.hero === 0 ? "BB / OOP" : "BTN / IP"} · ${snapshot.history.length} händelser avlästa`
                      : "Avläsning via MutationObserver"}
                  </span>
                  <span>Inga API-anrop · Inga spelkonton</span>
                </div>
              </section>
              {feedback && (
                <section className="feedback panel" aria-live="polite">
                  <div>
                    <strong>
                      {feedback.record.frequency >= 0.01
                        ? "Din handling ingår i strategin"
                        : "Solvern väljer sällan denna handling"}
                    </strong>
                    <p>
                      {feedback.record.action} spelas{" "}
                      {(feedback.record.frequency * 100).toFixed(1)} % här.
                      {feedback.record.evLoss !== null
                        ? ` Skillnad mot högsta handlings-EV: ${feedback.record.evLoss.toFixed(3)} bb.`
                        : ""}
                    </p>
                  </div>
                  <button
                    className="primary"
                    onClick={() => {
                      const a = node!.actions.find(
                        (a) => a.child === feedback.child,
                      )!;
                      advance(a);
                    }}
                  >
                    Fortsätt handen →
                  </button>
                </section>
              )}
              {node?.kind === "terminal" && (
                <section className="feedback panel">
                  <div>
                    <strong>Beslutet är sparat.</strong>
                    <p>
                      Övningen mäter dina val mot strategin. Inget fiktivt
                      vinstresultat räknas.
                    </p>
                  </div>
                  <button className="primary" onClick={nextDrill}>
                    Nästa övning →
                  </button>
                </section>
              )}
              <section className="drill-strip panel">
                <div className="panel-heading">
                  <h2>Träningsbibliotek</h2>
                  <span className="muted">{DRILLS.length} solverövningar</span>
                </div>
                <div className="drill-list">
                  {DRILLS.map((d) => (
                    <button
                      key={d.id}
                      className={drill.id === d.id ? "selected" : ""}
                      onClick={() => start(d)}
                    >
                      <span>
                        <strong>{d.title}</strong>
                        <small>{d.subtitle}</small>
                      </span>
                      <span className="drill-arrow">↗</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
            <Advisor
              node={node}
              hand={hand}
              result={result}
              revealed={showAdvice}
              connected={connected}
              busy={busy}
              error={adviceError}
              onReveal={() => setRevealed(true)}
            />
          </div>
          <div className="detail-grid">
            <section className="panel history-panel">
              <div className="panel-heading">
                <h2>Hela handlinjen</h2>
                <span className="quiet-badge">
                  {snapshot?.history.length ?? 0} händelser
                </span>
              </div>
              <p className="microcopy">
                Syntetisk träningshistorik. Före river visas en möjlig
                spellinje; riverrangerna är uttryckliga antaganden.
              </p>
              <div className="street-history">
                {["preflop", "flop", "turn", "river"].map((street) => (
                  <div key={street}>
                    <h3>
                      {street === "preflop"
                        ? "Preflop"
                        : street === "flop"
                          ? "Flop"
                          : street === "turn"
                            ? "Turn"
                            : "River"}
                    </h3>
                    {(snapshot?.history ?? [])
                      .filter((h) => h.street === street)
                      .map((h, i) => (
                        <p key={i}>
                          <span>{h.player === table?.hero ? "Du" : "V"}</span>
                          {h.description}
                        </p>
                      ))}
                    {!(snapshot?.history ?? []).some(
                      (h) => h.street === street,
                    ) && (
                      <p className="muted">
                        {street === "river"
                          ? "Ditt nästa beslut"
                          : "Ingen prefixhistorik"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
            <section className="panel context-panel">
              <div className="panel-heading">
                <h2>Förutsättningar</h2>
                <button onClick={() => setView("lab")}>Ändra ↗</button>
              </div>
              <p>{drill.lesson}</p>
              <dl className="range-list">
                <div>
                  <dt>BB / OOP</dt>
                  <dd>{drill.config.oopRange}</dd>
                </div>
                <div>
                  <dt>BTN / IP</dt>
                  <dd>{drill.config.ipRange}</dd>
                </div>
              </dl>
              <div className="context-bottom">
                <span>
                  Rotpott {drill.config.pot} bb · Effektiv stack{" "}
                  {drill.config.stack} bb
                </span>
                <button
                  onClick={() =>
                    downloadJson("poker-solver-config.json", {
                      version: 1,
                      config: drill.config,
                      toml: configToToml(drill.config),
                    })
                  }
                >
                  Exportera studie ↓
                </button>
              </div>
            </section>
          </div>
        </div>
        {view === "lab" && (
          <ConfigLab
            key={configKey(drill.config)}
            config={drill.config}
            busy={busy}
            onApply={(config, hero, cards) =>
              start({
                id: "custom",
                title: "Din egen riverstudie",
                subtitle: `${hero === 0 ? "OOP" : "IP"} · Egna förutsättningar`,
                config,
                hero,
                heroCards: cards,
                line: [],
                lesson:
                  "Egen studie med explicita ranges och fast bettingträd. Resultatet gäller dessa antaganden.",
              })
            }
          />
        )}
        {view === "session" && (
          <>
            <div className="session-stats panel">
              <div>
                <span>Sparade beslut</span>
                <strong>{stats.count}</strong>
              </div>
              <div>
                <span>Handling med minst 1 % frekvens</span>
                <strong>
                  {stats.supported} <small>/ {stats.count}</small>
                </strong>
              </div>
              <div>
                <span>Medelskillnad mot högsta EV</span>
                <strong>
                  {stats.meanLoss === null ? "—" : fmt(stats.meanLoss)}{" "}
                  <small>bb</small>
                </strong>
              </div>
              <div className="session-tools">
                <button onClick={exportSession} disabled={!records.length}>
                  Exportera session ↓
                </button>
                <label className="file-button">
                  Importera session
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        if (f.size > 3_000_000)
                          throw new Error("Filen är större än 3 MB.");
                        const imported = parseSessionImport(await f.text());
                        setRecords((rs) =>
                          [
                            ...new Map(
                              [...rs, ...imported].map((r) => [r.id, r]),
                            ).values(),
                          ].slice(-1000),
                        );
                        setNotice("Sessionen är importerad och sparad lokalt.");
                      } catch (err) {
                        setNotice((err as Error).message);
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            <section className="panel session-panel">
              <div className="panel-heading">
                <h2>Beslutshistorik</h2>
                {backup.length > 0 && (
                  <button
                    onClick={() => {
                      setRecords((rs) =>
                        [
                          ...new Map(
                            [...backup, ...rs].map((r) => [r.id, r]),
                          ).values(),
                        ].slice(-1000),
                      );
                      setNotice("Den lokala säkerhetskopian är återställd.");
                    }}
                  >
                    Återställ säkerhetskopia
                  </button>
                )}
                {records.length > 0 && (
                  <button
                    onClick={() => {
                      if (!backupSession(records)) {
                        setNotice(
                          "Kunde inte skapa lokal säkerhetskopia. Sessionen har behållits.",
                        );
                        return;
                      }
                      setBackup(records);
                      downloadJson("poker-session-backup.json", {
                        version: 1,
                        records,
                      });
                      setRecords([]);
                      setNotice(
                        "Sessionen är nollställd. En lokal säkerhetskopia finns att återställa och filhämtningen har startats.",
                      );
                    }}
                  >
                    Nollställ med säkerhetskopia
                  </button>
                )}
              </div>
              {records.length === 0 ? (
                <div className="empty-state">
                  <h3>Din första hand väntar.</h3>
                  <p>Spela ett beslut i träningsbordet så sparas det här.</p>
                  <button
                    className="primary"
                    onClick={() => setView("trainer")}
                  >
                    Till träningsbordet
                  </button>
                </div>
              ) : (
                <div className="session-table">
                  <div className="session-row header">
                    <span>Övning / hand</span>
                    <span>Ditt val</span>
                    <span>Frekvens</span>
                    <span>EV-skillnad</span>
                    <span>Mått på lösningen</span>
                  </div>
                  {[...records].reverse().map((r) => (
                    <div className="session-row" key={r.id}>
                      <div>
                        <strong>{r.drill}</strong>
                        <small>
                          {r.cards.join(" ")} ·{" "}
                          {new Date(r.at).toLocaleTimeString("sv-SE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </small>
                      </div>
                      <span>{r.action}</span>
                      <b>{(r.frequency * 100).toFixed(1)} %</b>
                      <span>
                        {r.evLoss === null ? "—" : `${r.evLoss.toFixed(3)} bb`}
                      </span>
                      <span>{r.exploitabilityPct.toFixed(3)} % fel</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <p className="microcopy">
              En handling med låg frekvens är inte automatiskt ett stort
              misstag. EV-skillnaden använder solverns fortsättningsstrategi,
              och lösningens approximationsfel finns kvar. Upp till 1 000 beslut
              sparas på denna dator.
            </p>
          </>
        )}
        {view === "method" && <Method />}
        {view === "live" && <LivePanel />}
        <footer className="app-footer">
          <span>
            Poker GTO Advisor <span className="muted">/ 1.3 · Träning & strategilabb</span>
          </span>
          <span>Verklig solver. Synliga antaganden. Träning på din dator.</span>
        </footer>
      </main>
    </div>
  );
}
function Method() {
  return (
    <div className="method-grid">
      <section className="panel">
        <h2>Strategin räknas, den gissas inte.</h2>
        <p>
          Liveflikens nya MCCFR-motor räknar alla gator och 2–10 spelare, men har
          inte klarat kvalitetsgranskningen. Den är avstängd som råd i standardläget
          och kan visas som experiment för studier. Verifierade river-råd kräver
          separat kvalitets- och laglighetskontroll i det valda trädet.
        </p>
        <p>
          Postflop räknar en approximativ Nash-strategi med Discounted
          Counterfactual Regret Minimization (DCFR). Båda spelarnas hela angivna
          ranger möts i ett bettingträd. Kortblockering och möjligheter att höja
          ingår.
        </p>
        <p>
          En separat best-response-beräkning mäter exploaterbarhet som procent
          av potten vid riverstart. Det är ett kvalitetsmått på just denna
          modell, inte en garanti för verklig vinst.
        </p>
        <h3>Vad färgerna betyder</h3>
        <p>
          <i className="tiny-dot fold" />
          Fold · <i className="tiny-dot call" />
          Call eller Check · <i className="tiny-dot raise" />
          Bet, Raise eller All-in. Alla visas även med text och exakta
          frekvenser.
        </p>
        <h3>Avläsningen</h3>
        <p>
          Det inbäddade träningsbordet är ett separat HTML-dokument. En
          MutationObserver läser kort, pott, stackar och historik ur DOM. Råden
          släcks när identitet, kort, tidsstämpel eller nod inte stämmer.
        </p>
        <h3>Verifierat matematiskt</h3>
        <p>
          Ett polariserat riverfall med pottbet återger det teoretiska
          förhållandet en bluff per två värdehänder. Testverktyget kontrollerar
          även normaliserade frekvenser, blockerade ranger, lagliga raises och
          nollsummes-EV.
        </p>
      </section>
      <section className="panel">
        <h2>Riverträningens omfattning & begränsningar</h2>
        <ul>
          <li>Heads-up NL Hold’em, river, chip EV och ingen rake.</li>
          <li>
            Preflop, flop och turn visas som syntetisk historik. De löses inte,
            och rangerna uppskattas inte automatiskt.
          </li>
          <li>
            Högst en raise på river. Betstorlekarna och all-in bestämmer vilka
            strategier som går att välja.
          </li>
          <li>
            Motståndaren väljer från lösningens rangevägda mix med hänsyn till
            dina blockerare. Ingen verklig spelare profileras.
          </li>
          <li>
            Livefliken läser Svenska Spels DOM till denna app. Observern är
            sessionsbunden och stannar vid omladdning. OCR och automatiska
            pokerhandlingar ingår inte.
          </li>
        </ul>
        <h3>Research i din Edge-flik</h3>
        <p>
          Den öppna Svenska Spel-klienten hade HTML-element för spelare, pott,
          stackar och kort. Dolda platshållarkort låg kvar i DOM. Möjligheten är
          nu använd i livefliken. Två deltagare på river kan analyseras med
          uttryckliga rangeantaganden. Komplett handhistorik och tidigare
          gators strategier återstår.
        </p>
        <h3>Öppen källkod</h3>
        <p>
          Solver: ucsandman/postflop (MIT). Referenser:
          hellomate2/gto-poker-overlay och LittleHalf/MCPoker. Din tidigare
          WinUI-kod granskades; den heuristiska beslutsmotorn ersattes.
        </p>
        <p className="microcopy">
          Källrevisioner, licenser, artefakthashar och teknisk research finns i
          projektets dokumentation. Appen kräver inga API-nycklar och skickar
          ingen speldata till molntjänster.
        </p>
      </section>
    </div>
  );
}
