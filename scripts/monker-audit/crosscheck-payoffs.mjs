import {readFile,writeFile} from 'node:fs/promises';
import {evaluate7} from '../river-oracle.mjs';
const [modelFile,casesFile,reportFile]=process.argv.slice(2);
const model=JSON.parse(await readFile(modelFile,'utf8'));
const cases=JSON.parse(await readFile(casesFile,'utf8'));
const leaves=model.nodes.filter(n=>!n.children.length);
let compared=0,maximumDifference=0;
for(const sample of cases){
  const ranks=sample.hands.map(hand=>evaluate7([...sample.board,...hand.match(/../g)]));
  for(let index=0;index<leaves.length;index++){
    const node=leaves[index],amounts=node.contributions,values=amounts.map(v=>-v);
    function pay(amount,eligible){
      const strongest=Math.max(...eligible.map(p=>ranks[p]));
      const winners=eligible.filter(p=>ranks[p]===strongest);
      for(const p of winners)values[p]+=amount/winners.length;
    }
    if(node.active.length===1)values[node.active[0]]+=model.deadPot+amounts.reduce((s,v)=>s+v,0);
    else {
      pay(model.deadPot,node.active);let previous=0;
      for(const level of [...new Set(amounts)].filter(v=>v>0).sort((a,b)=>a-b)){
        pay((level-previous)*amounts.filter(v=>v>=level).length,node.active.filter(p=>amounts[p]>=level));previous=level;
      }
    }
    for(let p=0;p<model.players;p++){
      const vendor=sample.payoffsByHero[p]?.[index];
      if(!Number.isFinite(vendor))throw Error('Missing numeric kernel payoff');
      maximumDifference=Math.max(maximumDifference,Math.abs(vendor-values[p]));compared++;
    }
  }
}
const report={cases:cases.length,compared,maximumDifference,accepted:compared>0&&maximumDifference<1e-8};
if(reportFile)await writeFile(reportFile,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
if(!report.accepted)process.exitCode=1;
