import {readFileSync} from 'node:fs';
import {independentRiverReport} from './river-oracle.mjs';
import {evaluate7} from './shortdeck-evaluator.mjs';
// Offline reference audit only; does not connect to live advice.
if(!process.argv[2]||!process.argv[3]) throw new Error('Usage: node scripts/verify-shortdeck-solver.mjs <output.json> <input.txt>');
const root=JSON.parse(readFileSync(process.argv[2],'utf8'));
const input=readFileSync(process.argv[3],'utf8');
if(/set_range_(?:ip|oop) .*[+:]/.test(input)) throw new Error('Reference audit currently supports explicit unweighted ranges only');
const board=input.match(/^set_board (.+)$/m)?.[1].trim().split(','), pot=Number(input.match(/^set_pot (.+)$/m)?.[1]), stack=Number(input.match(/^set_effective_stack (.+)$/m)?.[1]);
if(board?.length!==5||!Number.isFinite(pot)||pot<=0||!Number.isFinite(stack)||stack<=0) throw new Error('River board, pot and stack required');
const nodes=[], ranges=[];
function node(raw,bets=[0,0],checked=false){
 const id=nodes.length, player=1-raw.player;
 if(!Array.isArray(raw.actions)||raw.node_type!=='action_node') throw new Error('Invalid node');
 const hands=Object.entries(raw.strategy.strategy).map(([cards,frequencies])=>({cards,weight:1,frequencies}));
 if(!ranges[player])ranges[player]=hands.map(({cards,weight})=>({cards,weight}));
 const n={id,kind:'decision',player,board,actions:[],hands,pot:pot+bets[0]+bets[1],stacks:bets.map(v=>stack-v)};
 nodes.push(n);
 for(const label of raw.actions){
  const [kind,amount]=label.split(' '), to=Number(amount);
  let next=[...bets],terminal=false,folder;
  if(kind==='BET'||kind==='RAISE')next[player]+=to;
  else if(kind==='CALL'){next[player]=next[1-player];terminal=true;}
  else if(kind==='FOLD'){terminal=true;folder=player;}
  else if(kind==='CHECK')terminal=checked;
  else throw new Error('Unknown action');
  const child=raw.childrens?.[label];
  if(Boolean(child)===terminal)throw new Error('Missing nonterminal child or extra terminal child');
  let childId;
  if(terminal){childId=nodes.length;nodes.push({id:childId,kind:'terminal',board,actions:[],hands:[],stacks:next.map(v=>stack-v),terminal:{kind:folder===undefined?'showdown':'fold',folder,pot:pot+2*Math.min(...next)}});}
  else childId=node(child,next,kind==='CHECK');
  n.actions.push({label:kind.toLowerCase(),child:childId,amount_to:Number.isFinite(to)?to:null});
 }
 return id;
}
node(root);
const started=performance.now();
const report=independentRiverReport({nodes,rootRanges:ranges},evaluate7);
console.log(JSON.stringify({exportedCombinationUniverseOnly:true,rootRangeAlignmentIndependentlyValidated:false,board,pot,stack,nodes:nodes.length,rangeCombinations:ranges.map(a=>a.length),...report,nashConvPct:report.exploitabilityChips/pot*100,averageExploitabilityPct:report.exploitabilityChips/(2*pot)*100,auditMs:performance.now()-started},null,2));

