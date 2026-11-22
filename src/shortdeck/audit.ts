import type { BettingAction, BettingState } from '../decision/types';
import { applyAction, legalActions } from '../decision/betting';
import type { SolvedNode } from '../core/types';
export interface RangeHand {cards:string;weight:number}
export interface RiverConfig {board:string[];pot:number;stack:number;minBet:number; ranges?:RangeHand[][]}
export interface RiverTree {nodes:(SolvedNode & {state?:BettingState})[];rootRanges:RangeHand[][];config:RiverConfig}
const canonical=(s:string)=>s.match(/../g)!.sort().join('');
const shortCard=(s:string)=>/^[6-9TJQKA][shdc]$/.test(s);
export function evaluate5(cards:string[]):number {
 const ranks=cards.map(c=>'23456789TJQKA'.indexOf(c[0])+2).sort((a,b)=>b-a);
 const groups=[...new Set(ranks)].map(rank=>({rank,count:ranks.filter(r=>r===rank).length})).sort((a,b)=>b.count-a.count||b.rank-a.rank);
 const flush=cards.every(c=>c[1]===cards[0][1]);
 const straight=groups.length===5?(ranks[0]-ranks[4]===4?ranks[0]:ranks.join(',')==='14,9,8,7,6'?9:0):0;
 let cat:number,kick:number[];
 if(flush&&straight){cat=8;kick=[straight];}
 else if(groups[0].count===4){cat=7;kick=groups.map(g=>g.rank);}
 else if(flush){cat=6;kick=ranks;}
 else if(groups[0].count===3&&groups[1].count===2){cat=5;kick=groups.map(g=>g.rank);}
 else if(groups[0].count===3){cat=4;kick=groups.map(g=>g.rank);}
 else if(straight){cat=3;kick=[straight];}
 else if(groups[0].count===2&&groups[1].count===2){cat=2;kick=groups.map(g=>g.rank);}
 else if(groups[0].count===2){cat=1;kick=groups.map(g=>g.rank);}
 else{cat=0;kick=ranks;}
 return Array.from({length:5},(_,i)=>kick[i]??0).reduce((v,k)=>v*15+k,cat);
}
export function evaluate7(cards:string[]):number {
 if(cards.length!==7||new Set(cards).size!==7||cards.some(c=>!shortCard(c)))throw new Error('Invalid 6+ cards');
 let best=-1;
 for(let i=0;i<7;i++)for(let j=i+1;j<7;j++)best=Math.max(best,evaluate5(cards.filter((_,k)=>k!==i&&k!==j)));
 return best;
}
export function convertTexasRiver(raw:any, config:RiverConfig):RiverTree {
 const {board,pot,stack,minBet}=config;
 if(board.length!==5||new Set(board).size!==5||board.some(c=>!shortCard(c))||![pot,stack,minBet].every(n=>Number.isSafeInteger(n)&&n>0))throw new Error('Invalid river model');
 const nodes:RiverTree['nodes']=[], rootRanges:RangeHand[][]=config.ranges?.map(range=>range.map(h=>({...h,cards:canonical(h.cards)})))??[];
 function walk(value:any,state:BettingState,depth:number):number {
  if(depth>24||nodes.length>500||!value||value.node_type!=='action_node'||value.player!==1-state.actor||!Array.isArray(value.actions)||!value.actions.length||value.actions.length>12||JSON.stringify(value.strategy?.actions)!==JSON.stringify(value.actions))throw new Error('Invalid native tree');
  const id=nodes.length, player=state.actor, table=value.strategy?.strategy;
  if(!table||typeof table!=='object'||Array.isArray(table))throw new Error('Missing policy');
  const hands=Object.entries(table).map(([cards,frequencies]:[string,any])=>{
   const hole=cards.match(/../g);
   if(!hole||cards.length!==4||hole.some(c=>!shortCard(c)||board.includes(c))||hole[0]===hole[1]||!Array.isArray(frequencies)||frequencies.length!==value.actions.length||frequencies.some((v:any)=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>1)||Math.abs(frequencies.reduce((a:number,b:number)=>a+b,0)-1)>1e-5)throw new Error('Invalid native hand policy');
   return {cards:canonical(cards),weight:1,compatibleMass:0,frequencies,ev:null,actionEvs:frequencies.map(()=>null)};
  });
  if(!rootRanges[player])rootRanges[player]=hands.map(({cards,weight})=>({cards,weight}));
  const expected=new Map(rootRanges[player].map(h=>[canonical(h.cards),h.weight]));
  if(hands.length!==expected.size||new Set(hands.map(h=>h.cards)).size!==hands.length||hands.some(h=>!expected.has(h.cards)))throw new Error('Policy range differs from requested range');
  hands.forEach(h=>{h.weight=expected.get(h.cards)!;});
  const n:RiverTree['nodes'][number]={id,kind:'decision',player,board:[...board],street:'river',pot:state.deadPot+state.invested[0]+state.invested[1],stacks:[...state.stacks],actions:[],hands,state};
  nodes.push(n);
  const required=state.currentBet>state.bets[player]?['fold','call']:['check'];
  const children=value.childrens??{};
  const expectedChildren:string[]=[];
  for(const label of value.actions){
   if(typeof label!=='string')throw new Error('Invalid action');
   const match=/^(FOLD|CHECK|CALL|BET|RAISE)(?: (\d+(?:\.\d+)?))?$/.exec(label);
   if(!match)throw new Error('Invalid action label');
   const kind=match[1].toLowerCase() as BettingAction['kind'];
   const own=state.bets[player],call=state.currentBet-own;
   const to=kind==='fold'||kind==='check'?own:kind==='call'?own+Math.min(state.stacks[player],call):own+Number(match[2]);
   if(!Number.isSafeInteger(to)||((kind==='bet'||kind==='raise')!==Boolean(match[2])))throw new Error('Fractional or invalid amount');
   const fraction=state.currentBet===0?to/n.pot:(to-state.currentBet)/(n.pot+call);
   const rules={betFractions:[fraction>0?fraction:1],raiseFractions:[fraction>0?fraction:1],maxRaises:24,includeAllIn:true};
   const action=legalActions(state,rules).find(a=>a.kind===kind&&a.to===to);
   if(!action||n.actions.some(a=>a.label===kind&&a.amount_to===to))throw new Error('Illegal or duplicate native action '+JSON.stringify({label,state}));
   const next=applyAction(state,action,rules);
   let child:number;
   if(next.terminal){
    if(children[label])throw new Error('Unexpected terminal child');
    child=nodes.length;
    const folder=next.folded.findIndex(Boolean),matched=Math.min(...next.invested);
    nodes.push({id:child,kind:'terminal',street:'river',board:[...board],pot:pot+2*matched,actions:[],hands:[],stacks:[...next.stacks],terminal:{kind:folder<0?'showdown':'fold',...(folder<0?{}:{folder}),pot:pot+2*matched}});
   }else{expectedChildren.push(label);child=walk(children[label],next,depth+1);}
   n.actions.push({label:kind,text:label,amount_to:to,percent_of_pot:100*fraction,child});
  }
  if(required.some(kind=>!n.actions.some(a=>a.label===kind))||Object.keys(children).some(k=>!expectedChildren.includes(k)))throw new Error('Incomplete action tree');
  return id;
 }
 walk(raw,{street:'river',stacks:[stack,stack],bets:[0,0],invested:[0,0],folded:[false,false],pending:[true,true],canRaise:[true,true],actor:0,dealer:1,currentBet:0,lastFullRaise:minBet,minBet,deadPot:pot,raises:0,history:'',boardCount:5,terminal:false},0);
 return {nodes,rootRanges,config};
}
/** Vector counterfactual traversal: opponent reach is shared across all hero
 * hands. Blocked pairs have zero utility. Maximisation remains per private
 * hand, never per hidden opponent hand. */
