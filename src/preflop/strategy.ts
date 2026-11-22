import pushFold from "./push-fold.json";
import type {DecisionInput, DecisionResult} from '../decision/types';
import type {LiveSnapshot} from '../live/types';
import type {PreflopLibrary} from './types';
import type {ChartAction,PreflopReference} from './types';
import {legalRiverRoot} from '../decision/river-legality';
import {validatePreflopTurn} from './history';
import {PreflopCoverageError} from './errors';
const rank='23456789TJQKA';
function handClass(cards:string[]):string {
  const [a,b]=[...cards].sort((x,y)=>rank.indexOf(y[0])-rank.indexOf(x[0]));
  return a[0]===b[0]?a[0]+b[0]:a[0]+b[0]+(a[1]===b[1]?'s':'o');
}
export function preflopDecision(s:LiveSnapshot,input:DecisionInput,library:PreflopLibrary):DecisionResult {
  const start=performance.now(),f=input.preflop;
  if(s.variant==='sixplus'||s.variant==='unknown'||s.street!=='preflop'||input.board.length)throw new PreflopCoverageError('Preflopbiblioteket kräver vanlig NLHE före floppen.');
  if(!f||f.handId!==s.handId||f.readerId!==s.readerId||f.error)throw new PreflopCoverageError(f?.error||'Preflop: säker blind- och handhistorik saknas.');
  const bb=f.bigBlind,hero=s.players.find(p=>p.hero)!,seat=hero.seat,pos=f.positions[seat],count=f.participants.length;
  if(!bb||bb!==input.state.minBet||count<2||count>6||!pos)throw new PreflopCoverageError('Preflop: blinds, position eller bordsstorlek kan inte matchas.');
  const active=s.players.filter(p=>p.inHand&&!p.folded);
  const depths=active.map(p=>f.startingStacks[p.seat]/bb);
  const heroDepth=f.startingStacks[seat]/bb;
  const opponents=active.filter(p=>p.seat!==seat).map(p=>f.startingStacks[p.seat]/bb);
  const effective=Math.min(heroDepth,Math.max(...opponents));
  if(depths.some(d=>!Number.isFinite(d)||d<=0)||!Number.isFinite(effective))throw new PreflopCoverageError('Preflop: en aktiv spelares startstack saknas eller är ogiltig.');
  const h=handClass(input.heroCards),index=library.order.indexOf(h),notes:string[]=[];
  if(index<0)throw new PreflopCoverageError('Preflop: handklassen saknas i biblioteket.');
  let actions:ChartAction[],source:PreflopReference['source']='artgto',sourceHash=library.archiveSha256,modelDepth=100,modelPlayers=6,history='';
  let chartNodes=library.nodes,coverage:Record<string,boolean[]>|undefined;
  const entered=new Set<number>();let raises=0,reach=1;
  const segments:string[]=[];
  const actualState=new Map(f.participants.map(id=>[id,f.positions[id]==='SB'?bb/2:f.positions[id]==='BB'?bb:0]));
  let currentBet=bb;
  if (count === 6 && effective <= 20) {
    if (!pushFold.depths.includes(effective) || f.participants.some(id => f.startingStacks[id] !== effective * bb))
      throw new PreflopCoverageError("Sexmax push/fold kräver lika startstackar vid ett publicerat tabelldjup.");
    const contributions = f.steps.filter(step => step.kind !== "fold");
    const shove = contributions[0];
    if (contributions.length > 1 || (shove && (shove.kind !== "raise" || shove.to !== f.startingStacks[shove.seat])))
      throw new PreflopCoverageError("Sexmaxtabellen stöder öppningsshove eller svar på en ensam shove.");
    const sourcePosition = (name: string) => name === "MP" ? "HJ" : name === "BU" ? "BTN" : name;
    history = sourcePosition(pos) + (shove ? "|" + sourcePosition(f.positions[shove.seat]) : "");
    const tables: Record<string, Record<string, number[]>> = pushFold.max6;
    const row = tables[String(effective)]?.[history];
    if (!row) throw new PreflopCoverageError("Denna position eller linje saknas i sexmaxtabellen.");
    source = "holdemmath"; sourceHash = pushFold.sha256; modelDepth = effective;
    const weights = Array(library.order.length).fill(0);
    const handIndex = pushFold.order.indexOf(h);
    if (handIndex < 0) throw new PreflopCoverageError("Handen saknas i push/fold-tabellen.");
    weights[index] = row.includes(handIndex) ? 10000 : 0;
    actions = [{ token: shove ? "call" : "allin", bb: effective, weights }];
    notes.push("Sex utdelade, chip-EV utan rake eller ante. Källan modellerar högst en synare och publicerar binärt handurval.");
  } else if(count===2&&effective<=20){
    if(effective<4||effective>20)throw new PreflopCoverageError('Heads-up push/fold stöder 4–20 BB effektiv stack, utan ante.');
    modelDepth=[...library.hu.depths].sort((a,b)=>Math.abs(a-effective)-Math.abs(b-effective))[0];
    source='holdemmath';modelPlayers=2;
    const raised=f.steps.filter(a=>a.kind==='raise'),called=f.steps.some(a=>a.kind==='call');
    if(called||raised.length>1)throw new PreflopCoverageError('Heads-up-källan gäller bara oöppnad shove/fold och BB mot SB-shove.');
    const key=pos==='SB'&&raised.length===0?'SB':pos==='BB'&&raised.length===1&&f.positions[raised[0].seat]==='SB'&&raised[0].to===f.startingStacks[raised[0].seat]?'BB|SB':null;
    if(!key)throw new PreflopCoverageError('Heads-up-linjen matchar inte push/fold-modellen.');
    const hi=library.hu.order.indexOf(h),row=library.hu.data[String(modelDepth)]?.[key];
    if(hi<0||!row)throw new PreflopCoverageError('Heads-up-tabell saknas.');
    const w=Array(library.order.length).fill(0);w[index]=row.s.includes(hi)?10000:0;
    actions=[{token:key==='SB'?'allin':'call',bb:key==='SB'?heroDepth:input.state.currentBet/bb,weights:w}];history=key;
  }else{
    if(library.shortstack&&effective>=30&&effective<=50){
      source='rangeconverter';sourceHash=library.shortstack.archiveSha256;modelDepth=40;
      chartNodes=library.shortstack.nodes;coverage=library.shortstack.coverage;
    }
    // Choose a source depth before matching the observed betting line. A short
    // seat does not veto a deeper contest against another remaining opponent.
    if(source==='artgto'&&(effective<50||effective>150))throw new PreflopCoverageError(`Preflop: din effektiva stack är ${effective.toFixed(1)} BB. ${library.shortstack?'40 BB-referensen stöder 30–50 BB.':'40 BB-tabellerna är inte installerade.'} ART/GTO 100 BB stöder 50–150 BB. Annat djup saknar matchande källa.`);
    for(const step of f.steps){
      const actor:string=f.positions[step.seat];if(!actor)throw new PreflopCoverageError('Preflop: tidigare aktörs position saknas.');
      if(step.kind==='fold'){if(entered.has(step.seat))segments.push(actor+'_fold');continue;}
      const nodeKey=actor+'|'+segments.join('_'),node=chartNodes[nodeKey];
      if(!node)throw new PreflopCoverageError('Preflop: biblioteket saknar den tidigare linjen '+nodeKey+'.');
      if(step.seat===seat&&coverage&&!coverage[nodeKey]?.[index])throw new PreflopCoverageError('Din hand saknas i källans ankommande range på denna linje.');
      let matches:ChartAction[];
      if(step.kind==='call'){
        if(step.to!==currentBet)throw new PreflopCoverageError('Preflop: kort all-in-call saknar matchande tabell.');
        matches=node.filter(a=>a.token==='call');
        if(!matches.length && raises===0 && step.to===bb)
          throw new PreflopCoverageError(`Preflop: ${actor} synade till 1 BB före första höjningen (limp). Källtabellen saknar den linjen.`);
      }else{
        const allin=step.to===f.startingStacks[step.seat];
        matches=node.filter(a=>a.token!=='call'&&(a.bb===modelDepth||a.token==='allin'?allin:!allin&&Math.abs(a.bb-step.to/bb)<=Math.max(.5,1/bb)+1e-8));
        if(matches.length===1&&Math.abs(matches[0].bb-step.to/bb)>1e-8)notes.push(`${actor}: observerat ${step.to/bb} BB, tabell ${matches[0].bb} BB.`);
      }
      if(matches.length!==1)throw new PreflopCoverageError('Preflop: tidigare storlek '+(step.to/bb)+' BB kan inte matchas entydigt mot källans bettingträd.');
      const a=matches[0];if(step.seat===seat)reach*=a.weights[index]/10000;
      segments.push(actor+'_'+a.token);entered.add(step.seat);actualState.set(step.seat,step.to);
      if(step.kind==='raise'){currentBet=step.to;raises++;}
    }
    for(const p of active)if(Math.round(p.bet!*100)!==actualState.get(p.seat))throw new PreflopCoverageError('Preflop: nuvarande bidrag matchar inte den observerade linjen.');
    if(reach<=0)throw new PreflopCoverageError('Din hand ligger utanför källans tidigare range på denna linje.');
    history=segments.join('_');const nodeKey=pos+'|'+history;actions=chartNodes[nodeKey];
    if(!actions)throw new PreflopCoverageError(`Preflopkällan saknar ${pos} efter ${history||'oöppnad pott'}; inga ersättningsråd fabriceras.`);
    if(coverage&&!coverage[nodeKey]?.[index])throw new PreflopCoverageError('Din hand saknas i källans ankommande range på denna linje.');
  }
  const weights=actions.map(a=>a.weights[index]),sum=weights.reduce((a,b)=>a+b,0);
  if(weights.some(w=>!Number.isInteger(w)||w<0||w>10000)||sum>10002)throw Error('Preflop: källfrekvenserna är ogiltiga.');
  const scale=Math.max(10000,sum);
  const own=input.state.bets[input.hero],stack=input.state.stacks[input.hero],bet=input.state.currentBet;
  const resultActions:DecisionResult['actions']=[];
  const add=(kind:'fold'|'check'|'call'|'raise',to:number,frequency:number)=>{
    const cost=kind==='fold'?0:to-own;
    resultActions.push({kind,to:kind==='fold'?own:to,cost,frequency,allIn:cost===stack,id:`${kind}:${to}`,ev:null});
  };
  add(bet===own?'check':'fold',own,Math.max(0,10000-sum)/scale);
  actions.forEach((a,i)=>{
    const to=a.token==='call'?Math.min(bet,own+stack):a.bb===modelDepth||a.token==='allin'?own+stack:Math.round(a.bb*bb);
    add(a.token==='call'?'call':'raise',to,weights[i]/scale);
  });
  // Do not change a source mix by silently dropping or resizing an illegal action.
  const visible=resultActions.filter(a=>a.frequency>0).sort((a,b)=>['fold','check','call','raise'].indexOf(a.kind)-['fold','check','call','raise'].indexOf(b.kind));
  if(!visible.length||!legalRiverRoot(input,visible)||visible.some(a=>input.rootKinds&&!input.rootKinds.includes(a.kind)))throw new PreflopCoverageError('Preflop: källans handling eller storlek är inte laglig i aktuell avläsning.');
  validatePreflopTurn(s,f);
  const reference:PreflopReference={source,archiveSha256:sourceHash,modelDepthBB:modelDepth,actualDepthBB:effective,activeDepthsBB:depths,tablePlayers:count,modelPlayers,history,sizingNotes:notes};
  const sourceName=source==='artgto'?'ART/GTO 100 BB 6-max':source==='rangeconverter'?'RangeConverter 40 BB 6-max, förenklade PDF-charts':modelPlayers===6?'HoldemMath sexmax push/fold utan ante':'HoldemMath heads-up push/fold utan ante';
  return {key:input.key,rangeRevision:input.rangeRevision,quality:'chart-reference',provider:source+'-preflop',reference,modelVerified:true,
    actions:visible,recommended:visible.findIndex(a=>a.frequency===Math.max(...visible.map(x=>x.frequency))),iterations:0,rootVisits:0,cutoffCount:0,elapsedMs:performance.now()-start,exploitabilityPct:null,
    assumptions:[`Källa: ${sourceName}.`,`Verklig effektiv stack ${effective.toFixed(1)} BB; tabell ${modelDepth} BB.`,`Aktiva spelares startstackar: ${depths.map(v=>v.toFixed(1)).join(', ')} BB.`,...(count!==modelPlayers?[`${count} utdelade spelare mappas till ${modelPlayers}-maxmodellens sena positioner; saknade tidiga stolar antas foldade.`]:[]),...notes],
    limitations:['Tabellreferens för träning; ingen oberoende 2 %- eller 2,1 %-felgräns är verifierad.',source==='artgto'?'Endast 100 BB-källa. Avvikande stackar och närliggande storlekar ger modellskillnad. Rake är inte dokumenterad i datapaketet.':source==='rangeconverter'?'40 BB cash, PokerStars 500z. Diagrammens förenklade färgmixar används; originalets summeringar kan avvika. Inga limps, squeezes eller godtyckliga storlekar antas täckta.':modelPlayers===6?'Öppningsshove eller svar mot en shove. En möjlig synare i modellen. Mindre öppningar och flervägssyner ligger utanför tabellen.':'Endast shove/fold och BB mot SB-shove; inte fullständig NLHE-strategi.']};
}
