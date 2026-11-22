// @vitest-environment node
import {describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {writeFile} from 'node:fs/promises';
import {prepareDecision} from '../src/decision/adapter';
import {prepareMonker} from '../src/monker/config';
import {monkerSnapshot} from './helpers/monker';
import {MonkerClient,monkerDecision} from '../src/monker/client';
const {MonkerService}=createRequire(import.meta.url)('../electron/monker-service.cjs');
describe.skipIf(!process.env.POKER_MONKER_SERVICE_TEST_DIR)('installed Monker desktop service',()=>{
 it('maps an effective all-in bet with uncallable chips through the real kernel into legal app actions',async()=>{
  const service=new MonkerService({directory:process.env.POKER_MONKER_SERVICE_TEST_DIR,temporaryRoot:path.join(os.tmpdir(),'poker-monker-service-tests')});
  try{
   const s=monkerSnapshot();s.players[2].bet=1.6;s.players[2].stack=1.4;s.pot=2.4;s.availableActions=['Fold','Syna'];
   const client=new MonkerClient();vi.spyOn(client,'compute').mockImplementation(config=>service.compute(config,randomUUID()));
   const result=await monkerDecision(s,prepareDecision(s),client);
   expect(result.quality).toBe('solver-unverified');expect(result.actions.map(a=>a.kind)).toEqual(['fold','call']);
   expect(result.actions.find(a=>a.kind==='call')).toMatchObject({cost:160,allIn:true});
  }finally{service.close();}
 },20000);
 it('serves successive broad models, uneven stacks, checks and a live bet through the persistent kernel',async()=>{
  const service=new MonkerService({directory:process.env.POKER_MONKER_SERVICE_TEST_DIR,temporaryRoot:path.join(os.tmpdir(),'poker-monker-service-tests')});
  const evidence:unknown[]=[];
  try{
   for(const street of ['turn','river'])for(const n of [3,4,5,6]){
    const s=monkerSnapshot(n);s.players.forEach((p,i)=>{p.stack=[3,1.6,1,2,1.2,0.8][i];});
    if(street==='river'){s.street='river';s.board.push('2s');}
    const r=await service.compute(prepareMonker(s,prepareDecision(s)),randomUUID());
    expect(r.quality.status).toBe('unknown');expect(r.quality.errorPct).toBeNull();expect(r.bucketWeight).toBeGreaterThan(0);expect(r.wallMs).toBeLessThan(10000);
    evidence.push({players:n,street,stacks:s.players.map(p=>p.stack),rangeCounts:r.rangeCounts,publicNodes:r.nodes.length,frequencies:r.frequencies,bucketWeight:r.bucketWeight,iterations:r.iterations,wallMs:r.wallMs,quality:r.quality});
   }
   const checked=monkerSnapshot(3,2);expect((await service.compute(prepareMonker(checked,prepareDecision(checked)),randomUUID())).bucketWeight).toBeGreaterThan(0);
   const bet=monkerSnapshot(3,0);bet.players[2].bet=0.37;bet.players[2].stack=1.23;bet.pot=1.17;bet.availableActions=['Fold','Syna','Höj'];
   expect((await service.compute(prepareMonker(bet,prepareDecision(bet)),randomUUID())).bucketWeight).toBeGreaterThan(0);
   if(process.env.POKER_MONKER_EVIDENCE)await writeFile(process.env.POKER_MONKER_EVIDENCE,JSON.stringify({synthetic:true,cases:evidence},null,2)+'\n');
  }finally{service.close();}
 },90000);
 it('cancels an active solve and starts the next hand without returning the old result',async()=>{
  const service=new MonkerService({directory:process.env.POKER_MONKER_SERVICE_TEST_DIR,temporaryRoot:path.join(os.tmpdir(),'poker-monker-service-tests')});
  try{
   const s=monkerSnapshot(6),c=prepareMonker(s,prepareDecision(s)),id=randomUUID();
   const pending=service.compute(c,id);const rejected=expect(pending).rejects.toThrow(/avbr/);setTimeout(()=>service.cancel(id),100);await rejected;
   const result=await service.compute(c,randomUUID());expect(result.bucketWeight).toBeGreaterThan(0);
  }finally{service.close();}
 },25000);
});
