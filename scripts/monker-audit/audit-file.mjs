import {readFile,writeFile} from "node:fs/promises";
import {auditMultiway,auditPairSymmetry} from "./policy-audit.mjs";
const [input,output,mode='average',qualityMetric='nashconv']=process.argv.slice(2);
if(!input)throw Error("Expected decoded archive JSON and optional report path");
const model=JSON.parse(await readFile(input,"utf8"));
model.strategyMode=mode;
const identity={schema:model.schema,strategyMode:mode,qualityMetric,archiveSha256:model.archiveSha256,treeSha256:model.treeSha256,players:model.players,board:model.board,rangeCounts:model.ranges.map(r=>r.length),iterations:model.iterations,informationStates:model.informationStates,decodeMs:model.decodeMs,sampledRootEvs:model.sampledRootEvs};
let result;
try {result={...identity,status:"audited",...(auditPairSymmetry(model,{qualityMetric})??auditMultiway(model,{qualityMetric}))};}
catch(error){result={...identity,status:"quality-unknown",accepted:false,error:error.message};}
const text=JSON.stringify(result,null,2)+"\n";
if(output)await writeFile(output,text);
console.log(text);
if(result.status!=="audited")process.exitCode=2;
