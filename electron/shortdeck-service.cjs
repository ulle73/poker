const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {Worker}=require('node:worker_threads');
const EXPECTED_EXE='8b74cd6f687387a9ea6c567591642cfe0bfca88360a1748ff7c7db769d0c5c1a';
const EXPECTED_TABLE='10f9e0e16364a849de6cf93025704c86cf054bb894ffdb7cece89d932aefc54b';
function validate(config){
 if(!config||config.board?.length!==5||new Set(config.board).size!==5||config.board.some(c=>typeof c!=='string'||!/^[6-9TJQKA][shdc]$/.test(c))||![config.pot,config.stack,config.minBet].every(n=>Number.isSafeInteger(n)&&n>0&&n<=10000000)||!Array.isArray(config.ranges)||config.ranges.length!==2)throw new Error('Invalid 6+ river request');
 for(const range of config.ranges){
  if(!Array.isArray(range)||!range.length||range.length>630)throw new Error('Invalid short-deck range');
  const seen=new Set();
  for(const h of range){
   if(!h||typeof h.cards!=='string'||!/^([6-9TJQKA][shdc]){2}$/.test(h.cards)||!Number.isFinite(h.weight)||h.weight<=0||h.weight>1)throw new Error('Invalid range combination');
   const cards=h.cards.match(/../g);
   const key=[...cards].sort().join('');
   if(cards[0]===cards[1]||cards.some(c=>config.board.includes(c))||seen.has(key))throw new Error('Blocked or duplicate range combination');
   seen.add(key);
  }
 }
 if(config.betPct!==undefined&&(!Number.isFinite(config.betPct)||config.betPct<10||config.betPct>200))throw new Error('Unsupported initial bet');
}
function nativeRange(range,board){
 const canonical=s=>s.match(/../g).sort().join('');
 const supplied=new Map(range.map(h=>[canonical(h.cards),h.weight]));
 const cards=[...'6789TJQKA'].flatMap(r=>[...'shdc'].map(s=>r+s)).filter(c=>!board.includes(c));
 const groups=new Map();
 for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++){
  const a=cards[i],b=cards[j],order='6789TJQKA';
  const high=order.indexOf(a[0])>=order.indexOf(b[0])?a:b,low=high===a?b:a;
  const name=high[0]+low[0]+(a[0]===b[0]?'':a[1]===b[1]?'s':'o');
  if(!groups.has(name))groups.set(name,new Set());
  groups.get(name).add(supplied.get(canonical(a+b))??0);
 }
 const result=[];
 for(const [name,weights] of groups){
  if(weights.size!==1)throw new Error('6+-motorn kräver samma vikt för alla tillåtna kombinationer i varje handklass.');
  const weight=[...weights][0];if(weight>0)result.push(`${name}:${weight}`);
 }
 if(!result.length)throw new Error('Empty native range');
 return result.join(',');
}
function commands(c){
 validate(c);
 const lines=[`set_pot ${c.pot}`,`set_effective_stack ${c.stack}`,`set_board ${c.board.join(',')}`,
  `set_range_oop ${nativeRange(c.ranges[0],c.board)}`,
  `set_range_ip ${nativeRange(c.ranges[1],c.board)}`];
 for(const p of ['oop','ip'])lines.push(`set_bet_sizes ${p},river,bet,${c.betPct??100}`,`set_bet_sizes ${p},river,raise,100`,`set_bet_sizes ${p},river,allin`);
 lines.push('set_allin_threshold 1','build_tree','set_thread_num 2','set_accuracy 0.05','set_max_iteration 2000','set_print_interval 10','set_use_isomorphism 0','start_solve','set_dump_rounds 2','dump_result result.json');
 return lines.join('\n')+'\n';
}
class ShortdeckService{
 constructor({directory,temporaryRoot,auditWorker=path.join(__dirname,'generated','shortdeck-audit.mjs'),timeoutMs=18000}){
  this.directory=directory;this.temporaryRoot=temporaryRoot;this.auditWorker=auditWorker;this.timeoutMs=timeoutMs;this.job=null;this.provenance=null;
 }
 async verify(){
  if(!this.provenance)this.provenance=(async()=>{
   for(const [file,hash] of [['console_solver.exe',EXPECTED_EXE],['resources/compairer/card5_dic_sorted_shortdeck.txt',EXPECTED_TABLE]]){
    const bytes=await fs.readFile(path.join(this.directory,file));
    if(crypto.createHash('sha256').update(bytes).digest('hex')!==hash)throw new Error('6+-solverns binär eller regeltabell har fel version.');
   }
  })().catch(e=>{this.provenance=null;throw e;});
  await this.provenance;
 }
 cancel(id){if(this.job&&(!id||id===this.job.id))this.job.stop(new Error('Avbruten 6+-beräkning.'));}
 async compute(config,id){
  if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw new Error('Invalid job identity');
  const input=commands(config);
  this.cancel();
  const started=performance.now();
  let child,worker,timer,folder,stopped=false,stopError;
  const job={id,stop:(error)=>{stopped=true;stopError=error;child?.kill();void worker?.terminate();job.reject?.(error);}};
  this.job=job;
  try{
   try { await this.verify(); } catch(error) {
    if(error.code === 'ENOENT')throw new Error('6+-solvern är inte installerad i appens solvermapp.');
    throw error;
   }
   if(stopped)throw stopError;
   await fs.mkdir(this.temporaryRoot,{recursive:true});
   folder=await fs.mkdtemp(path.join(this.temporaryRoot,'sixplus-'));
   await fs.writeFile(path.join(folder,'input.txt'),input);
   if(stopped)throw stopError;
   let stdout='',stderr='';
   timer=setTimeout(()=>job.stop(new Error('6+-solvern hann inte slutföra inom 18 sekunder.')),this.timeoutMs);
   await new Promise((resolve,reject)=>{
    job.reject=reject;
    child=spawn(path.join(this.directory,'console_solver.exe'),['-m','shortdeck','-r',path.join(this.directory,'resources'),'-i',path.join(folder,'input.txt')],{cwd:folder,windowsHide:true,shell:false,stdio:['ignore','pipe','pipe']});
    let bytes=0;
    const collect=data=>{bytes+=data.length;if(bytes>2000000)job.stop(new Error('6+-solverns loggbudget överskreds.'));};
    child.stdout.on('data',data=>{collect(data);stdout+=data.toString();});child.stderr.on('data',data=>{collect(data);stderr=(stderr+data.toString()).slice(-2000);});
    child.on('error',reject);child.on('close',code=>{child=null;code===0?resolve():reject(stopError??new Error('6+-solvern avslutades med fel (kod '+code+').'));});
   });
   if(stopped)throw stopError;
   const quality=[...stdout.matchAll(/Total exploitability ([\d.eE+-]+) precent/g)].at(-1);
   const iterations=[...stdout.matchAll(/Iter: (\d+)/g)].at(-1);
   if(!quality||!iterations||!Number.isFinite(Number(quality[1]))||Number(quality[1])>0.05)throw new Error('6+-solvern nådde inte sitt lösningsmål.');
   const file=path.join(folder,'result.json');
   if((await fs.stat(file)).size>12000000)throw new Error('6+-solverns export är för stor.');
   const raw=JSON.parse(await fs.readFile(file,'utf8'));
   if(stopped)throw stopError;
   const result=await new Promise((resolve,reject)=>{
    job.reject=reject;
    worker=new Worker(this.auditWorker,{workerData:{raw,config}});
    worker.once('message',value=>value.error?reject(new Error(value.error)):resolve(value));
    worker.once('error',reject);worker.once('exit',code=>{if(code!==0&&!stopped)reject(new Error('6+-kontrollen avbröts.'));});
   });
   if(stopped)throw stopError;
   return {...result,elapsedMs:performance.now()-started,iterations:Number(iterations[1]),nativeAveragePct:Number(quality[1])};
  }finally{
   clearTimeout(timer);child?.kill();if(worker)await worker.terminate();
   if(this.job===job)this.job=null;
   if(folder)await fs.rm(folder,{recursive:true,force:true,maxRetries:5,retryDelay:100}).catch(()=>{});
  }
 }
}
module.exports={ShortdeckService,validate,commands};
