const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
const REVISION = '9d1509fe5077d019825f833eed04b16d342dfda1';
class PostflopService {
  constructor({directory, temporaryRoot, timeoutMs=10000}) {
    this.directory=directory; this.temporaryRoot=temporaryRoot;
    this.timeoutMs=timeoutMs; this.job=null; this.verified=null; this.cancelled=new Set();
  }
  async verify() {
    if (!this.verified) this.verified=(async()=>{
      const manifest=JSON.parse(await fs.readFile(path.join(this.directory,'manifest.json'),'utf8'));
      const expected=require('../docs/solver-provenance.json').optionalFastNativePostflop;
      const binary=await fs.readFile(path.join(this.directory,'poker-postflop-bridge.exe'));
      const hash=crypto.createHash('sha256').update(binary).digest('hex');
      if (!expected || expected.revision!==REVISION || manifest.sourceRevision!==REVISION || hash!==expected.exeSha256)
        throw new Error('NLHE-motorns binär stämmer inte med den granskade versionen.');
    })().catch(error=>{this.verified=null;throw error;});
    await this.verified;
  }
  cancel(id) {
    if(id) {
      this.cancelled.add(id);
      if(this.cancelled.size>128)this.cancelled.delete(this.cancelled.values().next().value);
    }
    if (this.job && (!id || this.job.id===id)) this.job.stop(new Error('NLHE-beräkningen avbröts.'));
  }
  async compute(config,line,id) {
    if (typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid job identity');
    if(this.cancelled.has(id))throw new Error('NLHE-beräkningen avbröts.');
    const {nativeRequest,checkNativeRanges}=require('./generated/postflop-config.cjs');
    const request=nativeRequest(config);config=request.config;
    if(config.board.length!==4 || config.targetPct>2 || config.maxIterations>2000 ||
      !Array.isArray(line)||line.length>2||line.some(s=>typeof s!=='string'||! /^(check|allin|bet:\d+(?:\.\d+)?(?:e[+-]?\d+)?)$/.test(s)))
      throw new Error('Unsupported native NLHE request');
    this.cancel();
    let child,folder,timer,stopped=false,stopError;
    const job={id,stop(error){stopped=true;stopError=error;child?.kill();job.reject?.(error);}};
    this.job=job;
    const started=performance.now();
    timer=setTimeout(()=>job.stop(new Error('NLHE-motorn hann inte slutföra inom tidsbudgeten.')),this.timeoutMs);
    try {
      try {await this.verify();} catch(error) {
        if(error.code==='ENOENT') {error.code='SOLVER_UNAVAILABLE';error.message='Den lokala native-motorn är inte installerad.';}
        throw error;
      }
      if(stopped)throw stopError;
      await fs.mkdir(this.temporaryRoot,{recursive:true});
      folder=await fs.mkdtemp(path.join(this.temporaryRoot,'nlhe-'));
      await fs.writeFile(path.join(folder,'input.json'),JSON.stringify(request));
      await fs.writeFile(path.join(folder,'line.json'),JSON.stringify(line));
      if(stopped)throw stopError;
      let stderr='',bytes=0;
      await new Promise((resolve,reject)=>{
        job.reject=reject;
        child=spawn(path.join(this.directory,'poker-postflop-bridge.exe'),['input.json','line.json','result.json'],
          {cwd:folder,windowsHide:true,shell:false,stdio:['ignore','ignore','pipe']});
        child.stderr.on('data',data=>{
          bytes+=data.length; stderr=(stderr+data.toString()).slice(-1500);
          if(bytes>256000)job.stop(new Error('NLHE-motorns loggbudget överskreds.'));
        });
        child.once('error',reject);
        child.once('close',code=>{
          child=null;
          if(code===0)resolve();
          else reject(stopError??new Error('NLHE-motorn kunde inte godkänna lösningen. '+stderr.trim().split('\n').at(-1)));
        });
      });
      if(stopped)throw stopError;
      const output=path.join(folder,'result.json');
      if((await fs.stat(output)).size>8000000)throw new Error('NLHE-motorns export är för stor.');
      const result=JSON.parse(await fs.readFile(output,'utf8'));
      if(stopped)throw stopError;
      checkNativeRanges(request,result.rootRanges);
      if(!Number.isFinite(result.meta?.exploitability_pct_of_pot)||result.meta.exploitability_pct_of_pot<0||
        result.meta.exploitability_pct_of_pot>config.targetPct||result.backend!=='native'||result.engine!=='b-inary')
        throw new Error('NLHE-resultatet saknar godkänt felmått.');
      return {...result,wallMs:performance.now()-started};
    } finally {
      clearTimeout(timer);child?.kill();
      if(this.job===job)this.job=null;
      if(folder)await fs.rm(folder,{recursive:true,force:true,maxRetries:5,retryDelay:100}).catch(()=>{});
    }
  }
}
module.exports={PostflopService};
