// Opt-in integration check: installed vendor binary, synthetic river, no live table.
import {createRequire} from 'node:module';
import {mkdtemp, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const {ShortdeckService}=createRequire(import.meta.url)('../electron/shortdeck-service.cjs');
const directory=process.env.POKER_TEXAS_SOLVER_DIR;
if(!directory)throw new Error('Set POKER_TEXAS_SOLVER_DIR to the separately installed official v0.2.0 package.');
const temporaryRoot=await mkdtemp(path.join(tmpdir(),'poker-sixplus-check-'));
const board=['Ks','7d','6c','8h','9d'];
const cards=[...'6789TJQKA'].flatMap(r=>[...'shdc'].map(s=>r+s)).filter(c=>!board.includes(c));
const range=cards.flatMap((a,i)=>cards.slice(i+1).map(b=>({cards:a+b,weight:1})));
const config={board,pot:1000,stack:2000,minBet:2,ranges:[range,range]};
const service=new ShortdeckService({directory,temporaryRoot});
try{
  await service.verify();
  if(process.argv.includes('--cancel')){
    const id=crypto.randomUUID();
    const pending=service.compute(config,id);
    const timer=setTimeout(()=>service.cancel(id),400);
    let cancelled=false;
    try{await pending;}catch(error){
      if(!/Avbruten/.test(error.message))throw error;
      cancelled=true;
    }finally{clearTimeout(timer);}
    if(!cancelled||service.job!==null||(await readdir(temporaryRoot)).length)
      throw new Error('Cancellation or cleanup failed.');
    console.log(JSON.stringify({cancelled,activeJob:service.job,remainingJobFolders:0}));
  }else{
    const {tree,...answer}=await service.compute(config,crypto.randomUUID());
    console.log(JSON.stringify({...answer,nodes:tree.nodes.length},null,2));
  }
}finally{
  service.cancel();
  await rm(temporaryRoot,{recursive:true,force:true});
}
