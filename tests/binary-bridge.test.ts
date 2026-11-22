// @vitest-environment node
import {afterAll,expect,it} from 'vitest';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {nativeRequest,checkNativeRanges} from '../src/solver/native-config';
import {configToToml} from '../src/core/config';
import {initializeSolver,solveTree} from '../public/solver-engine.js';
import {independentRiverReport} from '../scripts/river-oracle.mjs';
import {prepareDecision} from '../src/decision/adapter';
import {legalPostflopTree} from '../src/decision/river-legality';
import {FULL_RANGE} from '../src/decision/verified-river';
import type {TrainingConfig,SolveResult} from '../src/core/types';
import type {LiveSnapshot} from '../src/live/types';
const binary=process.env.POKER_BINARY_SOLVER;
const reports:unknown[]=[];
function run(config:TrainingConfig,line:string[]=[],all=false):SolveResult&{selectedNodeId:number}{
  const folder=mkdtempSync(join(tmpdir(),'poker-binary-test-'));
  try{
    const request=nativeRequest(config);
    writeFileSync(join(folder,'request.json'),JSON.stringify(request));writeFileSync(join(folder,'line.json'),JSON.stringify(line));
    const started=performance.now();
    const child=spawnSync(binary!,['request.json','line.json','result.json',...(all?['--audit-all']:[])],
      {cwd:folder,windowsHide:true,shell:false,timeout:20000,encoding:'utf8'});
    if(child.status!==0){
      reports.push({config,line,all,elapsedMs:performance.now()-started,error:child.error?.message??child.status,stderr:child.stderr});
      throw new Error(`Native failed: ${child.error?.message??child.status}\n${child.stderr}`);
    }
    const result=JSON.parse(readFileSync(join(folder,'result.json'),'utf8'));
    checkNativeRanges(request,result.rootRanges);
    reports.push({config,line,all,elapsedMs:performance.now()-started,wallMs:result.wallMs,meta:result.meta,
      nodes:result.nodes.length,memoryBytes:result.memoryBytes,timings:result.timings});
    return {...result,key:'test',config};
  }finally{rmSync(folder,{recursive:true,force:true});}
}
afterAll(()=>{
  if(process.env.POKER_BINARY_EVIDENCE){mkdirSync(process.env.POKER_BINARY_EVIDENCE,{recursive:true});
    writeFileSync(join(process.env.POKER_BINARY_EVIDENCE,'native-verification.json'),JSON.stringify(reports,null,2));}
});
const small:TrainingConfig={board:['Ks','7d','2c','8h'],oopRange:'KK,A4s:0.25,A5s:0.75',ipRange:'TT:0.5,JJ',pot:10,stack:20,
  betSizes:[50],raiseSizes:[50],maxIterations:300,targetPct:2};
