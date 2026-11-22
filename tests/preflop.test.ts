import {describe,it,expect} from 'vitest';
import {PreflopTracker} from '../src/preflop/history';
import {preflopDecision} from '../src/preflop/strategy';
import {DecisionContext} from '../src/decision/context';
import {preflopSnapshot,changed} from './helpers/preflop';
import type {PreflopLibrary} from '../src/preflop/types';
// Deliberately different hand/position mixes catch hardcoded top-percent advice.
const library:PreflopLibrary={schema:1,source:'artgto',archiveSha256:'a'.repeat(64),order:['AQo','72o'],
 nodes:{'CO|':[{token:'RFI',bb:2,weights:[10000,0]}],
  'BU|UTG_RFI':[{token:'3bet',bb:7,weights:[2500,0]},{token:'call',bb:2,weights:[5000,0]}],
  'UTG|UTG_RFI_BU_3bet':[{token:'4bet',bb:20,weights:[1000,0]},{token:'call',bb:7,weights:[7000,0]}],
  'UTG|':[{token:'RFI',bb:2,weights:[10000,0]}]},
 hu:{source:'holdemmath',depths:[10],order:['AQo','72o'],data:{'10':{SB:{s:[0]},'BB|SB':{s:[0]}}}},
 metadata:{rangeFiles:2606,nodes:4,depthBB:100,license:'personal',rake:'not documented'}};
