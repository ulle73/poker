// Explicit, synthetic integration probe; never connects to or acts on a poker site.
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
const {PostflopService}=createRequire(import.meta.url)('../electron/postflop-service.cjs');
const directory=process.env.POKER_POSTFLOP_SOLVER_DIR;
if(!directory)throw new Error('Set POKER_POSTFLOP_SOLVER_DIR to the installed native bridge.');
const service=new PostflopService({directory,temporaryRoot:tmpdir()+'/poker-native-verification'});
const range=['22+',...'3456789TJQKA'.split('').flatMap(r=>[r+'2s+',r+'2o+'])].join(',');
const config={board:['Td','8s','Ts','7c'],oopRange:range,ipRange:range,pot:.14,stack:1.86,
  betSizes:[50],raiseSizes:[50],maxIterations:300,targetPct:2};
await service.verify();
const id=crypto.randomUUID();
const pending=service.compute(config,[],id);
let timer;
if(process.argv.includes('--cancel'))timer=setTimeout(()=>service.cancel(id),400);
try{
  const result=await pending;
  console.log(JSON.stringify({config,backend:result.backend,meta:result.meta,wallMs:result.wallMs,
    memoryBytes:result.memoryBytes,nodes:result.nodes.length,selectedHands:result.nodes[result.selectedNodeId].hands.length},null,2));
}catch(error){
  if(!process.argv.includes('--cancel')||!/avbröts/.test(error.message))throw error;
  console.log(JSON.stringify({cancelled:true,activeJob:service.job}));
}finally{clearTimeout(timer);service.cancel();}
