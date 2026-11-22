import {describe,it,expect} from 'vitest';
import {prepareDecision} from '../src/decision/adapter';
import {parseRange} from '../src/decision/sampler';
import {TOP_50_RANGE,prepareMonker,encodeMonkerRequest,buildMonkerPlan} from '../src/monker/config';
import {monkerSnapshot} from './helpers/monker';
describe('Monker request and model priors',()=>{
  it('expands exactly 50 percent weighted mass without pruning the opponents by known hero cards',()=>{
    const all=parseRange(TOP_50_RANGE);expect(all.reduce((s,h)=>s+h.weight,0)).toBe(663);
    const s=monkerSnapshot(6),request=prepareMonker(s,prepareDecision(s));
    expect(request.ranges[1].length).toBe(1128);
    expect(request.ranges[1].some(h=>h.cards.includes('Kh'))).toBe(true);
    expect(request.ranges[0].length).toBeLessThan(672);
    expect(request.limitPct).toBe(2.1);
    expect(request.stacks).toEqual([160,160,160,160,160,160]);
    expect(request.pot).toBe(80);
    expect(encodeMonkerRequest(request).byteLength).toBeGreaterThan(50000);
  });
  it('keeps explicit weighted hero and opponent ranges instead of replacing them by the preset',()=>{
    const s=monkerSnapshot(),i=prepareDecision(s,{ranges:{1:'Kh8d:0.5,Kd8c',2:'AA:0.2,QQ'}});
    const r=prepareMonker(s,i);
    expect(r.ranges[0]).toHaveLength(2);
    expect(r.ranges[0].find(h=>h.cards.includes('Kh'))!.weight).toBe(0.5);
    expect(r.ranges[1]).toHaveLength(12);
  });
  it('models earlier checks and keeps the original first-to-act seat for river',()=>{
    const s=monkerSnapshot(4,2),r=prepareMonker(s,prepareDecision(s));
    expect(r.prefix).toEqual([1,1]);expect(r.hero).toBe(2);
  });
  it('represents an observed arbitrary bet and does not silently round it to a model size',()=>{
    const s=monkerSnapshot(3,0);s.players[2].bet=0.37;s.players[2].stack=1.23;s.pot=1.17;
    s.availableActions=['Fold','Syna','Höj till'];
    const r=prepareMonker(s,prepareDecision(s));
    expect(r.prefix).toEqual([1,1,48]);expect(r.stacks).toEqual([160,160,160]);expect(r.pot).toBe(80);
  });
  it('rejects an ambiguous line and a hero hand excluded by its own requested prior',()=>{
    const s=monkerSnapshot();s.players[0].bet=0.1;s.players[1].bet=0.2;s.pot=1.1;
    expect(()=>prepareMonker(s,prepareDecision(s))).toThrow(/linje|insats/i);
    const weak=monkerSnapshot();weak.heroCards=['7h','2d'];
    expect(()=>prepareMonker(weak,prepareDecision(weak))).toThrow(/range/i);
  });
  it('recognizes an effective all-in bet even when the bettor retains uncallable chips',()=>{
    const s=monkerSnapshot();s.players[2].bet=1.6;s.players[2].stack=1.4;s.pot=2.4;s.availableActions=['Fold','Syna'];
    const c=prepareMonker(s,prepareDecision(s));expect(c.prefix).toEqual([1,1,3]);
    const plan=buildMonkerPlan(c);expect(plan.nodes[plan.decision-1].state.bets).toEqual([0,0,160]);
  });
});
