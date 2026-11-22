import type {LiveSnapshot} from '../live/types';
import type {DecisionInput} from '../decision/types';
import {cardCode} from 'phe';
import {parseRange} from '../decision/sampler';
import {validateBettingState,legalActions,applyAction} from '../decision/betting';
import type {BettingAction,BettingState} from '../decision/types';
export interface MonkerPlan {nodes:{id:number;state:BettingState;actions:BettingAction[];codes:number[];children:number[]}[];decision:number;effectiveStacks:number[];tree:Uint8Array}
const effectiveStacksFor=(stacks:number[])=>stacks.map((v,p)=>Math.min(v,Math.max(...stacks.filter((_,i)=>p!==i))));
export function buildMonkerPlan(config:MonkerConfig):MonkerPlan{
  const c=validateMonkerConfig(config),n=c.stacks.length;
  const effectiveStacks=effectiveStacksFor(c.stacks);
  if(c.prefix.some(code=>code>11&&code-11>Math.max(...effectiveStacks)))throw Error('Den osynade överinsatsen kan inte matchas i Monkers modell.');
  const initial:BettingState={street:c.board.length===4?'turn':'river',stacks:[...effectiveStacks],bets:Array(n).fill(0),invested:Array(n).fill(0),folded:Array(n).fill(false),pending:Array(n).fill(true),canRaise:Array(n).fill(true),actor:0,dealer:n-1,currentBet:0,lastFullRaise:c.minBet,minBet:c.minBet,deadPot:c.pot,raises:0,history:'',boardCount:c.board.length,terminal:false};
  const nodes:MonkerPlan['nodes']=[];let decision=0;
  const effectiveTo=(s:BettingState)=>s.bets[s.actor]+Math.min(s.stacks[s.actor],Math.max(0,Math.max(...s.stacks.map((v,i)=>i===s.actor||s.folded[i]?0:v+s.invested[i]))-s.invested[s.actor]));
  const code=(a:BettingAction,s:BettingState)=>a.kind==='fold'?0:a.kind==='check'||a.kind==='call'?1:a.allIn||a.to===effectiveTo(s)?3:11+a.to-s.currentBet;
  function walk(state:BettingState,path:number[]):number{
    if(nodes.length>=12000||path.length>64)throw Error(`Monkers valda bettingträd överskrider minnesbudgeten (${n} spelare, ${nodes.length} noder, djup ${path.length}).`);
    const id=nodes.length+1,node:MonkerPlan['nodes'][number]={id,state,actions:[],codes:[],children:[]};nodes.push(node);
    if(state.terminal)return id;
    const isCurrent=path.length===c.prefix.length&&path.every((v,i)=>v===c.prefix[i]);
    const isPrefix=path.length<c.prefix.length&&path.every((v,i)=>v===c.prefix[i]);
    const fractions=isCurrent?[0.5]:[];
    if(isPrefix&&c.prefix[path.length]>11){
      const amount=c.prefix[path.length]-11,call=state.currentBet-state.bets[state.actor];
      fractions.push(amount/(state.deadPot+state.invested.reduce((s,v)=>s+v,0)+call));
    }
    // Monker returns uncallable excess instead of committing it to the pot.
    // Include that legal effective sizing and omit an oversized commitment.
    const cap=effectiveTo(state),ownCap=state.bets[state.actor]+state.stacks[state.actor];
    if(cap<ownCap&&cap>state.currentBet){
      const pot=state.deadPot+state.invested.reduce((s,v)=>s+v,0),call=state.currentBet-state.bets[state.actor];
      fractions.push(state.currentBet===0?cap/pot:(cap-state.currentBet)/(pot+call));
    }
    // Keep the live abstraction bounded with uneven stacks. Re-raises at every
    // hypothetical continuation multiply the multiway tree; the current player
    // can raise, while off-path responses are fold/call. Unopened nodes retain
    // check and effective all-in bets. This limitation is shown with the result.
    const rules={betFractions:fractions,raiseFractions:fractions,maxRaises:isCurrent?1:0,includeAllIn:true};
    node.actions=legalActions(state,rules).filter(a=>!['bet','raise'].includes(a.kind)||a.to<=cap);node.codes=node.actions.map(a=>code(a,state));
    if(node.codes.some(v=>v>39999)||new Set(node.codes).size!==node.codes.length)throw Error('Monkers beloppsformat kan inte representera storleken exakt.');
    if(isPrefix&&!node.codes.includes(c.prefix[path.length]))throw Error('Monker kan inte återskapa den observerade bettinglinjen.');
    if(isCurrent){if(state.actor!==c.hero)throw Error('Monkers linje matchar inte din tur.');decision=id;}
    node.children=node.actions.map((a,i)=>walk(applyAction(state,a,rules),[...path,node.codes[i]]));
    return id;
  }
  walk(initial,[]);if(!decision)throw Error('Aktuellt beslut saknas i Monkers träd.');
  const bytes:number[]=[];
  const int=(v:number)=>{for(let i=3;i>=0;i--)bytes.push((v>>>(8*i))&255);};
  const short=(v:number)=>bytes.push((v>>>8)&255,v&255);
  int(0);int(33486);int(n);int(1);int(c.board.length-2);int(c.pot*1000);
  for(let p=0;p<n;p++)int(effectiveStacks[(p-1+n)%n]*1000);
  function stored(id:number,action?:number){
    const node=nodes[id-1];if(action!==undefined)short(action);short(node.actions.length);
    for(let i=node.children.length-1;i>=0;i--)stored(node.children[i],node.codes[i]);
  }
  stored(1);bytes.push(0);
  return {nodes,decision,effectiveStacks,tree:Uint8Array.from(bytes)};
}
export const TOP_50_RANGE='33+,A2s+,K2s+,Q2s+,J4s+,T6s+,96s+,86s+,76s,65s,A2o+,K5o+,Q7o+,J7o+,T8o+,98o,T7o:0.25';
export const MONKER_ERROR_PCT=2.1 as const;
const labels=new Map<number,string>();
for(const r of '23456789TJQKA')for(const s of 'shdc')labels.set(cardCode(r,s),r+s);
export const canonicalHand=(s:string)=>s.match(/../g)!.sort().join('');
export interface MonkerConfig {
  board:string[];pot:number;stacks:number[];hero:number;heroCards:string[];
  minBet:number;prefix:number[];ranges:{cards:string;weight:number}[][];limitPct:2.1;
}
export function prepareMonker(snapshot:LiveSnapshot,input:DecisionInput):MonkerConfig{
  if(snapshot.variant==='sixplus'||snapshot.variant==='unknown')throw Error('Monkeranslutningen kräver vanlig 52-korts NLHE.');
  const n=input.seats.length,s=input.state;
  validateBettingState(s);
  if(n<3||n>6||![4,5].includes(input.board.length))throw Error('Monker stöder 3–6 aktiva spelare på turn och river.');
  if(s.terminal||s.actor!==input.hero||!s.pending[input.hero]||s.folded.some(Boolean))throw Error('Monker kan inte matcha aktör och deltagande.');
  if(s.invested.some((v,i)=>v!==s.bets[i])||s.stacks.some((v,i)=>v+s.bets[i]<=0))throw Error('Tidigare all-in eller sidopott kan inte matchas av Monkeranslutningen.');
  const highest=Math.max(...s.bets),positive=s.bets.map((v,i)=>v>0?i:-1).filter(i=>i>=0),prefix:number[]=[];
  if(highest===0){for(let i=0;i<input.hero;i++)prefix.push(1);}
  else {
    if(s.bets.some(v=>v>0&&v!==highest))throw Error('Den höjda insatslinjen är inte entydig för Monker.');
    const observed=[...snapshot.observedActions].reverse().find(a=>a.street===snapshot.street&&a.action==='bet');
    const bettor=positive.length===1?positive[0]:input.seats.indexOf(observed?.seat??-1);
    if(bettor<0||s.bets[bettor]!==highest)throw Error('Insatslinjen saknar entydig första bet för Monker.');
    const before=s.stacks.map((v,i)=>v+s.bets[i]);
    const betCode=highest===effectiveStacksFor(before)[bettor]?3:highest+11;
    if(betCode>=40000)throw Error('Den observerade insatsen kan inte representeras exakt i Monker.');
    for(let i=0;i<bettor;i++)prefix.push(1);
    prefix.push(betCode);
    const reached=new Set([bettor]);
    for(let i=(bettor+1)%n;i!==input.hero;i=(i+1)%n){
      if(reached.has(i)||s.bets[i]!==highest)throw Error('Den observerade insatslinjen matchar inte turordningen.');
      prefix.push(1);reached.add(i);
    }
    if(s.bets.some((v,i)=>v>0&&!reached.has(i)))throw Error('Tidigare insatser kan inte bindas till Monkers linje.');
  }
  const blocked=input.board.map(c=>cardCode(c[0],c[1]));
  const parsed=new Map<string,MonkerConfig['ranges'][number]>();
  const ranges=input.ranges.map((text,p)=>{
    const source=text.trim()||(p===input.hero?TOP_50_RANGE:'');
    let range=parsed.get(source);
    if(!range){
      range=parseRange(source,blocked).map(h=>({cards:h.cards.map(c=>labels.get(c)!).join(''),weight:h.weight}));
      parsed.set(source,range);
    }
    return range;
  });
  return validateMonkerConfig({board:[...input.board],pot:s.deadPot,stacks:s.stacks.map((v,i)=>v+s.bets[i]),hero:input.hero,heroCards:[...input.heroCards],minBet:s.minBet,prefix,ranges,limitPct:MONKER_ERROR_PCT});
}
/** The desktop endpoint validates independently of the renderer. No opponent
 * is conditioned on the actual hero cards in the range sent to the kernel. */
