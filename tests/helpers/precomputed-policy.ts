import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cardCode } from "phe";
import { legalActions } from "../../src/decision/betting";
import { cardInformationKey, createCardInformation } from "../../src/decision/card-information";
import type { DecisionInput, DecisionPolicy } from "../../src/decision/types";

const format = "raised-postflop-average-policy-v1";
const digest = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");

function modelIdentity(input: DecisionInput) {
  return digest(JSON.stringify({
    hero: input.hero, board: input.board, seats: input.seats, ranges: input.ranges,
    state: input.state, rules: input.rules, rootKinds: input.rootKinds ?? null,
  }));
}

interface Manifest {
  format: string;
  modelSha256: string;
  tables: { history: string; actionIds: readonly string[]; rowCount: number; sha256: string }[];
}

export function savePrecomputedPolicy(dir: string, input: DecisionInput, policy: DecisionPolicy) {
  if (!policy.trainedTables) throw new Error("Training policy cannot export tables");
  mkdirSync(dir);
  const manifest: Manifest = { format, modelSha256: modelIdentity(input), tables: [] };
  let bytes = 0;
  let rowCount = 0;
  for (const { history, actionIds, rows } of policy.trainedTables()) {
    const ordered = [...rows].sort(([a], [b]) => a - b);
    if (!ordered.length) continue;
    const stride = 8 * (1 + actionIds.length);
    const buffer = Buffer.alloc(ordered.length * stride);
    ordered.forEach(([key, frequencies], index) => {
      const offset = index * stride;
      if (frequencies.length !== actionIds.length) throw new Error("Invalid trained row width");
      buffer.writeDoubleLE(key, offset);
      frequencies.forEach((frequency, action) => buffer.writeDoubleLE(frequency, offset + 8 * (action + 1)));
    });
    writeFileSync(join(dir, `${manifest.tables.length}.bin`), buffer, { flag: "wx" });
    manifest.tables.push({ history, actionIds, rowCount: ordered.length, sha256: digest(buffer) });
    bytes += buffer.length;
    rowCount += ordered.length;
  }
  const root = manifest.tables.find((table) => table.history === input.state.history);
  if (!root?.rowCount) throw new Error("Profile has no trained root rows");
  const contents = JSON.stringify(manifest, null, 2) + "\n";
  writeFileSync(join(dir, "manifest.json"), contents, { flag: "wx" });
  return { tables: manifest.tables.length, bytes, rows: rowCount, rootRows: root.rowCount,
    modelSha256: manifest.modelSha256, manifestSha256: digest(contents) };
}

export function openPrecomputedPolicy(dir: string, input: DecisionInput, scope: "root" | "all") {
  const contents = readFileSync(join(dir, "manifest.json"), "utf8");
  const manifest = JSON.parse(contents) as Manifest;
  if (manifest.format !== format || manifest.modelSha256 !== modelIdentity(input))
    throw new Error("Precomputed strategy does not match the requested model");
  const tables = new Map<string, { data: Buffer; actionIds: readonly string[]; rowCount: number }>();
  manifest.tables.forEach(({ history, sha256, actionIds, rowCount }, index) => {
    if (scope === "root" && history !== input.state.history) return;
    const data = readFileSync(join(dir, `${index}.bin`));
    if (!Number.isSafeInteger(rowCount) || rowCount < 1 || !actionIds.length
      || data.length !== rowCount * 8 * (actionIds.length + 1) || digest(data) !== sha256
      || tables.has(history)) throw new Error("Precomputed table integrity check failed");
    tables.set(history, { data, actionIds, rowCount });
  });
  if (!tables.has(input.state.history)) throw new Error("Missing precomputed root table");
  const cardInfo = createCardInformation(input.ranges, 250_000);
  const policy: DecisionPolicy = {
    query(state, ownCards, visibleBoard) {
      if (scope === "root" && state.history !== input.state.history)
        throw new Error("Root lookup cannot serve a continuation");
      if (ownCards.length !== 2 || visibleBoard.length !== state.boardCount
        || [...ownCards, ...visibleBoard].some((card) => !Number.isInteger(card) || card < 0 || card >= 52)
        || new Set([...ownCards, ...visibleBoard]).size !== 2 + visibleBoard.length)
        throw new Error("Precomputed lookup requires a legal private hand and visible board");
      if (rootBoardCodes.some((card, index) => visibleBoard[index] !== card))
        throw new Error("Precomputed lookup board differs from the root model");
      const atRoot = state.history === input.state.history;
      if (atRoot && JSON.stringify(state) !== rootState)
        throw new Error("Precomputed lookup state differs from the root model");
      const actions = legalActions(state, input.rules).filter((action) => !atRoot || !input.rootKinds
        || input.rootKinds.includes(action.kind));
      if (!actions.length) throw new Error("Precomputed lookup requires an acting decision");
      const table = tables.get(state.history);
      if (table) {
        if (table.actionIds.length !== actions.length
          || actions.some((action, index) => action.id !== table.actionIds[index]))
          throw new Error("Precomputed actions differ from legal actions");
        const { data, rowCount } = table;
        const stride = 8 * (1 + actions.length);
        const key = cardInformationKey(ownCards, visibleBoard, cardInfo);
        let low = 0, high = rowCount - 1;
        while (low <= high) {
          const middle = (low + high) >>> 1;
          const offset = middle * stride;
          const candidate = data.readDoubleLE(offset);
          if (candidate === key) return {
            actions, trained: true,
            frequencies: actions.map((_, index) => data.readDoubleLE(offset + 8 * (index + 1))),
          };
          if (candidate < key) low = middle + 1;
          else high = middle - 1;
        }
      }
      return { actions, trained: false, frequencies: actions.map(() => 1 / actions.length) };
    },
  };
  const rootBoardCodes = input.board.map((card) => cardCode(card[0], card[1]));
  const rootState = JSON.stringify(input.state);
  return { policy, manifestSha256: digest(contents) };
}
