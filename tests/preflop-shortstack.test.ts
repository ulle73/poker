import {describe,it,expect} from 'vitest';
import {preflopDecision} from '../src/preflop/strategy';
import {DecisionContext} from '../src/decision/context';
import {preflopSnapshot,changed} from './helpers/preflop';
import type {PreflopLibrary} from '../src/preflop/types';
const library={schema:1,source:'artgto',archiveSha256:'a'.repeat(64),order:['AQo','72o'],nodes:{},
 hu:{source:'holdemmath',depths:[10],order:['AQo','72o'],data:{}},
 metadata:{rangeFiles:2606,nodes:0,depthBB:100,license:'personal',rake:'unknown'},
 shortstack:{schema:1,source:'rangeconverter',archiveSha256:'a1723be2a7ac0e61b7a1342e1ebe7e778747bb2197572bf8fb0a877610e18799',
  nodes:{'CO|':[{token:'RFI',bb:2,weights:[10000,0]}],
   'BU|UTG_RFI':[{token:'call',bb:2,weights:[5000,0]},{token:'3bet',bb:5.5,weights:[2500,0]}],
   'UTG|':[{token:'RFI',bb:2,weights:[10000,0]}],
   'UTG|UTG_RFI_BU_3bet':[{token:'call',bb:5.5,weights:[5000,0]},{token:'allin',bb:40,weights:[5000,0]}]},
  coverage:{'CO|':[true,true],'BU|UTG_RFI':[true,true],'UTG|':[true,true],'UTG|UTG_RFI_BU_3bet':[true,false]},
  metadata:{depthBB:40,modelPlayers:6,rake:'500z',license:'personal study',nodes:4}}} as unknown as PreflopLibrary;
function short(hero=4){const s=preflopSnapshot(hero);s.players.forEach(p=>{p.stack=.81-p.bet!;});return s;}
describe('short cash chart routing',()=>{
 it.each([4,6,8,10,12,15,20])('uses the published six-seat push/fold chart at %i BB',depth=>{
  const s=preflopSnapshot(2);s.heroCards=['As','Qd'];
  s.players.forEach(p=>{p.stack=depth*.02-p.bet!;});
  const result=preflopDecision(s,new DecisionContext().prepare(s),library);
  expect(result.reference).toMatchObject({source:'holdemmath',modelDepthBB:depth,modelPlayers:6});
  expect(result.actions).toMatchObject([{kind:'raise',allIn:true,to:depth*2,frequency:1}]);
 });
 it('uses the forty-BB source at forty-and-a-half BB, with the source identity visible',()=>{
  const s=short();s.players.filter(p=>[3,4].includes(p.seat)).forEach(p=>{p.folded=true;p.inHand=false;});
  const r=preflopDecision(s,new DecisionContext().prepare(s),library);
  expect(r.provider).toBe('rangeconverter-preflop');expect(r.reference).toMatchObject({modelDepthBB:40,actualDepthBB:40.5,source:'rangeconverter'});
  expect(r.actions).toMatchObject([{kind:'raise',to:4,frequency:1}]);
 });
 it('selects the response to a prior open, preserving the imported mixed strategy',()=>{
  const c=new DecisionContext();let s=short(5);c.observe(s);s=changed(s,3,.04);s.players.filter(p=>[4,5].includes(p.seat)).forEach(p=>{p.folded=true;p.inHand=false;});c.observe(s);
  const r=preflopDecision(s,c.prepare(s),library);
  expect(r.actions.map(a=>[a.kind,a.to,a.frequency])).toEqual([['fold',0,.25],['call',4,.5],['raise',11,.25]]);
 });
 it('treats the source jam as the actual remaining stack, not as a forty-BB non-all-in bet',()=>{
  const c=new DecisionContext();let s=short(2);c.observe(s);s=changed(s,3,.04);c.observe(s);s=changed(s,6,.11);s.players.filter(p=>[1,2,4,5].includes(p.seat)).forEach(p=>{p.folded=true;p.inHand=false;});c.observe(s);
  const r=preflopDecision(s,c.prepare(s),library);
  expect(r.actions.find(a=>a.kind==='raise')).toMatchObject({to:81,cost:77,allIn:true,frequency:.5});
 });
 it('refuses an unrepresented hero hand and an unsupported short depth',()=>{
  const s=short();s.players.forEach(p=>{p.stack=.5-p.bet!;});expect(()=>preflopDecision(s,new DecisionContext().prepare(s),library)).toThrow(/stack|BB/);
  const c=new DecisionContext();let n=short(2);n.heroCards=['7s','2d'];c.observe(n);n=changed(n,3,.04);c.observe(n);n=changed(n,6,.11);n.players.filter(p=>[1,2,4,5].includes(p.seat)).forEach(p=>{p.folded=true;p.inHand=false;});c.observe(n);
  expect(()=>preflopDecision(n,c.prepare(n),library)).toThrow(/range|hand/i);
 });
});
