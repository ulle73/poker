import { expect, it } from "vitest";
import {
  backupSession,
  loadBackup,
  loadSession,
  saveSession,
  parseSessionImport,
  summarizeSession,
} from "../src/core/session";
import { DRILLS } from "../src/core/drills";
const record = {
  id: "decision-1",
  at: "2026-10-28T00:00:00Z",
  drill: "Fånga bluffen",
  cards: ["Th", "Tc"],
  board: DRILLS[0].config.board,
  action: "Call",
  frequency: 0.5,
  evLoss: 0,
  exploitabilityPct: 0.05,
  config: DRILLS[0].config,
  nodeId: 1,
  player: 1,
  actions: [{ label: "call", frequency: 1, amountTo: null }],
};
it("persists bounded training records and recovers from corrupt storage", () => {
  localStorage.clear();
  expect(loadSession()).toEqual([]);
  localStorage.setItem("poker-trainer-session-v1", "{broken");
  expect(loadSession()).toEqual([]);
  expect(() => parseSessionImport("{broken")).toThrow();
  expect(() =>
    parseSessionImport(
      JSON.stringify({ version: 1, records: [{ frequency: 200 }] }),
    ),
  ).toThrow();
  saveSession([]);
  expect(loadSession()).toEqual([]);
  expect(summarizeSession([])).toEqual({
    count: 0,
    supported: 0,
    meanLoss: null,
  });
});
it("retains a recoverable backup independently of a reset or file download", () => {
  expect(backupSession([record])).toBe(true);
  saveSession([]);
  expect(loadSession()).toEqual([]);
  expect(loadBackup()).toEqual([record]);
  saveSession(loadBackup());
  expect(loadSession()).toEqual([record]);
});
it("rejects malformed imported arrays and invalid numeric payloads before saving", () => {
  const text = (r: unknown) => JSON.stringify({ version: 1, records: [r] });
  expect(parseSessionImport(text(record))).toEqual([record]);
  expect(() =>
    parseSessionImport(text({ ...record, cards: "ThTc" })),
  ).toThrow();
  expect(() => parseSessionImport(text({ ...record, evLoss: -1 }))).toThrow();
  expect(() =>
    parseSessionImport(
      text({
        ...record,
        actions: [{ label: "call", frequency: 2, amountTo: null }],
      }),
    ),
  ).toThrow();
  expect(() =>
    parseSessionImport(
      text({ ...record, board: ["Th", "7d", "2c", "8h", "3d"] }),
    ),
  ).toThrow();
});
