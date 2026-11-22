// Authorized local runner probe. No account cookie/database or compute grant is read.
import fs from 'node:fs/promises';
const root='http://127.0.0.1:8807';
const tokenFile=process.env.POKER_HOLDEM_TOKEN_FILE; if(!tokenFile)throw Error('POKER_HOLDEM_TOKEN_FILE must name the existing vendor loopback API key file'); const key=(await fs.readFile(tokenFile,'utf8')).trim();
async function request(path,body){
 const r=await fetch(root+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${key}`,...body?{'Content-Type':'application/json'}:{}},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});
 const data=await r.json();
 return {status:r.status,data};
}
const [action,id,history]=process.argv.slice(2);
if(action==='snapshot'){
 const r=await request(`/solve/${encodeURIComponent(id)}/strategy-snapshot`);
 console.log(JSON.stringify({status:r.status,keys:Object.keys(r.data),data:r.data},null,2));
}else if(action==='nodes'){
 const r=await request(`/solve/${encodeURIComponent(id)}/nodes?street=flop&parent_history=entry_flop&limit=12`);
 console.log(JSON.stringify(r,null,2));
}else if(action==='watch'){
 const r=await request(`/solve/${encodeURIComponent(id)}/strategy-watch`,{street:'flop',history:history||'entry_flop'});
 console.log(JSON.stringify(r,null,2));
}else if(action==='list'){
 const r=await request('/solves');console.log(JSON.stringify(r,null,2));
}else if(action==='verify-auth'){
 const health=await request('/health');
 const start=await request('/solve',{variant:2,players:3,street:'flop',entry_point:'flop',board:'JhQhKh',starting_pot_bb:4.5,effective_stack_bb:40.5,iterations:10000,threads:1,buckets:256,export_nodes:true});
 const g=await fetch('http://127.0.0.1:8900/app/session',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});
 const account=await g.json();
 console.log(JSON.stringify({time:new Date().toISOString(),desktopUI:'Verify separately in the official window',runnerHealthStatus:health.status,newJobStatus:start.status,createdSolveId:start.data.solve_id,newJobError:start.data.error,newJobMessage:start.data.message,externalGatewaySession:{status:g.status,authenticated:account.authenticated},officialBrowserPage:'Not checked by this script',accountCookiesRead:false,computeGrantsCopied:false,authenticationModified:false},null,2));
}else if(action==='poll'){
 const seen=new Set((await request('/solves')).data.solves.map(s=>s.solve_id));
 const deadline=Date.now()+180000;let child=null,start=0,firstSnapshot=null,firstWatched=null,firstCombo=null,lastWatch=0,completed=false;
 const samples=[];
 console.log('READY: awaiting an official UI launch; no compute job is started by this probe');
 while(Date.now()<deadline){
  if(!child){
   const list=(await request('/solves')).data.solves;
   child=list.find(s=>!seen.has(s.solve_id))?.solve_id;
   if(child){
    start=performance.now();
    const watched=await request(`/solve/${encodeURIComponent(child)}/strategy-watch`,{street:'flop',history:'entry_flop.check'});
    console.log(JSON.stringify({newJob:child,watchStatus:watched.status}));
   }
  }
  if(child){
   const status=await request(`/solve/${encodeURIComponent(child)}`);
   const snap=await request(`/solve/${encodeURIComponent(child)}/strategy-snapshot`);
   const ms=Math.round(performance.now()-start),d=snap.data;
   const fresh=d.solve_id===child&&d.iterations_this_run>0;
   // The source UI shares this single watch. An early 200 acknowledgement did
   // not keep the selected node in our run. Verify the observed node, not the ACK.
   if(fresh&&d.watched_node?.history!=='entry_flop.check'&&performance.now()-lastWatch>1000&&status.data.progress_phase==='training'){
    const ack=await request(`/solve/${encodeURIComponent(child)}/strategy-watch`,{street:'flop',history:'entry_flop.check'});
    lastWatch=performance.now();console.log(JSON.stringify({watchAfterTraining:ack.status}));
   }
   const row=d.watched_node?.rows?.find(r=>r.hand_index===1095&&r.player===2);
   const metric={ms,status:status.data.status,phase:status.data.progress_phase,snapshotStatus:snap.status,iterations:d.iterations,iterationsThisRun:d.iterations_this_run,fresh,history:d.watched_node?.history,heroRow:row?{visits:row.visits,frequencies:row.action_freqs,actions:row.legal_actions}:null};
   if(fresh&&!firstSnapshot)firstSnapshot=metric;
   if(fresh&&d.watched_node?.history==='entry_flop.check'&&row?.visits>0&&!firstWatched)firstWatched=metric;
   if(fresh&&!firstCombo){
    const combo=await request(`/solve/${encodeURIComponent(child)}/combo-strategy?player=2&street=flop&history=entry_flop.check&board=JhQhKh&cards=9s9h&limit=1`);
    const c=Object.values(combo.data.bucket_strategies||{})[0];
    if(c?.visits>0&&!c.unvisited_default)firstCombo={ms:Math.round(performance.now()-start),status:combo.status,provenance:c.strategy_provenance,visits:c.visits,frequencies:c.freqs};
   }
   if(samples.at(-1)?.phase!==metric.phase||samples.at(-1)?.iterations!==metric.iterations)samples.push(metric);
   if(['done','stopped','failed'].includes(status.data.status)){
    const result={synthetic:true,sourceLaunch:'official signed-in vendor UI',solveId:child,status:status.data.status,observedFrom:'first discovery by polling, not UI click time',firstSnapshot,firstWatched,firstCombo,finishedMs:ms,elapsedSeconds:status.data.elapsed_seconds,trainingElapsedSeconds:status.data.training_elapsed_seconds,converged:status.data.converged,artifactSaveMode:status.data.artifact_save_mode,memoryGuardTriggered:status.data.runtime_memory_guard?.triggered,samples};
    if(!process.env.POKER_HOLDEM_EVIDENCE)throw Error('POKER_HOLDEM_EVIDENCE output path is required'); await fs.writeFile(process.env.POKER_HOLDEM_EVIDENCE,JSON.stringify(result,null,2));
    console.log(JSON.stringify(result,null,2));completed=true;break;
   }
  }
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 if(!completed)throw Error('No completed official-UI job observed within 180 seconds');
}else throw Error('Unknown action');
