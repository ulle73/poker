export interface StudyAction { token: string; child: string; amount?: number }
export interface StudyNode {
  type: string; player: number; pot: number; stacks: number[];
  actions: StudyAction[]; reach: number[]; strategy: number[][];
}
export interface FlopStudy {
  root: string; combos: string[]; nodes: Record<string, StudyNode>;
  meta: { exploitability_pct_pot: number; stop: string; backend: string };
}
export const amountBB = (chips: number) => (chips / 100).toLocaleString("sv-SE", {maximumFractionDigits:2}) + " BB";
export function frequency(weight: number) {
  const percent = 100 * weight;
  if (percent > 0 && percent < .005) return "< 0,01 %";
  if (percent >= 99.995 && percent < 100) return "> 99,99 %";
  return percent.toLocaleString("sv-SE", {maximumFractionDigits:2}) + " %";
}
export function actionName(node: StudyNode, a: StudyAction) {
  const stack = node.stacks[node.player], other = node.stacks[1-node.player];
  if (a.token === "call") return "Syna " + amountBB(Math.min(stack, stack-other));
  if (a.token === "check") return "Check";
  if (a.token === "fold") return "Fold";
  if (a.token === "allin") return "All-in till " + amountBB(9750);
  if (a.amount !== undefined && /^(bet|raise)/.test(a.token))
    return (a.token.startsWith("bet") ? "Satsa " : "Höj till ") + amountBB(a.amount);
  throw Error("Okänd handling i flopstudien.");
}
export function studyLines(doc: FlopStudy, board: string) {
  const root = doc.nodes[doc.root];
  // BTN's reach at its first decision is its own unmodified starting range.
  const afterCheck = doc.nodes[root.actions.find(a => a.token === "check")!.child];
  const lines: {id: string; label: string; hands: number[]}[] = [];
  const walk = (id: string, history: string[], reaches: number[][]) => {
    const node = doc.nodes[id];
    if (node.type !== "action") return;
    const rivals = doc.combos.filter((combo,i) => reaches[1-node.player][i] > 0 &&
      !board.includes(combo.slice(0,2)) && !board.includes(combo.slice(2)));
    const hands = doc.combos.flatMap((combo,i) => {
      const a = combo.slice(0,2), b = combo.slice(2);
      if (node.reach[i] <= 0 || board.includes(a) || board.includes(b) ||
          !rivals.some(r => r.slice(0,2) !== a && r.slice(2) !== a && r.slice(0,2) !== b && r.slice(2) !== b)) return [];
      const row = node.strategy[i];
      if (row.length !== node.actions.length || row.some(v => !Number.isFinite(v) || v < 0 || v > 1) ||
          Math.abs(row.reduce((sum,v) => sum+v,0)-1) > 0.0001) return [];
      return [i];
    });
    if (!hands.length) return;
    lines.push({id,label:history.join(" → ") || "BB agerar först",hands});
    node.actions.forEach((action,j) => {
      if (doc.nodes[action.child].type !== "action") return;
      const next = [...reaches];
      next[node.player] = node.reach.map((w,i) => w * node.strategy[i][j]);
      walk(action.child,[...history,(node.player === 0 ? "BB " : "BTN ") + actionName(node,action)],next);
    });
  };
  walk(doc.root,[],[root.reach,afterCheck.reach]);
  return lines;
}
