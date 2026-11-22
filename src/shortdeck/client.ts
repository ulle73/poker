import {cardCode} from 'phe';
import type {LiveSnapshot} from '../live/types';
import type {DecisionInput,DecisionResult} from '../decision/types';
import {prepareLiveSolve} from '../live/analysis';
import {parseRange} from '../decision/sampler';
import {canonicalHand} from './hands';
import type {RiverConfig,RiverTree} from './audit';
interface NativeAnswer {tree:RiverTree;report:{nashConvPct:number};elapsedMs:number;iterations:number; auditMs:number}
const fullRange=[...'6789TJQKA'].flatMap((r,i,all)=>[r+r,...all.slice(0,i).flatMap(l=>[r+l+'s',r+l+'o'])]).join(',');
const labels=new Map<number,string>();
for(const r of '23456789TJQKA')for(const s of 'shdc')labels.set(cardCode(r,s),r+s);
export function prepareSixplus(snapshot:LiveSnapshot,input:DecisionInput){
 if(snapshot.variant!=='sixplus')throw new Error('6+-motorn används endast för bekräftade 6+-bord.');
 if(input.seats.length!==2)throw new Error('6+-motorn stöder ännu bara två aktiva spelare.');
 if(input.board.length!==5)throw new Error('6+-motorn har nu kontrollerat stöd på river. Preflop, flop och turn saknar ansluten 6+-strategi.');
 const prepared=prepareLiveSolve(snapshot,fullRange,fullRange);
 const chips=(n:number)=>{const k=Math.round(n/input.chipUnit);if(Math.abs(n/input.chipUnit-k)>1e-6)throw new Error('Fractional client chip');return k;};
 const ranges=input.ranges.map(text=>parseRange(text).map(h=>({cards:h.cards.map(c=>labels.get(c)!).join(''),weight:h.weight})).filter(h=>h.cards.match(/../g)!.every(c=>/^[6-9TJQKA]/.test(c)&&!input.board.includes(c))));
 const initialBet=input.state.currentBet;
 const config:RiverConfig & {betPct?:number}={board:input.board,pot:chips(prepared.config.pot),stack:chips(prepared.config.stack),minBet:input.state.minBet,ranges,
  ...(initialBet>0?{betPct:initialBet/chips(prepared.config.pot)*100}:{})};
 return {config,line:prepared.line};
}
export class SixplusClient {
 private id:string|null=null;
 private abort:AbortController|null=null;
 private cache=new Map<string,NativeAnswer>();
 cancel(){
  this.abort?.abort(); this.abort=null;
  if(this.id){void fetch(new URL('sixplus-cancel',document.baseURI),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:this.id})}).catch(()=>{});}
  this.id=null;
 }
 async compute(config:RiverConfig):Promise<NativeAnswer>{
  const key=JSON.stringify(config),cached=this.cache.get(key);
  if(cached)return cached;
  const id=crypto.randomUUID(),controller=new AbortController();this.id=id;this.abort=controller;
  try{
   const response=await fetch(new URL('sixplus-solve',document.baseURI),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,config}),signal:controller.signal});
   const answer=await response.json();
   if(!response.ok||answer.error)throw new Error(answer.error||'6+-solvern kunde inte startas.');
   if(this.id!==id)throw new Error('Avbruten 6+-beräkning.');
   if(!Number.isFinite(answer.report?.nashConvPct)||answer.report.nashConvPct<0||answer.report.nashConvPct>0.2)throw new Error('6+-lösningen saknar godkänd kvalitetskontroll.');
   this.cache.set(key,answer);if(this.cache.size>4)this.cache.delete(this.cache.keys().next().value!);
   return answer;
  }finally{if(this.id===id){this.id=null;this.abort=null;}}
 }
}
export async function sixplusDecision(snapshot:LiveSnapshot,input:DecisionInput,client:SixplusClient):Promise<DecisionResult>{
 const {config,line}=prepareSixplus(snapshot,input),solved=await client.compute(config);
 let node=solved.tree.nodes[0];
 const reach=solved.tree.rootRanges.map(r=>new Map(r.map(h=>[canonicalHand(h.cards),h.weight])));
 for(const step of line){
  const index=node.actions.findIndex(a=>step==='check'?a.label==='check':a.label==='bet'&&Math.abs(a.amount_to!-(step==='allin'?config.stack:config.pot*Number(step.split(':')[1])/100))<1e-5);
  if(index<0)throw new Error('Den aktuella 6+-linjen saknas i det lösta trädet.');
  for(const hand of node.hands){const key=canonicalHand(hand.cards);reach[node.player!].set(key,(reach[node.player!].get(key)??0)*hand.frequencies[index]);}
  node=solved.tree.nodes[node.actions[index].child];
 }
 if(node.kind!=='decision'||node.player!==input.hero)throw new Error('6+-trädet matchar inte din tur.');
 const key=canonicalHand(input.heroCards.join('')),hand=node.hands.find(h=>canonicalHand(h.cards)===key);
 if(!hand||(reach[input.hero].get(key)??0)<=0)throw new Error('Dina kort saknar nåbar 6+-strategi i angiven range.');
 const oppMass=[...reach[1-input.hero]].filter(([cards])=>!cards.match(/../g)!.some(c=>input.heroCards.includes(c))).reduce((s,[,v])=>s+v,0);
 if(oppMass<=1e-12)throw new Error('Motståndarens handling saknar stöd i den lösta rangen.');
 const own=node.state!.bets[input.hero];
 const actions=node.actions.map((a,i)=>({kind:a.label as DecisionResult['actions'][number]['kind'],to:a.amount_to!,cost:a.amount_to!-own,allIn:a.amount_to!-own===input.state.stacks[input.hero],id:`${a.label}:${a.amount_to}`,frequency:hand.frequencies[i],ev:null}));
 return {key:input.key,rangeRevision:input.rangeRevision,quality:'verified-gto',provider:'texassolver-0.2.0/sixplus-river',actions,recommended:actions.findIndex(a=>a.frequency===Math.max(...actions.map(x=>x.frequency))),iterations:solved.iterations,rootVisits:0,elapsedMs:solved.elapsedMs,cutoffCount:0,exploitabilityPct:solved.report.nashConvPct,
  assumptions:[...input.assumptions,'Svenska Spels 6+-rankning: färg över kåk och triss över stege. Tom range använder jämnt fördelade lagliga 36-kortshänder.'],
  limitations:['Två aktiva spelare, river och valt bettingträd. Ingen rake.','Kvalitetsmåttet är oberoende NashConv / rotpott; summan av båda spelarnas möjliga förbättringar.','Handlingars EV exporteras inte och visas därför som okänt.']};
}
