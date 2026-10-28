import { handKey, normalizeCards } from "./cards";
import type {
  SolvedNode,
  SolvedHand,
  TableSnapshot,
  TreeAction,
} from "./types";

export function actionCost(
  node: SolvedNode,
  action: TreeAction,
  startingStack: number,
): number {
  const p = node.player ?? 0;
  if (action.label === "fold" || action.label === "check") return 0;
  if (action.label === "call")
    return Math.max(0, node.stacks[p] - node.stacks[1 - p]);
  if (action.label === "allin") return node.stacks[p];
  return Math.max(
    0,
    (action.amount_to ?? 0) - (startingStack - node.stacks[p]),
  );
}
export function adviceFor(
  node: SolvedNode | undefined,
  cards: string[],
): SolvedHand | null {
  if (!node || node.kind !== "decision") return null;
  let key: string;
  try {
    key = handKey(cards);
  } catch {
    return null;
  }
  const h = node.hands.find((h) => handKey(h.cards) === key);
  if (
    !h ||
    h.weight <= 1e-8 ||
    h.compatibleMass <= 1e-8 ||
    h.ev === null ||
    !Number.isFinite(h.ev)
  )
    return null;
  if (
    h.frequencies.length !== node.actions.length ||
    h.frequencies.some((f) => !Number.isFinite(f) || f < 0) ||
    Math.abs(h.frequencies.reduce((a, b) => a + b, 0) - 1) > 0.002
  )
    return null;
  return h;
}
export function validateSnapshot(
  value: unknown,
  expected: {
    token: string;
    handId: string;
    configKey: string;
    node: SolvedNode;
  },
): value is TableSnapshot {
  try {
    const s = value as TableSnapshot;
    const n = expected.node;
    if (
      !s ||
      s.version !== 1 ||
      s.source !== "local-training-dom" ||
      s.token !== expected.token ||
      s.handId !== expected.handId ||
      s.configKey !== expected.configKey ||
      s.nodeId !== n.id
    )
      return false;
    if (
      !Number.isInteger(s.revision) ||
      s.revision < 0 ||
      ![0, 1].includes(s.hero) ||
      s.street !== "river"
    )
      return false;
    if (
      Date.now() - s.capturedAt > 4000 ||
      s.capturedAt > Date.now() + 1000 ||
      !Number.isFinite(s.capturedAt)
    )
      return false;
    if (
      normalizeCards(s.heroCards).length !== 2 ||
      normalizeCards([...s.board, ...s.heroCards]).length !== 7
    )
      return false;
    if (
      s.board.join(" ") !== n.board.join(" ") ||
      Math.abs(s.pot - n.pot) > 0.0001 ||
      !Number.isFinite(s.pot)
    )
      return false;
    if (
      !Array.isArray(s.stacks) ||
      s.stacks.length !== 2 ||
      s.stacks.some(
        (x, i) => !Number.isFinite(x) || Math.abs(x - n.stacks[i]) > 0.0001,
      )
    )
      return false;
    if (
      !Array.isArray(s.history) ||
      s.history.length > 100 ||
      s.history.some(
        (h) =>
          !h ||
          !["preflop", "flop", "turn", "river"].includes(h.street) ||
          ![0, 1].includes(h.player) ||
          typeof h.action !== "string" ||
          typeof h.description !== "string" ||
          !Number.isFinite(h.amount) ||
          h.amount < 0,
      )
    )
      return false;
    return true;
  } catch {
    return false;
  }
}
export function actionName(label: string): string {
  return (
    (
      {
        fold: "Fold",
        check: "Check",
        call: "Call",
        bet: "Bet",
        raise: "Raise",
        allin: "All-in",
      } as Record<string, string>
    )[label] ?? label
  );
}
export function actionGroup(label: string): "fold" | "call" | "raise" {
  return label === "fold"
    ? "fold"
    : label === "check" || label === "call"
      ? "call"
      : "raise";
}
export function matchLine(nodes: SolvedNode[], line: string[]): number {
  let id = 0;
  for (const token of line) {
    const n = nodes.find((n) => n.id === id)!;
    const [label, size] = token.split(":");
    const a = n.actions.find(
      (a) =>
        a.label === label &&
        (size === undefined ||
          Math.abs((a.percent_of_pot ?? -100) - Number(size)) < 0.1),
    );
    if (!a) throw new Error(`Startlinjen ${token} finns inte i lösningen.`);
    id = a.child;
  }
  return id;
}
