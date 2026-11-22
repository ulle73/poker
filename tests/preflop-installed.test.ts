// @vitest-environment node
import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp,copyFile,appendFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {DecisionContext} from '../src/decision/context';
import {DecisionEngine,FreePreflopProvider} from '../src/decision/providers';
import {PreflopClient} from '../src/preflop/client';
import {preflopSnapshot,changed} from './helpers/preflop';
const {PreflopData}=createRequire(import.meta.url)('../electron/preflop-data.cjs');
describe.skipIf(!process.env.POKER_PREFLOP_TEST_DIR)('installed, pinned preflop library',()=>{
 const loader=new PreflopData(process.env.POKER_PREFLOP_TEST_DIR);
 const engine=()=>new DecisionEngine([new FreePreflopProvider(new PreflopClient(()=>loader.load()))]);
 it('produces source decisions for all two-to-six table mappings',async()=>{
  for(const n of [2,3,4,5,6]){
   const s=preflopSnapshot(n===2?0:n-1,n);s.heroCards=['As','Ah'];
   if(n>2)s.players.filter(p=>p.seat>2&&!p.hero).forEach(p=>{p.folded=true;p.inHand=false;});
   const r=await engine().compute(s,new DecisionContext().prepare(s));
   expect(r.status).toBe('ready');if(r.status!=='ready')throw Error(JSON.stringify(r));
   expect(r.result.reference).toMatchObject({modelPlayers:6,tablePlayers:n,modelDepthBB:100,actualDepthBB:100});
   expect(r.result.actions.find(a=>a.kind==='raise')?.frequency).toBe(1);
  }
 });
 it('preserves the concrete-source AQo mix for BB facing BU open',async()=>{
  const c=new DecisionContext();let s=preflopSnapshot(1);c.observe(s);s=changed(s,6,.04);s.players.filter(p=>[1,3,4,5].includes(p.seat)).forEach(p=>{p.folded=true;p.inHand=false;});c.observe(s);
  const r=await engine().compute(s,c.prepare(s));expect(r.status).toBe('ready');if(r.status!=='ready')throw Error(JSON.stringify(r));
  expect(r.result.actions.map(a=>[a.kind,a.to,a.frequency])).toEqual([['call',4,.1002],['raise',19,.8998]]);
 });
 it('selects the four-bet node after an observed open and three-bet',async()=>{
  const c=new DecisionContext();let s=preflopSnapshot(2);c.observe(s);s=changed(s,3,.04);c.observe(s);s=changed(s,6,.14);s.players.filter(p=>[1,2,4,5].includes(p.seat)).forEach(p=>{p.folded=true;p.inHand=false;});c.observe(s);
  const r=await engine().compute(s,c.prepare(s));expect(r.status).toBe('ready');if(r.status!=='ready')throw Error(JSON.stringify(r));
  expect(r.result.actions.map(a=>[a.kind,a.to,a.frequency])).toEqual([['fold',4,.5475],['raise',40,.4525]]);
 });
 it('uses the genuine ten-BB HU call chart rather than the six-max reference',async()=>{
  const c=new DecisionContext();let s=preflopSnapshot(1,2);s.players.forEach(p=>p.stack=.2-p.bet!);s.heroCards=['As','Ah'];c.observe(s);s=changed(s,1,.2);c.observe(s);
  const r=await engine().compute(s,c.prepare(s));expect(r.status).toBe('ready');if(r.status!=='ready')throw Error(JSON.stringify(r));
  expect(r.result.provider).toBe('holdemmath-preflop');expect(r.result.actions).toMatchObject([{kind:'call',to:20,cost:18,allIn:true,frequency:1}]);
 });
 it('rejects a data edit even if the changed JSON remains parseable',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'poker-preflop-test-'));
  try{
   for(const name of ['manifest.json','ranges.json'])await copyFile(path.join(process.env.POKER_PREFLOP_TEST_DIR!,name),path.join(dir,name));
   await appendFile(path.join(dir,'ranges.json'),' ');
   await expect(new PreflopData(dir).load()).rejects.toThrow(/version/);
  }finally{await rm(dir,{recursive:true,force:true});}
 });
 it('returns the HJ source fold for the reported 119bb hero with a 43bb small blind',async()=>{
  const s=preflopSnapshot(3);s.heroCards=['8c','4c'];
  const starts=[.86,2.78,2.16,2.38,2.44,1.07];s.players.forEach((p,i)=>{p.stack=starts[i]-p.bet!;});
  s.players[2].folded=true;s.players[2].inHand=false;
  const r=await engine().compute(s,new DecisionContext().prepare(s));
  expect(r.status).toBe('ready');if(r.status!=='ready')throw Error(JSON.stringify(r));
  expect(r.result.actions).toMatchObject([{kind:'fold',frequency:1}]);
  expect(r.result.reference).toMatchObject({actualDepthBB:119,modelDepthBB:100,activeDepthsBB:[43,139,119,122,53.5]});
 });
 it('reports a missing stack model as unsupported coverage, not a solver failure',async()=>{
  const s=preflopSnapshot();s.players[4].stack=.5;
  expect(await engine().compute(s,new DecisionContext().prepare(s))).toMatchObject({status:'unsupported'});
 });
 it.skipIf(!process.env.POKER_PREFLOP_SHORTSTACK_TEST)('routes all two-to-six mappings through the installed forty-BB source',async()=>{
  for(const n of [2,3,4,5,6]){
   const s=preflopSnapshot(n===2?0:n-1,n);s.heroCards=['As','Ah'];
   s.players.forEach(p=>{p.stack=.81-p.bet!;if(n>2&&p.seat>2&&!p.hero){p.folded=true;p.inHand=false;}});
   const r=await engine().compute(s,new DecisionContext().prepare(s));expect(r.status).toBe('ready');
   if(r.status!=='ready')throw Error(JSON.stringify(r));
   expect(r.result.provider).toBe('rangeconverter-preflop');
   expect(r.result.reference).toMatchObject({modelDepthBB:40,actualDepthBB:40.5,tablePlayers:n,modelPlayers:6});
   expect(r.result.actions.find(a=>a.kind==='raise')).toMatchObject({frequency:1,to:n===2?6:4});
  }
 });
});
