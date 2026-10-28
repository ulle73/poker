import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "../styles.css";
import { Card } from "../components/Card";
import { observeTable } from "./dom-adapter";
import { MESSAGE, type TableLoad } from "./protocol";
import { actionCost, actionName } from "../core/strategy";

function TrainingTable() {
  const [state, setState] = useState<TableLoad | null>(null);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (
        e.source !== parent ||
        e.origin !== location.origin ||
        e.data?.channel !== MESSAGE
      )
        return;
      if (e.data.kind === "reset") {
        setState(null);
        return;
      }
      if (e.data.kind === "load") setState(e.data.state);
    };
    window.addEventListener("message", onMessage);
    parent.postMessage({ channel: MESSAGE, kind: "ready" }, location.origin);
    const stop = observeTable(document, (snapshot, error) =>
      parent.postMessage(
        { channel: MESSAGE, kind: "snapshot", snapshot, error },
        location.origin,
      ),
    );
    return () => {
      window.removeEventListener("message", onMessage);
      stop();
    };
  }, []);
  if (!state)
    return <div className="table-connecting">Träningsbordet ansluter…</div>;
  const { node, hero, config } = state;
  const myTurn = node.kind === "decision" && node.player === hero;
  const select = (child: number) =>
    parent.postMessage(
      {
        channel: MESSAGE,
        kind: "action",
        token: state.token,
        handId: state.handId,
        nodeId: node.id,
        child,
      },
      location.origin,
    );
  return (
    <main
      className="table-document"
      data-poker-table
      data-token={state.token}
      data-hand-id={state.handId}
      data-revision={state.revision}
      data-config-key={state.configKey}
      data-node-id={node.id}
      data-hero={hero}
      data-street="river"
    >
      <div className="table-caption">
        <span>Heads-up · NL Hold’em</span>
        <span>Träningsbord · bb</span>
      </div>
      <div className="poker-stage">
        <div className="felt">
          <div className="felt-inner">
            <span className="felt-brand">POKER / STUDY</span>
            <div className="pot-label">
              Pott{" "}
              <strong>
                <span data-pot>{node.pot}</span> bb
              </strong>
            </div>
            <div className="board-cards" data-board>
              {node.board.map((c) => (
                <Card key={c} card={c} />
              ))}
            </div>
            <span className="street-on-felt">
              River · {config.pot} bb vid start
            </span>
          </div>
        </div>
        <div
          className={`seat opponent ${!myTurn && node.kind === "decision" ? "acting" : ""}`}
        >
          <div className="seat-avatar">V</div>
          <div className="seat-details">
            <strong>
              Motståndare{" "}
              <span className="position">
                {hero === 0 ? "BTN / IP" : "BB / OOP"}
              </span>
            </strong>
            <span>
              Stack <b data-stack={1 - hero}>{node.stacks[1 - hero]}</b> bb
            </span>
          </div>
          <div className="hole mini">
            <Card back small />
            <Card back small />
          </div>
        </div>
        <div className={`seat hero ${myTurn ? "acting" : ""}`}>
          <div className="seat-avatar">J</div>
          <div className="seat-details">
            <strong>
              Du{" "}
              <span className="position">
                {hero === 0 ? "BB / OOP" : "BTN / IP"}
              </span>
            </strong>
            <span>
              Stack <b data-stack={hero}>{node.stacks[hero]}</b> bb
            </span>
          </div>
          <div className="hole" data-hole>
            {state.heroCards.map((c) => (
              <Card key={c} card={c} small />
            ))}
          </div>
        </div>
        <span
          className="dealer-chip"
          style={{ top: hero === 0 ? "39px" : "270px" }}
        >
          D
        </span>
        {node.stacks[0] !== node.stacks[1] && (
          <div className="bet-chip">
            <span>●</span> {Math.abs(node.stacks[0] - node.stacks[1])} bb
          </div>
        )}
      </div>
      <div className="table-actions" aria-label="Dina pokerhandlingar">
        {node.kind === "terminal" ? (
          <span className="table-message">Övningshanden är avslutad</span>
        ) : !myTurn ? (
          <span className="table-message">Motståndaren tänker…</span>
        ) : (
          node.actions.map((a, i) => (
            <button
              key={a.child}
              disabled={state.locked}
              onClick={() => select(a.child)}
              title={`Ytterligare ${actionCost(node, a, config.stack)} bb`}
            >
              <kbd>{i + 1}</kbd>
              <span>{actionName(a.label)}</span>
              {!["fold", "check"].includes(a.label) && (
                <b>
                  {a.amount_to !== null
                    ? `${a.amount_to} bb`
                    : `${actionCost(node, a, config.stack)} bb`}
                </b>
              )}
            </button>
          ))
        )}
      </div>
      <p className="table-note">
        Bet / Raise visar totalt på river. Call visar beloppet att lägga till.
        Inga riktiga pengar.
      </p>
      <ol data-history hidden>
        {state.history.map((h, i) => (
          <li
            key={i}
            data-player={h.player}
            data-street={h.street}
            data-action={h.action}
            data-amount={h.amount}
          >
            {h.description}
          </li>
        ))}
      </ol>
      <KeyboardActions
        enabled={myTurn && !state.locked}
        actions={node.actions.map((a) => a.child)}
        onAction={select}
      />
    </main>
  );
}
function KeyboardActions({
  enabled,
  actions,
  onAction,
}: {
  enabled: boolean;
  actions: number[];
  onAction: (a: number) => void;
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        enabled &&
        !e.ctrlKey &&
        !e.altKey &&
        /^[1-9]$/.test(e.key) &&
        actions[Number(e.key) - 1] !== undefined
      ) {
        e.preventDefault();
        onAction(actions[Number(e.key) - 1]);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [enabled, actions, onAction]);
  return null;
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TrainingTable />
  </React.StrictMode>,
);