export function validateMonkerConfig(raw:unknown):MonkerConfig{
  const c=raw as MonkerConfig,n=c?.stacks?.length;
  const chip=(x:number)=>Number.isSafeInteger(x)&&x>0&&x<=10000000;
  const card=(x:string)=>typeof x==='string'&&/^[2-9TJQKA][shdc]$/.test(x);
  if(![4,5].includes(c?.board?.length)||!c.board.every(card)||new Set(c.board).size!==c.board.length||
    n<3||n>6||!c.stacks.every(chip)||!chip(c.pot)||c.pot+c.stacks.reduce((s,v)=>s+v,0)>1000000||!chip(c.minBet)||c.limitPct!==MONKER_ERROR_PCT||
    !Number.isInteger(c.hero)||c.hero<0||c.hero>=n||c.heroCards?.length!==2||!c.heroCards.every(card)||new Set([...c.board,...c.heroCards]).size!==c.board.length+2||
    !Array.isArray(c.prefix)||c.prefix.length>12||c.prefix.some(a=>!Number.isInteger(a)||!(a===1||a===3||(a>=12&&a<40000)))||c.ranges?.length!==n)
    throw Error('Ogiltig Monkerkonfiguration.');
  for(const range of c.ranges){
    if(!Array.isArray(range)||!range.length||range.length>1326)throw Error('En Monker-range saknar lagliga händer.');
    const seen=new Set<string>();
    for(const h of range){
      if(typeof h.cards!=='string'||!/^([2-9TJQKA][shdc]){2}$/.test(h.cards)||h.cards.slice(0,2)===h.cards.slice(2)||
        h.cards.match(/../g)!.some(ca=>c.board.includes(ca))||!Number.isFinite(h.weight)||h.weight<=0||h.weight>1||seen.has(canonicalHand(h.cards)))
        throw Error('Ogiltiga kombinationer eller vikter i Monker-range.');
      seen.add(canonicalHand(h.cards));
    }
  }
  if(!c.ranges[c.hero].some(h=>canonicalHand(h.cards)===canonicalHand(c.heroCards.join(''))))throw Error('Dina kort ligger utanför din valda range. Ändra rangen för att analysera handen.');
  // Check that the actual root hand has at least one legal joint deal. The
  // full priors remain intact; this is feasibility, not opponent range pruning.
  const remaining=c.ranges.map((r,p)=>p===c.hero?[{cards:c.heroCards.join(''),weight:1}]:r).sort((a,b)=>a.length-b.length);
  let tries=0;
  function joint(p:number,used:Set<string>):boolean{
    if(p===n)return true;
    for(const h of remaining[p]){
      if(++tries>50000)throw Error('Monkers kontroll av förenliga ranger överskred budgeten.');
      const cards=h.cards.match(/../g)!;if(cards.some(ca=>used.has(ca)))continue;
      if(joint(p+1,new Set([...used,...cards])))return true;
    }
    return false;
  }
  if(!joint(0,new Set(c.board)))throw Error('Motståndarnas ranger saknar förenliga händer mot dina kort.');
  return structuredClone(c);
}
/** Small bounded binary input; Java receives no executable text or shell args. */
export function encodeMonkerRequest(config:MonkerConfig):Uint8Array{
  const c=validateMonkerConfig(config),bytes:number[]=[];
  const int=(v:number)=>{for(let i=3;i>=0;i--)bytes.push((v>>>(8*i))&255);};
  const str=(s:string)=>{bytes.push(0,s.length);for(const ca of s)bytes.push(ca.charCodeAt(0));};
  int(0x4d4b5231);int(c.stacks.length);int(c.board.length-2);int(c.pot);int(c.minBet);int(c.hero);int(c.prefix.length);
  c.prefix.forEach(int);c.stacks.forEach(int);c.board.forEach(str);c.heroCards.forEach(str);
  for(const range of c.ranges){int(range.length);for(const h of range){str(h.cards);const b=new Uint8Array(8);new DataView(b.buffer).setFloat64(0,h.weight,false);bytes.push(...b);}}
  const tree=buildMonkerPlan(c).tree;int(tree.length);bytes.push(...tree);
  return Uint8Array.from(bytes);
}
