import {buildMonkerPlan,canonicalHand,type MonkerConfig} from './config';
export const MONKER_VENDOR_SHA='f66d7f2b5d8b35393577a39abfc0325215f26dd5102355e1ae49be477318e652';
export {validateMonkerConfig,encodeMonkerRequest,buildMonkerPlan} from './config';
export interface MonkerAnswer {
 vendorSha256:string;requestSha256:string;players:number;decision:number;
 ranges:{cards:string;weight:number}[][];rangeCounts:number[];frequencies:number[];
 bucketWeight:number;iterations:number;elapsedMs:number;measuredErrorPct:number|null;
 nodes:{id:number;actor:number;street:number;contributions:number[];active:number[];actions:number[];children:number[]}[];
 auditCandidate:boolean;quality?:{status:'verified'|'unknown'|'failed';errorPct:number|null;limitPct:number;metric:'max-unilateral';reason:string};
}
export function checkMonkerResponse(config:MonkerConfig,raw:unknown):MonkerAnswer {
 const r=raw as MonkerAnswer,plan=buildMonkerPlan(config),n=config.stacks.length;
 if(!r||r.vendorSha256!==MONKER_VENDOR_SHA||!(/^[a-f0-9]{64}$/).test(r.requestSha256)||r.players!==n||r.decision!==plan.decision||
   r.nodes?.length!==plan.nodes.length||r.ranges?.length!==n||r.rangeCounts?.length!==n||!Number.isSafeInteger(r.iterations)||r.iterations<=0||
   !Number.isFinite(r.elapsedMs)||r.elapsedMs<0||!Number.isFinite(r.bucketWeight)||r.bucketWeight<=0)
   throw Error('Monkerresultatet saknar giltig modell- eller träningsidentitet.');
 const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
 for(let p=0;p<n;p++){
  const expected=new Map(config.ranges[p].map(h=>[canonicalHand(h.cards),h.weight]));
  const actual=r.ranges[p];
  if(!Array.isArray(actual)||actual.length!==expected.size||r.rangeCounts[p]!==expected.size||new Set(actual.map(h=>canonicalHand(h.cards))).size!==expected.size||
   actual.some(h=>!Number.isFinite(h.weight)||!expected.has(canonicalHand(h.cards))||Math.abs(h.weight-expected.get(canonicalHand(h.cards))!)>1e-12))throw Error('Monkers faktiska ranger skiljer sig från beställningen.');
 }
 for(let i=0;i<plan.nodes.length;i++){
  const expected=plan.nodes[i],actual=r.nodes[i],s=expected.state;
  if(actual.id!==expected.id||actual.street!==(s.terminal?4:s.street==='turn'?2:3)||(!s.terminal&&actual.actor!==s.actor)||
    !same(actual.contributions,s.invested)||!same(actual.active,s.folded.map((f,p)=>f?-1:p).filter(p=>p>=0))||!same(actual.actions,expected.codes)||!same(actual.children,expected.children))
    throw Error(`Monkers bettingträd skiljer sig från den lagliga modellen vid nod ${expected.id}.`);
 }
 if(r.frequencies?.length!==plan.nodes[plan.decision-1].actions.length||r.frequencies.some(v=>!Number.isFinite(v)||v<0||v>1)||Math.abs(r.frequencies.reduce((s,v)=>s+v,0)-1)>1e-9)
   throw Error('Monkerresultatet saknar normaliserad handstrategi.');
 return r;
}
