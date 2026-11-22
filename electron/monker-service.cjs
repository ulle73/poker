const fs=require('node:fs/promises');
const {createReadStream}=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {Worker}=require('node:worker_threads');
async function hash(file){const h=crypto.createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);return h.digest('hex');}
class MonkerService {
 constructor({directory,temporaryRoot,timeoutMs=10000}){this.directory=directory;this.temporaryRoot=temporaryRoot;this.timeoutMs=timeoutMs;this.job=null;this.worker=null;this.verified=null;this.cancelled=new Set();}
 cancel(id){
  if(id){this.cancelled.add(id);if(this.cancelled.size>128)this.cancelled.delete(this.cancelled.values().next().value);}
  if(this.job&&(!id||this.job.id===id))this.job.stop(Error('Monkerberäkningen avbröts.'));
 }
 close(){this.cancel();this.worker?.child.kill();this.worker=null;}
 async verify(){
  if(!this.verified)this.verified=(async()=>{
   const manifest=JSON.parse(await fs.readFile(path.join(this.directory,'manifest.json'),'utf8'));
   const expected=require('../docs/solver-provenance.json').optionalMonker;
   if(!expected||manifest.version!==10114||JSON.stringify(manifest.hostClassHashes)!==JSON.stringify(expected.hostClassHashes))throw Error('Monkers brygga saknar granskad versionsidentitet.');
   for(const [file,sha]of Object.entries(expected.vendorHashes))if(await hash(path.join(this.directory,file))!==sha)throw Error('Monkers leverantörsfiler skiljer sig från installerad version.');
   for(const [file,sha]of Object.entries(expected.hostClassHashes)){
    if(file.includes('..')||path.isAbsolute(file)||await hash(path.join(this.directory,'classes',file))!==sha)throw Error('Monkers bryggklass skiljer sig från den granskade versionen.');
   }
   return manifest;
  })().catch(error=>{this.verified=null;if(error.code==='ENOENT'){error.code='SOLVER_UNAVAILABLE';error.message='Den lokala Monkermotorn är inte installerad.';}throw error;});
  return this.verified;
 }
 async ensureWorker(manifest){
  if(this.worker)return this.worker.ready;
  const child=spawn(manifest.java,['-Xmx1536m','-Djava.awt.headless=true','-cp',path.join(this.directory,'classes')+';'+path.join(this.directory,'MonkerSolverFree.exe'),'c.MonkerBridge',path.join(this.directory,'MonkerSolverFree.exe')],{cwd:this.directory,windowsHide:true,shell:false,stdio:['pipe','pipe','pipe']});
  const worker={child,pending:null,buffer:'',stderr:'',ready:null};this.worker=worker;
  worker.ready=new Promise((resolve,reject)=>{
   child.once('error',reject);
   child.stderr.on('data',data=>{worker.stderr=(worker.stderr+data.toString()).slice(-2000);});
   child.stdout.on('data',data=>{
    worker.buffer+=data.toString();if(worker.buffer.length>64000){child.kill();return;}
    let end;while((end=worker.buffer.indexOf('\n'))>=0){
     const line=worker.buffer.slice(0,end);worker.buffer=worker.buffer.slice(end+1);let message;
     try{message=JSON.parse(line);}catch{child.kill();return;}
     if(message.ready===true){resolve(worker);continue;}
     if(!worker.pending||message.id!==worker.pending.id){child.kill();return;}
     const pending=worker.pending;worker.pending=null;
     if(message.ok)pending.resolve();else pending.reject(Error(message.error||'Monkerkärnan kunde inte slutföra.'));
    }
   });
   child.once('close',()=>{if(this.worker===worker)this.worker=null;const error=Error('Monkerkärnan stängdes. '+worker.stderr.trim().split('\n').at(-1));reject(error);worker.pending?.reject(error);worker.pending=null;});
  });
  return worker.ready;
 }
 async compute(raw,id){
  if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid Monker job identity');
  if(this.cancelled.has(id))throw Error('Monkerberäkningen avbröts.');
  const {validateMonkerConfig,encodeMonkerRequest,checkMonkerResponse}=require('./generated/monker-model.cjs');
  const config=validateMonkerConfig(raw),wire=encodeMonkerRequest(config);
  this.cancel();let folder,worker,auditor,stopped,stopError;
  const job={id,stop:error=>{stopped=true;stopError=error;auditor?.terminate();const owned=worker??(this.job===job?this.worker:null);if(owned){owned.child.kill();if(this.worker===owned)this.worker=null;owned.pending?.reject(error);owned.pending=null;}}};
  this.job=job;const started=performance.now(),timer=setTimeout(()=>job.stop(Error('Monker hann inte slutföra inom tidsbudgeten.')),this.timeoutMs);
  try{
   const manifest=await this.verify();if(stopped)throw stopError;
   worker=await this.ensureWorker(manifest);if(stopped)throw stopError;
   await fs.mkdir(this.temporaryRoot,{recursive:true});folder=await fs.mkdtemp(path.join(this.temporaryRoot,'monker-'));
   const input=path.join(folder,'input.bin'),output=path.join(folder,'output.json');await fs.writeFile(input,wire);
   if(stopped)throw stopError;
   await new Promise((resolve,reject)=>{worker.pending={id,resolve,reject};worker.child.stdin.write(id+'\t'+Buffer.from(input).toString('base64')+'\t'+Buffer.from(output).toString('base64')+'\n',error=>{if(error)reject(error);});});
   if(stopped)throw stopError;
   if((await fs.stat(output)).size>6000000)throw Error('Monkers resultat överskrider transportbudgeten.');
   const answer=checkMonkerResponse(config,JSON.parse(await fs.readFile(output,'utf8')));
   if(answer.requestSha256!==crypto.createHash('sha256').update(wire).digest('hex'))throw Error('Monkers resultat tillhör en annan förfrågan.');
   let quality={status:'unknown',errorPct:null,limitPct:2.1,metric:'max-unilateral',reason:'Breda ranger: oberoende felgräns saknas. 2,1 % är ett mål, inte ett uppmätt resultat.'};
   if(answer.auditCandidate){
    const file=output+'.model.json';if((await fs.stat(file)).size>10000000)throw Error('Monkers kontrollmodell är för stor.');
    quality=await new Promise((resolve,reject)=>{
     auditor=new Worker(path.join(__dirname,'generated/monker-audit.mjs'),{workerData:{file}});
     const limit=setTimeout(()=>{auditor.terminate();resolve({...quality,reason:'Den oberoende kvalitetskontrollen hann inte slutföra.'});},1800);
     auditor.once('message',result=>{clearTimeout(limit);resolve(result);auditor.terminate();});auditor.once('error',error=>{clearTimeout(limit);reject(error);});
     auditor.once('exit',code=>{if(stopped){clearTimeout(limit);reject(stopError);}else if(code!==0){clearTimeout(limit);resolve({...quality,reason:'Kvalitetskontrollen slutfördes inte.'});}});
    });
   }
   if(stopped)throw stopError;
   return {...answer,quality,wallMs:performance.now()-started};
  }finally{
   clearTimeout(timer);if(this.job===job)this.job=null;
   if(worker?.pending?.id===id){worker.child.kill();worker.pending=null;if(this.worker===worker)this.worker=null;}
   if(folder){const relative=path.relative(path.resolve(this.temporaryRoot),folder);if(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative))await fs.rm(folder,{recursive:true,force:true,maxRetries:5,retryDelay:100}).catch(()=>{});}
  }
 }
}
module.exports={MonkerService};