describe('preflop action context',()=>{
 it('keeps independently visible blinds while hero cards are being dealt',()=>{
  const s=preflopSnapshot(2), ctx=new DecisionContext();
  const dealing={...structuredClone(s),valid:false,heroCards:[],issues:['Dina två kort är inte synliga.']};
  ctx.observe(dealing);
  const complete=changed(s,1,.02);
  expect(ctx.prepare(complete).preflop).toMatchObject({bigBlind:2,steps:[{seat:1,kind:'call',to:2}]});
  const ambiguous=new DecisionContext();
  ambiguous.observe({...dealing,pot:.05});
  expect(ambiguous.prepare(complete).preflop?.error).toMatch(/blind/i);
 });
 it('recovers when a new hand is observed before either blind has appeared',()=>{
  const t=new PreflopTracker(),s=preflopSnapshot();const unposted=structuredClone(s);unposted.players.forEach(p=>{p.stack=2;p.bet=0;});unposted.pot=0;
  t.observe(unposted);t.observe(s);expect(t.facts(s)?.bigBlind).toBe(2);expect(t.facts(s)?.error).toBeUndefined();
 });
 it.each([1,2])('recovers when only blind seat %i has appeared in the first snapshot',(posted)=>{
  const t=new PreflopTracker(),s=preflopSnapshot(),partial=structuredClone(s);
  partial.players.forEach(p=>{if(p.seat!==posted){p.stack=2;p.bet=0;}});partial.pot=posted===1?.01:.02;
  t.observe(partial);t.observe(s);expect(t.facts(s)?.error).toBeUndefined();expect(t.facts(s)?.bigBlind).toBe(2);
 });
 it('rejects pot growth not explained by observed contributions',()=>{
  const t=new PreflopTracker();const s=preflopSnapshot();t.observe(s);const gap=changed(s,3,.04);gap.pot!+=.02;t.observe(gap);
  expect(t.facts(gap)?.error).toMatch(/pott|pengar|historik/i);
 });
 it('waits through a transient pot animation then recovers the same observed raise',()=>{
  const t=new PreflopTracker(),s=preflopSnapshot();t.observe(s);const settled=changed(s,3,.04),animation=structuredClone(settled);animation.pot=s.pot;
  t.observe(animation);expect(t.facts(animation)?.error).toMatch(/pott|pengar|historik/i);
  t.observe(settled);expect(t.facts(settled)?.error).toBeUndefined();expect(t.facts(settled)?.steps).toEqual([{seat:3,kind:'raise',to:4}]);
 });
 it('keeps original six seats and both raises after players fold',()=>{
  const t=new PreflopTracker();let s=preflopSnapshot(2);t.observe(s);
  s=changed(s,3,.04);t.observe(s);s=changed(s,6,.14);s.players[3].folded=true;s.players[3].inHand=false;t.observe(s);
  expect(t.facts(s)).toMatchObject({bigBlind:2,participants:[1,2,3,4,5,6],steps:[{seat:3,kind:'raise',to:4},{seat:6,kind:'raise',to:14},{seat:4,kind:'fold',to:0}]});
 });
 it('rejects skipped multiple contributions instead of inventing their order',()=>{
  const t=new PreflopTracker();const s=preflopSnapshot();t.observe(s);
  const n=changed(changed(s,3,.04),4,.14);t.observe(n);expect(t.facts(n)?.error).toMatch(/ordning|historik/i);
 });
 it('recovers a unique first open from intact blinds and accounted pot',()=>{
  const t=new PreflopTracker();const s=changed(preflopSnapshot(5),3,.04);t.observe(s);
  expect(t.facts(s)).toMatchObject({bigBlind:2,steps:[{seat:3,kind:'raise',to:4}]});
  const broken=structuredClone(s);broken.pot!+=.08;const bad=new PreflopTracker();bad.observe(broken);expect(bad.facts(broken)?.error).toBeTruthy();
 });
 it('does not guess blinds when the small blind has already raised',()=>{
  const s=changed(preflopSnapshot(),1,.08);const t=new PreflopTracker();t.observe(s);expect(t.facts(s)?.error).toMatch(/blind/i);
 });
});
describe('source chart decisions',()=>{
 it('uses position and exact source frequencies rather than top 50 percent',()=>{
  const ctx=new DecisionContext();const s=preflopSnapshot();s.players.filter(p=>[3,4].includes(p.seat)).forEach(p=>{p.folded=true;p.inHand=false;});const result=preflopDecision(s,ctx.prepare(s),library);
  expect(result.quality).toBe('chart-reference');expect(result.actions.find(a=>a.kind==='raise')).toMatchObject({to:4,frequency:1});
  s.heroCards=['7s','2d'];expect(preflopDecision(s,ctx.prepare(s),library).actions.find(a=>a.kind==='fold')?.frequency).toBe(1);
 });
 it('binds a prior open and a second raise to the correct decision',()=>{
  const c=new DecisionContext();let s=preflopSnapshot(2);c.observe(s);s=changed(s,3,.04);c.observe(s);s=changed(s,6,.14);s.players.filter(p=>[1,2,4,5].includes(p.seat)).forEach(p=>{p.folded=true;p.inHand=false;});c.observe(s);
  const r=preflopDecision(s,c.prepare(s),library);
  expect(r.actions.map(a=>[a.kind,a.to,a.frequency])).toEqual([['fold',4,.2],['call',14,.7],['raise',40,.1]]);
 });
 it('rejects a mismatching earlier raise size and missing line data',()=>{
  const c=new DecisionContext();let s=preflopSnapshot(5);c.observe(s);s=changed(s,3,.08);c.observe(s);
  expect(()=>preflopDecision(s,c.prepare(s),library)).toThrow(/storlek|BB/i);
 });
 it('rejects a 25bb cash stack rather than treating it as 100bb',()=>{
  const s=preflopSnapshot();s.players[4].stack=.5;const c=new DecisionContext();
  expect(()=>preflopDecision(s,c.prepare(s),library)).toThrow(/stack|BB/i);
 });
 it('keeps a deep reference when a shorter opponent is still seated behind hero',()=>{
  const s=preflopSnapshot();s.players[4].stack=2.38;s.players[0].stack=.85;s.players[1].stack=2.76;
  s.players.filter(p=>[3,4].includes(p.seat)).forEach(p=>{p.folded=true;p.inHand=false;});
  const c=new DecisionContext(),r=preflopDecision(s,c.prepare(s),library);
  expect(r.quality).toBe('chart-reference');expect(r.reference?.actualDepthBB).toBe(119);
  expect(r.reference?.activeDepthsBB).toContain(43);expect(r.assumptions.join(' ')).toMatch(/43/);
 });
 it('still rejects a short effective contest when all remaining opponents are short',()=>{
  const s=preflopSnapshot();s.players[4].stack=2.38;
  s.players.filter(p=>!p.hero).forEach(p=>{p.stack=.86-p.bet!;});
  const c=new DecisionContext();expect(()=>preflopDecision(s,c.prepare(s),library)).toThrow(/effektiv|BB/i);
 });
 it('does not advise a late seat while an earlier unacted live seat remains pending',()=>{
  const s=preflopSnapshot(),c=new DecisionContext();expect(()=>preflopDecision(s,c.prepare(s),library)).toThrow(/tur|handling/i);
 });
 it('uses real heads-up short-stack data only for a two-seat hand',()=>{
  const s=preflopSnapshot(0,2);s.players.forEach(p=>p.stack=.2-p.bet!);const c=new DecisionContext();
  const r=preflopDecision(s,c.prepare(s),library);expect(r.actions.find(a=>a.kind==='raise')).toMatchObject({to:20,allIn:true,frequency:1});
  expect(r.provider).toBe('holdemmath-preflop');
 });
});
