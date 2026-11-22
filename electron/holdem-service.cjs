const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
class HoldemService {
 constructor({transport,timeoutMs=6500,pollMs=100,availableMemory=()=>os.freemem(),verifyRequest}={}){
  this.transport=transport;this.timeoutMs=timeoutMs;this.pollMs=pollMs;this.availableMemory=availableMemory;this.verifyRequest=verifyRequest??(transport?async()=>{}:this.verifySourceRequest.bind(this));this.job=null;this.cancelled=new Set();
 }
 cancel(id){if(id){this.cancelled.add(id);if(this.cancelled.size>128)this.cancelled.delete(this.cancelled.values().next().value);}if(this.job&&(!id||id===this.job.id))this.job.cancelled=true;}
 close(){this.cancel();}
 async verifySourceRequest(config,started){
  const folder=path.join(os.homedir(),'nlhe_solver_artifacts','runtime','product_runner_jobs',started.solve_id);
  const source=JSON.parse(await fs.readFile(path.join(folder,'request.json'),'utf8')),r=config.request;
  for(const key of ['variant','players','button','board','starting_pot_bb','seat_stacks_bb','postflop_bet_fractions','postflop_raise_fractions','max_raises_per_street','ranges'])if(JSON.stringify(source[key])!==JSON.stringify(r[key]))throw Error(`Holdem-källan ändrade modellfältet ${key}.`);
  if(source.entry_private_keying!=='exact_entry_hand_index_v1'||source.allow_donk_bets!==true||source.allow_oop_bet!==true||source.leaf_street!==0||source.rake_pct!==0)throw Error('Holdem-källans kortnycklar eller bettingmodell matchar inte.');
 }
 async compute(raw,id){
  if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid Holdem job identity');
  if(this.cancelled.has(id))throw Error('Holdemberäkningen avbröts.');
  if(!this.transport) throw Object.assign(Error('En godkänd extern anslutning till Holdem Solver saknas.'),{code:'SOLVER_UNAVAILABLE'});
  const {validateHoldemConfig,checkHoldemRow}=require('./generated/holdem-model.cjs'),config=validateHoldemConfig(raw);
  this.cancel();const job={id,cancelled:false,solveId:null};this.job=job;const begun=performance.now();let previous=null;
  const check=()=>{if(job.cancelled)throw Error('Holdemberäkningen avbröts.');if(performance.now()-begun>this.timeoutMs)throw Error('Holdem Solver hann inte ge en tränad, stabil handrad inom tidsbudgeten.');};
  try {
   if(this.availableMemory()<512*1024**2)throw Error('För lite ledigt arbetsminne för Holdem Solver: minst 512 MB behövs före start.');
   const start=await this.transport.request('POST','/api/runner/solve',config.request);
   if(start.status!==202)throw Error(start.data?.error==='compute_not_granted'?'Den officiella gatewayn kunde inte hämta compute grant.':'Holdem Solver avvisade jobbstarten.');
   if(!/^[a-zA-Z0-9_-]{1,100}$/.test(start.data?.solve_id??''))throw Error('Holdem Solver gav ogiltig jobbidentitet.');
   job.solveId=start.data.solve_id;await this.verifyRequest(config,start.data);check();
   let watched=false;
   while(true){
    check();const base='/api/runner/solve/'+job.solveId;
    const status=await this.transport.request('GET',base);check();
    if(status.status!==200)throw Error('Holdem Solvers jobbstatus kunde inte läsas.');
    if(status.data.stop_reason==='memory_pressure'||status.data.runtime_memory_guard?.triggered){const g=status.data.runtime_memory_guard;throw Error(`Holdem Solvers minnesvakt stoppade jobbet: ${Math.round(g?.system_available_memory_mb??0)} MB ledigt, ${Math.round(g?.effective_checkpoint_reserve_mb??0)} MB reserv.`);}
    if(status.data.status==='failed')throw Error('Holdem Solvers native-jobb misslyckades.');
    if(!watched){await this.transport.request('POST',base+'/strategy-watch',{street:'flop',history:config.history});watched=true;}
    const snapshot=await this.transport.request('GET',base+'/strategy-snapshot');check();
    if(snapshot.status===200){
     if(snapshot.data.watched_node?.history!==config.history)watched=false;
     try {
      const row=checkHoldemRow(config,snapshot.data,job.solveId);
      if(previous&&row.visits>previous.visits&&row.legal_actions.every(a=>Math.abs(row.action_freqs[a]-previous.action_freqs[a])<=.1))return {row,solveId:job.solveId,iterations:snapshot.data.iterations,elapsedMs:performance.now()-begun,modelVerified:true};
      previous=structuredClone(row);
     }catch(error){if(!error.message.startsWith('Inväntar'))throw error;}
    }
    if(['done','stopped'].includes(status.data.status))throw Error('Holdem Solver slutförde utan tillräckligt tränad och stabil strategi för din hand.');
    await new Promise(resolve=>setTimeout(resolve,this.pollMs));
   }
  }finally{
   if(job.solveId)await this.transport.request('POST','/api/runner/solve/'+job.solveId+'/stop',{abandon_export:true,artifact_save_mode:'ultra_light'}).catch(()=>{});
   if(this.job===job)this.job=null;
  }
 }
}
module.exports={HoldemService};
