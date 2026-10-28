import { useState } from "react";
import { normalizeCards } from "../core/cards";
import { validateConfig } from "../core/config";
import type { TrainingConfig, Player } from "../core/types";
export function ConfigLab({
  config,
  busy,
  onApply,
}: {
  config: TrainingConfig;
  busy: boolean;
  onApply: (config: TrainingConfig, hero: Player, cards: string[]) => void;
}) {
  const [form, setForm] = useState({
    board: config.board.join(" "),
    cards: "Kc Kd",
    hero: "0",
    oopRange: config.oopRange,
    ipRange: config.ipRange,
    pot: String(config.pot),
    stack: String(config.stack),
    betSizes: config.betSizes.join(", "),
    raiseSizes: config.raiseSizes.join(", "),
    maxIterations: String(config.maxIterations),
    targetPct: String(config.targetPct),
  });
  const [error, setError] = useState("");
  const field = (key: keyof typeof form, label: string, wide = false) => (
    <label className={wide ? "full" : ""}>
      {label}
      <input
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        autoComplete="off"
        spellCheck={false}
      />
    </label>
  );
  return (
    <section className="lab panel">
      <div className="panel-heading">
        <h2>Eget riverscenario</h2>
        <span className="quiet-badge">Range mot range</span>
      </div>
      <p>
        Bygg din egen studie. Rangerna beskriver händerna som når början av
        river; de härleds inte automatiskt från tidigare gator.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          try {
            const cards = normalizeCards(form.cards);
            if (cards.length !== 2) throw new Error("Ange exakt två hålkort.");
            const c = validateConfig({
              ...form,
              board: normalizeCards(form.board),
              pot: Number(form.pot),
              stack: Number(form.stack),
              betSizes: form.betSizes.split(",").map(Number),
              raiseSizes: form.raiseSizes.split(",").map(Number),
              maxIterations: Number(form.maxIterations),
              targetPct: Number(form.targetPct),
            });
            normalizeCards([...c.board, ...cards]);
            onApply(c, Number(form.hero) as Player, cards);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <div className="form-grid">
          {field("board", "Bordskort · fem kort", true)}
          {field("cards", "Dina hålkort")}
          <label>
            Din position
            <select
              value={form.hero}
              onChange={(e) => setForm({ ...form, hero: e.target.value })}
            >
              <option value="0">BB / OOP · först att agera</option>
              <option value="1">BTN / IP · sist att agera</option>
            </select>
          </label>
          {field("oopRange", "OOP range", true)}
          {field("ipRange", "IP range", true)}
          {field("pot", "Pott vid riverstart · bb")}
          {field("stack", "Effektiv stack bakom · bb")}
          {field("betSizes", "Betstorlekar · % av pott")}
          {field("raiseSizes", "Raise · % av pott efter call")}
          {field("maxIterations", "Max iterationer")}
          {field("targetPct", "Målfel · % av rotpott")}
        </div>
        <p className="microcopy">
          Exempel: TT+, ATs+, KQo eller AhKh. 1–3 storlekar, separerade med
          kommatecken. All-in ingår. Högst en raise per gata.
        </p>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy} type="submit">
          {busy ? "Beräknar…" : "Lös och öppna träningsbord"}
        </button>
      </form>
    </section>
  );
}