function graph(nodes:SolveResult['nodes']){
  const out=new Map<string,unknown>();
  function walk(id:number,path:string){const n=nodes[id];
    const label=(a:typeof n.actions[number])=>a.label+':'+(a.amount_to==null?'':Math.round(a.amount_to*100));
    out.set(path,{kind:n.kind,player:n.player,board:n.board,pot:Math.round((n.terminal?.pot??n.pot)*100),
      stacks:n.stacks.map(v=>Math.round(v*100)),actions:n.actions.map(label).sort(),terminal:n.terminal?.kind,folder:n.terminal?.folder});
    n.actions.forEach(a=>walk(a.child,path+'/'+label(a)));
    n.valid_cards?.forEach(e=>walk(e.child,path+'/'+e.card));
  }walk(0,'');return out;
}
it.skipIf(!binary)('preserves the existing public model and agrees with independent weighted turn best responses',async()=>{
  const native=run(small,[],true);
  const report=independentRiverReport(native);
  expect(native.meta.exploitability_pct_of_pot).toBeCloseTo(100*report.exploitabilityChips/small.pot,3);
  native.meta.root_evs.zero_sum.forEach((v,p)=>expect(v).toBeCloseTo(report.ev[p],4));
  expect(report.gains.every(v=>v>=-1e-5)).toBe(true);
  await initializeSolver(readFileSync('public/wasm/solver_wasm_bg.wasm'));
  const old=solveTree(configToToml(small,{postflop:true}),small,()=>{},{postflop:true});
  const left=graph(old.nodes),right=graph(native.nodes);
  expect(right.size).toBe(left.size);
  for(const [path,value] of left)expect(right.get(path),path).toEqual(value);
},20000);
it.skipIf(!binary)('keeps conditional action EV consistent and exposes every physical runout for exact ranges',()=>{
  const config={...small,oopRange:'KhKd',ipRange:'ThTc,JhJc'};
  const native=run(config,['check','bet:50'],true);
  const report=independentRiverReport(native);
  expect(native.meta.exploitability_pct_of_pot).toBeCloseTo(100*report.exploitabilityChips/config.pot,3);
  const node=native.nodes[native.selectedNodeId];
  expect(node.player).toBe(0);
  for(const h of node.hands)if(h.compatibleMass>1e-8){
    expect(h.ev).toBeCloseTo(h.frequencies.reduce((s,f,a)=>s+f*h.actionEvs[a]!,0),4);
    const fold=node.actions.findIndex(a=>a.label==='fold');
    expect(h.actionEvs[fold]).toBeCloseTo(-config.pot/2,4);
  }
},20000);
const live:LiveSnapshot={version:1,variant:'holdem',source:'svenskaspel-dom',readerId:'fast-native-test',sequence:1,
  handId:'12625050922',capturedAt:Date.now(),currency:'EUR',maxSeats:6,dealerSeat:3,street:'turn',
  board:['Td','8s','Ts','7c'],heroCards:['Qd','4h'],heroTurn:true,availableActions:['Fold','Check','Satsa'],pot:.14,
  valid:true,issues:[],observedActions:[],players:[
    {seat:4,hero:true,position:'SB',stack:1.86,bet:0,inHand:true,folded:false},
    {seat:6,hero:false,position:'BB',stack:3.73,bet:0,inHand:true,folded:false},
    ...[1,2,3,5].map(seat=>({seat,hero:false,position:'Foldat',stack:2,bet:0,inHand:false,folded:true})),
  ]};
it.skipIf(!binary)('solves the reported full-range hand cold in a few seconds without changing its legal tree',()=>{
  const config={...small,board:live.board,oopRange:FULL_RANGE,ipRange:FULL_RANGE,pot:.14,stack:1.86};
  const result=run(config);
  expect(result.meta.exploitability_pct_of_pot).toBeLessThanOrEqual(2);
  expect(result.nodes.length).toBe(5547);
  expect(legalPostflopTree(result,prepareDecision(live))).toBe(true);
  expect(result.wallMs).toBeLessThan(6000);
},25000);

it.skipIf(!binary).each([
  {board:['Ks','7d','2c','8h'],pot:.20,stack:2,line:[]},
  {board:['As','Kd','Qh','2c'],pot:.11,stack:1.81,line:['check']},
  {board:['Th','9h','8c','7d'],pot:.17,stack:1.93,line:[]},
  {board:['Kc','Tc','7c','2c'],pot:.15,stack:1.89,line:[]},
])('keeps the 2% bound and six-second budget on representative cold full-range turns: $board',({board,pot,stack,line})=>{
  const result=run({...small,board,pot,stack,oopRange:FULL_RANGE,ipRange:FULL_RANGE},line);
  expect(result.meta.exploitability_pct_of_pot).toBeLessThanOrEqual(2);
  expect(result.memoryBytes).toBeLessThan(64*1024*1024);
  expect(result.nodes[result.selectedNodeId].player).toBe(line.length?1:0);
  expect(result.wallMs).toBeLessThan(6000);
},10000);
