// @vitest-environment node
import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {prepareDecision} from '../src/decision/adapter';
import {monkerSnapshot} from './helpers/monker';
import {prepareHoldem,holdemDecision} from '../src/holdem/model';
const {HoldemService}=createRequire(import.meta.url)('../electron/holdem-service.cjs');
const enabled=process.env.POKER_HOLDEM_INTEGRATION==='1';
const players=process.env.POKER_HOLDEM_PLAYERS?.split(',').map(Number)??[2,3,4,5,6];
it.skipIf(!enabled).each(players)('starts a fresh authenticated %i-player source job and returns a trained exact-hand row',async count=>{
 const s=monkerSnapshot(count);s.street='flop';s.board=['Jh','Qh','Kh'];s.heroCards=['9s','9h'];const input=prepareDecision(s),config=prepareHoldem(s,input);
 const service=new HoldemService({directory:path.join(process.env.APPDATA!,'Poker GTO Advisor','solvers','holdem-gateway'),timeoutMs:15000});
 let evidence:Record<string,unknown>={synthetic:true,players:count,request:config.request,quality:'not independently verified'};
 try {const result=await service.compute(config,crypto.randomUUID());const decision=holdemDecision(input,config,result.row,result.elapsedMs,result.iterations,result.solveId);evidence={...evidence,passed:true,solveId:result.solveId,elapsedMs:result.elapsedMs,visits:result.row.visits,actions:decision.actions,quality:decision.quality};expect(result.row.visits).toBeGreaterThanOrEqual(32);expect(decision.exploitabilityPct).toBeNull();}
 catch(error){evidence={...evidence,passed:false,error:(error as Error).message};throw error;}
 finally {const dir=path.resolve('docs/evidence/holdem-gateway-2026-11-08');await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,`cold-${count}p.json`),JSON.stringify(evidence,null,2));service.close();}
},45000);