export function auditRiver(tree:RiverTree){
 const {nodes,rootRanges,config}=tree;
 const holes=rootRanges.map(range=>range.map(h=>h.cards.match(/../g)!));
 const ranks=holes.map(range=>range.map(h=>evaluate7([...config.board,...h])));
 const counts=rootRanges.map(r=>r.length), size=counts[0]*counts[1];
 if(!size||size>400000)throw new Error('Range budget exceeded');
 const compatible=new Uint8Array(size), showdown=new Int8Array(size);
 let mass=0;
 for(let a=0;a<counts[0];a++)for(let b=0;b<counts[1];b++){
  const index=a*counts[1]+b;
  if(holes[0][a].some(c=>holes[1][b].includes(c)))continue;
  compatible[index]=1;showdown[index]=Math.sign(ranks[0][a]-ranks[1][b]);
  mass+=rootRanges[0][a].weight*rootRanges[1][b].weight;
 }
 if(!(mass>0))throw new Error('No compatible ranges');
 const policies=new Map<number,number[][]>();
 for(const n of nodes)if(n.kind==='decision'){
  const map=new Map(n.hands.map(h=>[canonical(h.cards),h.frequencies]));
  policies.set(n.id,rootRanges[n.player!].map(h=>map.get(canonical(h.cards))!));
 }
 function value(hero:number,maximize:boolean){
  const ownCount=counts[hero],oppCount=counts[1-hero];
  function visit(id:number,reach:Float64Array):Float64Array {
   const n=nodes[id],out=new Float64Array(ownCount);
   if(n.kind==='terminal'){
    const fold=n.terminal!.kind==='fold', sign=n.terminal!.folder===hero?-1:1, amount=n.terminal!.pot/2;
    for(let h=0;h<ownCount;h++){
     let total=0;
     for(let o=0;o<oppCount;o++){
      const index=hero===0?h*counts[1]+o:o*counts[1]+h;
      total+=reach[o]*(fold?compatible[index]*sign:showdown[index]*(hero===0?1:-1));
     }
     out[h]=total*amount;
    }
    return out;
   }
   if(n.kind!=='decision')throw new Error('Only river is supported');
   const policy=policies.get(id)!;
   if(n.player===hero){
    const vals=n.actions.map(a=>visit(a.child,reach));
    for(let h=0;h<ownCount;h++)out[h]=maximize?Math.max(...vals.map(v=>v[h])):vals.reduce((s,v,i)=>s+v[h]*policy[h][i],0);
   }else{
    for(let i=0;i<n.actions.length;i++){
     const next=new Float64Array(oppCount);
     for(let o=0;o<oppCount;o++)next[o]=reach[o]*policy[o][i];
     const vals=visit(n.actions[i].child,next);
     for(let h=0;h<ownCount;h++)out[h]+=vals[h];
    }
   }
   return out;
  }
  const vals=visit(0,Float64Array.from(rootRanges[1-hero].map(h=>h.weight)));
  return vals.reduce((s,v,i)=>s+v*rootRanges[hero][i].weight,0)/mass;
 }
 const ev=[value(0,false),value(1,false)],bestResponse=[value(0,true),value(1,true)];
 const exploitabilityChips=bestResponse[0]+bestResponse[1];
 return {ev,bestResponse,gains:bestResponse.map((v,i)=>v-ev[i]),exploitabilityChips,nashConvPct:100*exploitabilityChips/config.pot,averageExploitabilityPct:50*exploitabilityChips/config.pot};
}
