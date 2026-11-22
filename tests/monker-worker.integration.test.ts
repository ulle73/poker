// @vitest-environment node
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm,mkdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {prepareDecision} from '../src/decision/adapter';
import {prepareMonker,encodeMonkerRequest,buildMonkerPlan} from '../src/monker/config';
import {monkerSnapshot} from './helpers/monker';
import {checkMonkerResponse} from '../src/monker/response';
const runtime=process.env.POKER_MONKER_TEST_DIR,javaDir=process.env.POKER_MONKER_JAVA_DIR;
describe.skipIf(!runtime||!javaDir)('real pinned Monker worker',()=>{
 let folder:string,classes:string;
 beforeAll(async()=>{
  folder=await mkdtemp(path.join(os.tmpdir(),'poker-monker-contract-'));classes=path.join(folder,'classes');await mkdir(classes);
  const p=spawnSync(path.join(javaDir!,'javac.exe'),['-cp',path.join(runtime!,'MonkerSolverFree.exe'),'-d',classes,...['MonkerPolicyExport.java','MonkerKernel.java','MonkerCoreProbe.java','MonkerBridge.java'].map(f=>path.resolve('scripts/monker-audit',f))],{windowsHide:true,encoding:'utf8',timeout:30000});
  expect(p.status,p.stderr).toBe(0);
 },35000);
 afterAll(async()=>{if(folder&&path.basename(folder).startsWith('poker-monker-contract-'))await rm(folder,{recursive:true,force:true});});
 it.each([3,4,5,6])('returns trained frequencies for %i broad-range players with exact model identity',async(n)=>{
  const s=monkerSnapshot(n),c=prepareMonker(s,prepareDecision(s)),plan=buildMonkerPlan(c);
  const input=path.join(folder,`input${n}.bin`),output=path.join(folder,`output${n}.json`);await writeFile(input,encodeMonkerRequest(c));
  const p=spawnSync(path.join(javaDir!,'java.exe'),['-Xmx1024m','-Djava.awt.headless=true','-cp',classes+';'+path.join(runtime!,'MonkerSolverFree.exe'),'c.MonkerBridge','--once',input,output,path.join(runtime!,'MonkerSolverFree.exe')],{cwd:runtime,windowsHide:true,encoding:'utf8',timeout:15000});
  expect(p.status,p.stderr).toBe(0);const answer=JSON.parse(await readFile(output,'utf8'));
  expect(answer.players).toBe(n);expect(answer.rangeCounts[1]).toBe(1128);expect(answer.decision).toBe(plan.decision);expect(answer.bucketWeight).toBeGreaterThan(0);
  expect(answer.frequencies.reduce((a:number,b:number)=>a+b,0)).toBeCloseTo(1,9);expect(answer.nodes).toHaveLength(plan.nodes.length);expect(answer.measuredErrorPct).toBeNull();
  expect(()=>checkMonkerResponse(c,answer)).not.toThrow();
  const changed=structuredClone(answer);changed.ranges[1][0].weight=0.01;expect(()=>checkMonkerResponse(c,changed)).toThrow();
  const bad=structuredClone(answer);bad.nodes[1].contributions[0]++;expect(()=>checkMonkerResponse(c,bad)).toThrow();
 },20000);
});
