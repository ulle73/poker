import {it,expect} from 'vitest';
import {prepareDecision} from '../src/decision/adapter';
import {prepareMonker,buildMonkerPlan} from '../src/monker/config';
import {monkerSnapshot} from './helpers/monker';
it('builds legal, cent-exact current decisions and preserves first position on river',()=>{
  const s=monkerSnapshot(),c=prepareMonker(s,prepareDecision(s)),p=buildMonkerPlan(c);
  expect(p.nodes[0].state.actor).toBe(0);
  expect(p.nodes[p.decision-1].actions.map(a=>[a.kind,a.to])).toEqual([['check',0],['bet',40],['bet',160]]);
  expect(p.nodes.filter(n=>n.state.street==='river'&&!n.state.terminal&&n.state.currentBet===0).some(n=>n.state.actor===0)).toBe(true);
  expect(p.tree.length).toBeGreaterThan(100);
});
it('binds a non-model observed sizing to its exact current state',()=>{
  const s=monkerSnapshot(3,0);s.players[2].bet=0.37;s.players[2].stack=1.23;s.pot=1.17;s.availableActions=['Fold','Syna','Höj'];
  const c=prepareMonker(s,prepareDecision(s)),p=buildMonkerPlan(c),node=p.nodes[p.decision-1];
  expect(node.state.bets).toEqual([0,0,37]);expect(node.state.actor).toBe(0);
  expect(node.actions.some(a=>a.kind==='call'&&a.cost===37)).toBe(true);
});
it('models only callable chips of the tallest stack and never labels that bet as the actual player all-in',()=>{
  const s=monkerSnapshot();s.players[0].stack=3;
  const p=buildMonkerPlan(prepareMonker(s,prepareDecision(s)));
  expect(p.effectiveStacks).toEqual([160,160,160]);
  expect(p.nodes[0].actions.find(a=>a.to===160)?.kind).toBe('bet');
});
