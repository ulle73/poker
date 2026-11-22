import {parentPort,workerData} from 'node:worker_threads';
import {convertTexasRiver,auditRiver} from './audit';
try{
 const started=performance.now();
 const tree=convertTexasRiver(workerData.raw,workerData.config);
 const report=auditRiver(tree);
 if(!Number.isFinite(report.nashConvPct)||report.nashConvPct< -1e-6||Math.abs(report.ev[0]+report.ev[1])>1e-5||report.gains.some(g=>g< -1e-5))throw new Error('Invalid independent quality report');
 if(report.nashConvPct>0.2)throw new Error(`6+-lösningen klarade inte kvalitetsgränsen: ${report.nashConvPct.toFixed(3)} % NashConv.`);
 parentPort!.postMessage({tree,report,auditMs:performance.now()-started});
}catch(e){parentPort!.postMessage({error:(e as Error).message});}
