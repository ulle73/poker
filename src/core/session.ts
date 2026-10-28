import { validateConfig } from "./config";
import { normalizeCards } from "./cards";
import type { TrainingRecord } from "./types";
const KEY = "poker-trainer-session-v1";
export function parseSessionImport(text: string): TrainingRecord[] {
  if (text.length > 3_000_000)
    throw new Error("Sessionsfilen är för stor (max 3 MB).");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Sessionsfilen är inte giltig JSON.");
  }
  if (
    data?.version !== 1 ||
    !Array.isArray(data.records) ||
    data.records.length > 1000
  )
    throw new Error("Fel sessionsformat. Högst 1 000 beslut stöds.");
  for (const r of data.records) {
    if (
      !r ||
      typeof r.id !== "string" ||
      r.id.length > 80 ||
      typeof r.drill !== "string" ||
      r.drill.length > 120 ||
      typeof r.action !== "string" ||
      r.action.length > 80 ||
      !Number.isFinite(Date.parse(r.at)) ||
      !Number.isFinite(r.frequency) ||
      r.frequency < 0 ||
      r.frequency > 1 ||
      !Number.isFinite(r.exploitabilityPct) ||
      r.exploitabilityPct < 0 ||
      r.exploitabilityPct > 1000 ||
      !Number.isInteger(r.nodeId) ||
      ![0, 1].includes(r.player) ||
      !Array.isArray(r.actions) ||
      r.actions.length > 10
    )
      throw new Error("Ett beslut i filen är ogiltigt.");
    if (r.evLoss !== null && (!Number.isFinite(r.evLoss) || r.evLoss < 0))
      throw new Error("Ogiltigt EV-värde.");
    if (
      !Array.isArray(r.cards) ||
      !Array.isArray(r.board) ||
      normalizeCards(r.cards).length !== 2 ||
      normalizeCards(r.board).length !== 5 ||
      normalizeCards([...r.cards, ...r.board]).length !== 7
    )
      throw new Error("Ogiltiga kort.");
    for (const a of r.actions)
      if (
        !a ||
        typeof a.label !== "string" ||
        a.label.length > 40 ||
        !Number.isFinite(a.frequency) ||
        a.frequency < 0 ||
        a.frequency > 1 ||
        (a.amountTo !== null &&
          (!Number.isFinite(a.amountTo) || a.amountTo < 0))
      )
        throw new Error("Ogiltig handlingsfördelning.");
    validateConfig(r.config);
  }
  return data.records;
}
export function loadSession(): TrainingRecord[] {
  try {
    return parseSessionImport(
      localStorage.getItem(KEY) ?? '{"version":1,"records":[]}',
    );
  } catch {
    return [];
  }
}
export function saveSession(records: TrainingRecord[]): boolean {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ version: 1, records: records.slice(-1000) }),
    );
    return true;
  } catch {
    return false;
  }
}
export function backupSession(records: TrainingRecord[]): boolean {
  try {
    localStorage.setItem(
      KEY + "-backup",
      JSON.stringify({ version: 1, records: records.slice(-1000) }),
    );
    return true;
  } catch {
    return false;
  }
}
export function loadBackup(): TrainingRecord[] {
  try {
    return parseSessionImport(
      localStorage.getItem(KEY + "-backup") ?? '{"version":1,"records":[]}',
    );
  } catch {
    return [];
  }
}
export function summarizeSession(records: TrainingRecord[]) {
  const losses = records.flatMap((r) => (r.evLoss === null ? [] : [r.evLoss]));
  return {
    count: records.length,
    supported: records.filter((r) => r.frequency >= 0.01).length,
    meanLoss: losses.length
      ? losses.reduce((a, b) => a + b, 0) / losses.length
      : null,
  };
}
export function downloadJson(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
