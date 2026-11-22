// @vitest-environment node
import {expect,it} from 'vitest';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {prepareLiveSolve} from '../src/live/analysis';
import {prepareDecision} from '../src/decision/adapter';
import {legalPostflopTree} from '../src/decision/river-legality';
import {FULL_RANGE} from '../src/decision/verified-river';
import {DecisionEngine,FreePostflopProvider} from '../src/decision/providers';
import type {LiveSnapshot} from '../src/live/types';
import type {SolverClient} from '../src/solver/client';
const directory=process.env.POKER_POSTFLOP_SOLVER_DIR;
const {PostflopService}=createRequire(import.meta.url)('../electron/postflop-service.cjs');
const snapshot:LiveSnapshot={version:1,variant:'holdem',source:'svenskaspel-dom',readerId:'native-test',sequence:1,
  handId:'12625050922',capturedAt:Date.now(),currency:'EUR',maxSeats:6,dealerSeat:3,street:'turn',
  board:['Td','8s','Ts','7c'],heroCards:['Qd','4h'],heroTurn:true,availableActions:['Fold','Check','Satsa'],
  pot:.14,valid:true,issues:[],observedActions:[],players:[
    {seat:4,hero:true,position:'SB',stack:1.86,bet:0,inHand:true,folded:false},
    {seat:6,hero:false,position:'BB',stack:3.73,bet:0,inHand:true,folded:false},
    ...[1,2,3,5].map(seat=>({seat,hero:false,position:'Foldat',stack:2,bet:0,inHand:false,folded:true})),
  ]};

it.skipIf(!directory)('routes the reported deep full-range turn through native solve, tree legality and the 2% provider boundary',async()=>{
  const service=new PostflopService({directory,temporaryRoot:tmpdir()+'/poker-native-tests'});
  const input=prepareDecision(snapshot);
  const prepared=prepareLiveSolve(snapshot,FULL_RANGE,FULL_RANGE,{postflop:true});
  expect(prepared.config.targetPct).toBe(2);
  let actual:any;
  const client={cancel(){service.cancel();},solve:async(config:any,_progress:any,options:any)=>{
    actual={...await service.compute(config,options.line,crypto.randomUUID()),key:'native-test',config};return actual;
  }} as unknown as SolverClient;
  const outcome=await new DecisionEngine([new FreePostflopProvider(client)]).compute(snapshot,input);
  expect(outcome.status).toBe('ready');
  expect(actual.nodes.length).toBeGreaterThan(5000);
  expect(actual.memoryBytes).toBeLessThan(64*1024*1024);
  expect(legalPostflopTree(actual,input)).toBe(true);
  if(outcome.status==='ready'){
    expect(outcome.result.provider).toBe('b-inary-dcfr/turn');
    expect(outcome.result.exploitabilityPct).toBeLessThanOrEqual(2);
    expect(outcome.result.actions.some(a=>a.kind==='check')).toBe(true);
  }
  expect(actual.wallMs).toBeLessThan(6000);
},10000);

it.skipIf(!directory)('preserves weighted ranges and selects IP after a check through the service boundary',async()=>{
  const service=new PostflopService({directory,temporaryRoot:tmpdir()+'/poker-native-tests'});
  const config={board:['Ks','7d','2c','8h'],oopRange:'KK,A4s:0.25,A5s:0.75',ipRange:'TT,JJ',pot:10,stack:20,
    betSizes:[50],raiseSizes:[50],maxIterations:100,targetPct:2};
  const native=await service.compute(config,['check'],crypto.randomUUID());
  expect(native.engine).toBe('b-inary');
  expect(native.nodes[native.selectedNodeId].player).toBe(1);
  expect(native.rootRanges[0].filter((h:any)=>h.weight===0.25)).toHaveLength(4);
  expect(native.meta.root_evs.zero_sum[0]+native.meta.root_evs.zero_sum[1]).toBeCloseTo(0,4);
  expect(native.meta.exploitability_pct_of_pot).toBeLessThanOrEqual(2);
},10000);
