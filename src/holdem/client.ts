import type {LiveSnapshot} from '../live/types';
import type {DecisionInput,DecisionResult} from '../decision/types';
import {prepareHoldem,checkHoldemRow,holdemDecision} from './model';
export class HoldemClient {
 private id:string|null=null;private abort:AbortController|null=null;
 cancel(){this.abort?.abort();this.abort=null;if(this.id)void fetch(new URL('holdem-cancel',document.baseURI),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:this.id})}).catch(()=>{});this.id=null;}
 async compute(snapshot:LiveSnapshot,input:DecisionInput):Promise<DecisionResult>{
  const config=prepareHoldem(snapshot,input),id=crypto.randomUUID(),abort=new AbortController();this.id=id;this.abort=abort;
  try {
   const reply=await fetch(new URL('holdem-solve',document.baseURI),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,config}),signal:abort.signal});
   const result=await reply.json();if(!reply.ok||result.error)throw Error(result.error||'Holdem Solver kunde inte slutföra.');
   if(this.id!==id)throw Error('Holdemberäkningen avbröts.');
   if(result.modelVerified!==true||typeof result.solveId!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(result.solveId)||!Number.isFinite(result.elapsedMs)||result.elapsedMs<0)throw Error('Holdem Solver saknar matchande modellintyg.');
   const row=checkHoldemRow(config,{solve_id:result.solveId,iterations:result.iterations,watched_node:{history:result.row?.history,rows:[result.row]}},result.solveId);
   return holdemDecision(input,config,row,result.elapsedMs,result.iterations,result.solveId);
  }finally{if(this.id===id){this.id=null;this.abort=null;}}
 }
}
