import type {LiveSnapshot} from '../live/types';
import type {DecisionInput,DecisionResult,DecisionAction} from '../decision/types';
import {prepareMonker,buildMonkerPlan,type MonkerConfig,MONKER_ERROR_PCT} from './config';
import {checkMonkerResponse,type MonkerAnswer} from './response';
import {legalRiverRoot} from '../decision/river-legality';
export class MonkerClient {
 private id:string|null=null;private abort:AbortController|null=null;private cache=new Map<string,MonkerAnswer>();
 cancel(){this.abort?.abort();this.abort=null;if(this.id)void fetch(new URL('monker-cancel',document.baseURI),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:this.id})}).catch(()=>{});this.id=null;}
 async compute(config:MonkerConfig):Promise<MonkerAnswer>{
  const key=JSON.stringify(config),cached=this.cache.get(key);if(cached)return cached;
  const id=crypto.randomUUID(),controller=new AbortController();this.id=id;this.abort=controller;
  try {
   const response=await fetch(new URL('monker-solve',document.baseURI),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,config}),signal:controller.signal});
   const raw=await response.json();if(!response.ok||raw.error)throw Error(raw.error||'Monker kunde inte slutföra.');
   if(this.id!==id)throw Error('Avbruten Monkerberäkning.');
   const result=checkMonkerResponse(config,raw),q=result.quality;
   if(!q||q.limitPct!==MONKER_ERROR_PCT||q.metric!=='max-unilateral'||!['unknown','verified','failed'].includes(q.status))throw Error('Monker saknar tydlig kvalitetsstatus.');
   if(q.status==='failed')throw Error(`Monker klarade inte vald felgräns: ${q.errorPct?.toFixed(3)} % mot ${MONKER_ERROR_PCT} %.`);
   if(q.status==='verified'&&(!Number.isFinite(q.errorPct)||q.errorPct! < 0||q.errorPct! > MONKER_ERROR_PCT))throw Error('Monkers kvalitetsintyg är ogiltigt.');
   if(q.status==='unknown'&&q.errorPct!==null)throw Error('Monkers omätta kvalitet är felmärkt.');
   this.cache.set(key,result);if(this.cache.size>4)this.cache.delete(this.cache.keys().next().value!);return result;
  }finally{if(this.id===id){this.id=null;this.abort=null;}}
 }
}
export async function monkerDecision(snapshot:LiveSnapshot,input:DecisionInput,client:MonkerClient,config=prepareMonker(snapshot,input)):Promise<DecisionResult>{
 const plan=buildMonkerPlan(config),result=await client.compute(config),node=plan.nodes[plan.decision-1],s=node.state;
 if(s.actor!==input.hero||s.terminal||JSON.stringify(s.bets)!==JSON.stringify(input.state.bets)||s.stacks.some((v,i)=>v+config.stacks[i]-plan.effectiveStacks[i]!==input.state.stacks[i])||s.canRaise[input.hero]!==input.state.canRaise[input.hero])throw Error('Monkers beslut matchar inte aktuell tur, insatser eller höjningsrätt.');
 const actions:DecisionAction[]=node.actions.map((a,i)=>{
  let action={...a,frequency:result.frequencies[i],ev:null,allIn:a.cost===input.state.stacks[input.hero]};
  if(!legalRiverRoot(input,[action])&&a.allIn&&['bet','raise'].includes(a.kind)){
   const cost=input.state.stacks[input.hero],to=input.state.bets[input.hero]+cost;action={...action,cost,to,allIn:true,id:`${a.kind}:${to}`};
  }
  if(!legalRiverRoot(input,[action]))throw Error('Monkers handling är inte laglig i det avlästa läget.');return action;
 });
 if(new Set(actions.map(a=>a.id)).size!==actions.length)throw Error('Monkers effektiva storlekar kan inte mappas entydigt.');
 const verified=result.quality!.status==='verified';
 return {key:input.key,rangeRevision:input.rangeRevision,quality:verified?'verified-gto':'solver-unverified',provider:'monker-free-10114',actions,recommended:actions.findIndex(a=>a.frequency===Math.max(...actions.map(x=>x.frequency))),iterations:result.iterations,rootVisits:0,elapsedMs:(result as MonkerAnswer&{wallMs?:number}).wallMs??result.elapsedMs,cutoffCount:0,exploitabilityPct:verified?result.quality!.errorPct:null,
  qualityMetric:'max-unilateral',qualityLimitPct:MONKER_ERROR_PCT,modelVerified:true,qualityNote:result.quality!.reason,
  assumptions:[...input.assumptions,...(!input.ranges[input.hero].trim()?['Din förvalda startprior är topp 50 %; motståndarnas tomma ranger är fulla.']:[]),'Inga motståndarkort antas kända. Ingen rake ingår.'],
  limitations:['2,1 % av rotpotten är mål för största ensidiga EV-förbättringen per spelare. Om felmått saknas är strategin inte verifierad GTO.','Begränsat bettingträd: 50 % pott och höjning vid aktuellt beslut. Fortsättningar använder check, effektiva all-in-bets och fold/call utan ytterligare höjningar.','Osynad överskjutande stack ingår inte i bettingmodellen.','EV visas inte eftersom Monkers samplade träningsvärden inte är verifierade action-EV.']};
}
