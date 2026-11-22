import {parentPort,workerData} from 'node:worker_threads';
import {readFile} from 'node:fs/promises';
import {auditPairSymmetry,auditMultiway} from '../../scripts/monker-audit/policy-audit.mjs';
try {
 const model=JSON.parse(await readFile(workerData.file,'utf8'));
 const report=auditPairSymmetry(model,{qualityMetric:'max-unilateral',maxErrorPct:2.1})??auditMultiway(model,{qualityMetric:'max-unilateral',maxErrorPct:2.1});
 parentPort!.postMessage({status:report.accepted?'verified':'failed',errorPct:report.qualityErrorPct,limitPct:2.1,metric:'max-unilateral',reason:'Oberoende exakt bästa-svarskontroll i det valda trädet.',nashConvPct:report.nashConvPct});
} catch(error){
 const message=error instanceof Error?error.message:String(error);
 if(!/budget.*exceeded|exceeded.*budget/i.test(message))throw error;
 parentPort!.postMessage({status:'unknown',errorPct:null,limitPct:2.1,metric:'max-unilateral',reason:'Rangerna överskrider den exakta kvalitetskontrollens budget.'});
}
