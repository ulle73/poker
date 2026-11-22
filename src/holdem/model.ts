import type {LiveSnapshot} from '../live/types';
import type {DecisionInput,DecisionResult,DecisionAction} from '../decision/types';
import {validateBettingState} from '../decision/betting';
import {parseRange} from '../decision/sampler';
import {canonicalHand,TOP_50_RANGE} from '../monker/config';
import {cardCode} from 'phe';
import {legalRiverRoot} from '../decision/river-legality';

export interface HoldemConfig {
 schema:'poker-holdem-flop-v1';hero:number;heroCards:string[];handIndex:number;history:string;
 pot:number;stacks:number[];minBet:number;
 request:{variant:2;players:number;button:number;street:'flop';entry_point:'flop';board:string;starting_pot_bb:number;stack_bb:number;effective_stack_bb:number;seat_stacks_bb:number[];ranges:Record<string,string>;use_default_ranges:false;entry_private_keying:'lossless';iterations:number;threads:number;buckets:number;buckets_by_street:{flop:number;turn:number;river:number};max_raises_per_street:number;postflop_bet_fractions:number[];postflop_raise_fractions:number[];postflop_raise_mode:'facing';allow_oop_bet:true;allow_donk_bets:true;export_nodes:true;artifact_save_mode:'ultra_light';strategy_snapshot_interval:number;memory_budget_mb:number;seed:number};
}
export interface HoldemRow {player:number;history:string;street:string;hand_index:number;exact_entry_street_key:boolean;visits:number;legal_actions:string[];action_freqs:Record<string,number>;node_locked?:boolean;unvisited_default?:boolean}
export function holdemHandIndex(cards:readonly string[]):number{
 const indices=cards.map(c=>'23456789TJQKA'.indexOf(c[0])*4+'cdhs'.indexOf(c[1])).sort((a,b)=>a-b),[lo,hi]=indices;
 if(cards.length!==2||cards.some(c=>!/^[2-9TJQKA][cdhs]$/.test(c))||lo===hi)throw Error('Ogiltiga Holdem-kort.');
 return lo*51-lo*(lo-1)/2+hi-lo-1;
}
export function prepareHoldem(snapshot:LiveSnapshot,input:DecisionInput):HoldemConfig{
 const s=input.state,n=input.seats.length;validateBettingState(s);
 if(snapshot.variant==='unknown'||snapshot.variant==='sixplus'||s.street!=='flop'||input.board.length!==3||n<2||n>6)throw Error('Holdem Solver kräver vanlig NLHE, 2–6 aktiva spelare på flop.');
 if(s.terminal||s.actor!==input.hero||s.folded.some(Boolean)||s.stacks.some(v=>v<=0))throw Error('Holdem Solver kan inte matcha deltagande och tur.');
 if(s.bets.some(v=>v!==0)||s.invested.some(v=>v!==0)||s.raises!==0)throw Error('Flopanslutningen stöder ännu bara en oöppnad insatslinje, inklusive tidigare checkar.');
 if(s.pending.some((p,i)=>p!==(i>=input.hero))||s.canRaise.some(v=>!v))throw Error('Tidigare checkar eller höjningsrätt kan inte matchas.');
 const ranges:Record<string,string>={};
 input.ranges.forEach((text,p)=>{const value=text.trim()||(p===input.hero?TOP_50_RANGE:'');if(value)ranges[String(p)]=value;});
 const hero=parseRange(ranges[String(input.hero)]||'',input.board.map(c=>cardCode(c[0],c[1])));
 if(!hero.some(h=>h.cards.includes(cardCode(input.heroCards[0][0],input.heroCards[0][1]))&&h.cards.includes(cardCode(input.heroCards[1][0],input.heroCards[1][1]))))throw Error('Din hand ingår inte i vald range.');
 for(const value of Object.values(ranges))if(!parseRange(value,input.board.map(c=>cardCode(c[0],c[1]))).length)throw Error('En vald range saknar lagliga händer.');
 const bb=s.minBet,stacks=s.stacks.map(v=>v/bb);
 return validateHoldemConfig({schema:'poker-holdem-flop-v1',hero:input.hero,heroCards:[...input.heroCards],handIndex:holdemHandIndex(input.heroCards),history:'entry_flop'+'.check'.repeat(input.hero),pot:s.deadPot,stacks:[...s.stacks],minBet:bb,
 request:{variant:2,players:n,button:n-1,street:'flop',entry_point:'flop',board:input.board.join(''),starting_pot_bb:s.deadPot/bb,stack_bb:Math.max(...stacks),effective_stack_bb:Math.max(...stacks),seat_stacks_bb:stacks,ranges,use_default_ranges:false,entry_private_keying:'lossless',iterations:40000,threads:2,buckets:256,buckets_by_street:{flop:256,turn:30,river:30},max_raises_per_street:1,postflop_bet_fractions:[s.deadPot%2===0?.5:1],postflop_raise_fractions:[2.5],postflop_raise_mode:'facing',allow_oop_bet:true,allow_donk_bets:true,export_nodes:true,artifact_save_mode:'ultra_light',strategy_snapshot_interval:1000,memory_budget_mb:1024,seed:23}});
}
export function validateHoldemConfig(raw:unknown):HoldemConfig{
 const c=raw as HoldemConfig,r=c?.request,n=r?.players;
 const chip=(v:number)=>Number.isSafeInteger(v)&&v>0&&v<=10000000;
 if(c?.schema!=='poker-holdem-flop-v1'||!Number.isInteger(n)||n<2||n>6||!Number.isInteger(c.hero)||c.hero<0||c.hero>=n||r.variant!==2||r.street!=='flop'||r.entry_point!=='flop'||r.button!==n-1||!/^([2-9TJQKA][cdhs]){3}$/.test(r.board)||new Set(r.board.match(/../g)).size!==3||!chip(c.pot)||!chip(c.minBet)||c.stacks?.length!==n||!c.stacks.every(chip)||!Array.isArray(c.heroCards)||c.heroCards.length!==2||new Set([...r.board.match(/../g)!,...c.heroCards]).size!==5||c.handIndex!==holdemHandIndex(c.heroCards)||c.history!=='entry_flop'+'.check'.repeat(c.hero))throw Error('Ogiltig Holdem-modell.');
 if(r.starting_pot_bb!==c.pot/c.minBet||r.seat_stacks_bb?.length!==n||r.seat_stacks_bb.some((v,i)=>v!==c.stacks[i]/c.minBet)||r.stack_bb!==Math.max(...r.seat_stacks_bb)||r.effective_stack_bb!==r.stack_bb||r.use_default_ranges!==false||r.entry_private_keying!=='lossless'||r.iterations!==40000||r.threads!==2||r.memory_budget_mb!==1024||r.max_raises_per_street!==1||r.postflop_bet_fractions?.length!==1||r.postflop_bet_fractions[0] !== (c.pot%2===0?.5:1)||JSON.stringify(r.postflop_raise_fractions)!=='[2.5]'||r.postflop_raise_mode!=='facing'||r.allow_oop_bet!==true||r.allow_donk_bets!==true||r.export_nodes!==true||r.artifact_save_mode!=='ultra_light'||r.strategy_snapshot_interval!==1000||r.buckets!==256||JSON.stringify(r.buckets_by_street)!=='{"flop":256,"turn":30,"river":30}'||r.seed!==23)throw Error('Holdem-förfrågan matchar inte den granskade modellen.');
 if(!r.ranges||Object.keys(r.ranges).some(k=>!/^\d$/.test(k)||Number(k)>=n))throw Error('Ogiltiga Holdem-ranger.');
 const board=r.board.match(/../g)!.map(c=>cardCode(c[0],c[1]));
 for(const [seat,text]of Object.entries(r.ranges)){
  if(typeof text!=='string'||text.length>80000)throw Error('Ogiltig Holdem-range.');
  const range=parseRange(text,board);if(!range.length)throw Error('Tom Holdem-range.');
  if(Number(seat)===c.hero&&!range.some(h=>canonicalHand(h.cards.map(code=>{for(const rank of '23456789TJQKA')for(const suit of 'shdc')if(cardCode(rank,suit)===code)return rank+suit;throw Error('Kortkod');}).join(''))===canonicalHand(c.heroCards.join(''))))throw Error('Din hand ingår inte i vald range.');
 }
 return c;
}
export function checkHoldemRow(config:HoldemConfig,raw:unknown,solveId:string):HoldemRow{
 const s=raw as {solve_id:string;iterations:number;watched_node?:{history:string;rows:HoldemRow[]}};
 const row=s?.watched_node?.rows?.find(r=>r.player===config.hero&&r.hand_index===config.handIndex&&r.history===config.history);
 if(s?.solve_id!==solveId||s.watched_node?.history!==config.history||!row||row.street!=='flop'||row.exact_entry_street_key!==true||row.node_locked||row.unvisited_default||!Number.isSafeInteger(row.visits)||row.visits<32||!Number.isFinite(s.iterations)||s.iterations<2000)throw Error('Inväntar färsk tränad strategi för exakt hand och beslut.');
 const actions=row.legal_actions;if(!Array.isArray(actions)||actions.length<2||new Set(actions).size!==actions.length||actions.some(a=>!['check','allin',...config.request.postflop_bet_fractions.map(f=>`bet_${f*100}p`)].includes(a))||Object.keys(row.action_freqs).length!==actions.length||actions.some(a=>!Number.isFinite(row.action_freqs[a])||row.action_freqs[a]<0||row.action_freqs[a]>1)||Math.abs(actions.reduce((sum,a)=>sum+row.action_freqs[a],0)-1)>1e-4)throw Error('Holdem-strategins handlingar eller frekvenser är ogiltiga.');
 return row;
}
export function holdemDecision(input:DecisionInput,config:HoldemConfig,row:HoldemRow,elapsedMs:number,iterations:number,solveId:string):DecisionResult{
 const stack=input.state.stacks[input.hero];
 const actions:DecisionAction[]=row.legal_actions.map(code=>{
  const cost=code==='check'?0:code==='allin'?stack:Math.min(stack,Math.max(config.minBet,config.pot*Number(code.slice(4,-1))/100));
  return {kind:code==='check'?'check':'bet',cost,to:cost,allIn:cost===stack,id:code==='check'?'check:0':`bet:${cost}`,frequency:row.action_freqs[code],ev:null};
 });
 if(input.state.street!=='flop'||input.hero!==config.hero||input.board.join('')!==config.request.board||holdemHandIndex(input.heroCards)!==config.handIndex||input.state.deadPot!==config.pot||JSON.stringify(input.state.stacks)!==JSON.stringify(config.stacks)||!legalRiverRoot(input,actions))throw Error('Holdem-resultatet matchar inte det aktuella bordet.');
 return {key:input.key,rangeRevision:input.rangeRevision,provider:'holdem-solver-0.93',quality:'solver-unverified',actions,recommended:actions.findIndex(a=>a.frequency===Math.max(...actions.map(a=>a.frequency))),iterations,rootVisits:row.visits,elapsedMs,cutoffCount:0,modelVerified:true,exploitabilityPct:null,qualityNote:'Felgränsen är inte verifierad. Tränade källfrekvenser i en begränsad modell; stabilitet är inget Nash-intyg.',
 sourceProof:{solver:'holdem-0.93',solveId,handIndex:config.handIndex,history:config.history,visits:row.visits,entryExact:true},
 assumptions:[...input.assumptions,'Din tomma range använder topp 50 %; motståndarnas tomma ranger är fulla. Ingen motståndare villkoras på dina kända kort.','Ingen rake ingår.'],limitations:['Oöppnad floplinje med eventuella tidigare checkar; tidigare bets, all-in och sidopotter stöds ännu inte.','50 % pott (100 % vid udda chipspott), 2,5×-höjningar och högst en höjning per gata.','Exakt handnyckel på flop; framtida gator använder källans kortabstraktion.','Beräknad träningsstrategi från Holdem Solver, inte verifierad GTO eller en verifierad 2 %-gräns.']};
}
