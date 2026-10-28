import { normalizeCards } from "./cards.ts";
import type { TrainingConfig } from "./types";

export function validateConfig(value: unknown): TrainingConfig {
  if (!value || typeof value !== "object")
    throw new Error("Konfigurationen saknas.");
  const c = value as TrainingConfig;
  const board = normalizeCards(c.board);
  if (board.length !== 5)
    throw new Error("MVP:n löser river: ange exakt fem bordskort.");
  for (const r of [c.oopRange, c.ipRange]) {
    if (
      typeof r !== "string" ||
      !r.trim() ||
      r.length > 512 ||
      !/^([2-9TJQKAshdc,:+.\-\s])+$/i.test(r)
    )
      throw new Error(
        "Ogiltig range. Använd standardnotation, till exempel TT+,ATs+,AhKh.",
      );
  }
  for (const n of [c.pot, c.stack])
    if (!Number.isFinite(n) || n <= 0 || n > 1000)
      throw new Error("Pott och effektiv stack måste vara 0–1 000 bb.");
  for (const sizes of [c.betSizes, c.raiseSizes]) {
    if (
      !Array.isArray(sizes) ||
      sizes.length < 1 ||
      sizes.length > 3 ||
      sizes.some((n) => !Number.isFinite(n) || n < 10 || n > 200) ||
      new Set(sizes).size !== sizes.length
    )
      throw new Error("Ange 1–3 unika storlekar mellan 10 och 200 % av pott.");
  }
  if (
    !Number.isInteger(c.maxIterations) ||
    c.maxIterations < 100 ||
    c.maxIterations > 5000
  )
    throw new Error("Iterationsgränsen måste vara 100–5 000.");
  if (!Number.isFinite(c.targetPct) || c.targetPct < 0.01 || c.targetPct > 2)
    throw new Error("Målfel måste vara 0,01–2 % av rotpotten.");
  return {
    board,
    oopRange: c.oopRange.trim(),
    ipRange: c.ipRange.trim(),
    pot: c.pot,
    stack: c.stack,
    betSizes: [...c.betSizes],
    raiseSizes: [...c.raiseSizes],
    maxIterations: c.maxIterations,
    targetPct: c.targetPct,
  };
}
export function configKey(c: TrainingConfig): string {
  return JSON.stringify(validateConfig(c));
}
export function configToToml(c: TrainingConfig): string {
  const v = validateConfig(c);
  return (
    `board = "${v.board.join(" ")}"\noop_range = "${v.oopRange}"\nip_range = "${v.ipRange}"\nstarting_pot = ${v.pot}\neffective_stack = ${v.stack}\nraise_cap = 1\nallin_threshold = 100.0\nmax_iterations = ${v.maxIterations}\ntarget_exploitability = ${v.targetPct}\n\n` +
    ["oop", "ip"]
      .map(
        (p) =>
          `[sizings.${p}.river]\nbet = { percents = [${v.betSizes.join(", ")}], allin = true }\nraise = { percents = [${v.raiseSizes.join(", ")}], allin = true }\n`,
      )
      .join("\n")
  );
}
