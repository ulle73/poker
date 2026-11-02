import assert from "node:assert/strict";
import { cardCode } from "phe";
import type { BettingAction, DecisionPolicy } from "../../src/decision/types";
import { checkJamInitial, independentCheckJamPublicNodes, type CheckJamSpot } from "./check-jam-oracle";

const key = (cards: readonly string[]) => [...cards].sort().join("");
const texts = new Map<number, string>();
for (const rank of "23456789TJQKA") for (const suit of "shdc")
  texts.set(cardCode(rank, suit), rank + suit);
const decode = (cards: readonly number[]) => cards.map((c) => {
  const value = texts.get(c); assert.ok(value, "Unknown oracle card encoding"); return value;
});

/** Foreign policy rows only: no native payoff, evaluator or CFV is trusted. */
export function nativeAuditProfile(spot: CheckJamSpot, raw: unknown, view:"average"|"current"="average"): DecisionPolicy {
  const data = raw as {
    protocol: string; eligibleForAdvice: boolean;
    request: {board:string[]; ranges:CheckJamSpot["ranges"]; investment:number; stack:number};
    root: {actor:number; dealer:number; pot:number; stacks:number[]; bets:number[]; invested:number[]};
    nodes: {history:string; actor:number; pot:number; stacks:number[]; bets:number[];
      invested:number[]; folded:boolean[]; actions:BettingAction[];
      rows:{cards:string[]; frequencies:number[]; trained:boolean; currentFrequencies?:number[]; currentVisited?:boolean}[]}[];
  };
  assert.equal(data.protocol, "advisor-native-audit-v1");
  assert.equal(data.eligibleForAdvice, false, "Native report cannot self-certify advice");
  assert.deepEqual(data.request.board, spot.board);
  assert.deepEqual(data.request.ranges, spot.ranges);
  assert.equal(data.request.investment, spot.investment);
  assert.equal(data.request.stack, spot.stack);
  const root = checkJamInitial(spot);
  assert.deepEqual(data.root, {actor:0, dealer:root.dealer,
    pot:spot.investment*spot.ranges.length, stacks:root.stacks, bets:root.bets, invested:root.invested});
  const expected = independentCheckJamPublicNodes(spot);
  assert.equal(data.nodes.length, expected.length, "Missing or extra public nodes");
  const nodes = new Map(data.nodes.map((node) => [node.history,node]));
  assert.equal(nodes.size, data.nodes.length, "Duplicate public history");
  const policies = new Map<string, {actions:BettingAction[]; frequencies:number[]; trained:boolean}>();
  for (const {state, actions} of expected) {
    const node = nodes.get(state.history); assert.ok(node, "Missing public history");
    assert.equal(node.actor, state.actor);
    for (const field of ["stacks", "bets", "invested", "folded"] as const)
      assert.deepEqual(node[field], state[field], "Native public state differs: " + field);
    assert.equal(node.pot, state.invested.reduce((a,b)=>a+b,0));
    assert.deepEqual(node.actions, actions, "Native legal actions differ");
    assert.equal(node.rows.length, spot.ranges[state.actor].length);
    const rows = new Map(node.rows.map((row) => [key(row.cards),row]));
    assert.equal(rows.size, node.rows.length, "Duplicate private row");
    for (const hand of spot.ranges[state.actor]) {
      const row = rows.get(key(hand.cards)); assert.ok(row,"Missing private row");
      const frequencies=view==="current"?row.currentFrequencies:row.frequencies;
      const trained=view==="current"?row.currentVisited:row.trained;
      assert.equal(typeof trained, "boolean", "Missing selected policy coverage flag");
      assert.ok(Array.isArray(frequencies), "Missing selected policy frequencies");
      assert.equal(frequencies.length, actions.length);
      assert.ok(frequencies.every((p) => Number.isFinite(p) && p >= 0));
      assert.ok(Math.abs(frequencies.reduce((a,b)=>a+b,0)-1)<1e-9);
      policies.set(state.history+"#"+key(hand.cards),{
        actions:actions.map((a)=>({...a})), frequencies:frequencies.slice(), trained:trained as boolean,
      });
    }
  }
  return {query: (state, own, visible) => {
    assert.equal(key(decode(visible)),key(spot.board),"Query board differs");
    const row=policies.get(state.history+"#"+key(decode(own)));
    assert.ok(row,"Query outside exported own-hand policy");
    return {actions:row.actions.map((a)=>({...a})),frequencies:row.frequencies.slice(),trained:row.trained};
  }};
}
