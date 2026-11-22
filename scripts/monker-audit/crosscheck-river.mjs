import fs from 'node:fs';
import {evaluate7} from '../river-oracle.mjs';
import {auditMultiway} from './policy-audit.mjs';
const m=JSON.parse(fs.readFileSync(process.argv[2]));
if(m.players!==3||m.board.length!==5||m.ranges.some(r=>r.length!==2))throw Error('This independent normal-form crosscheck is only for the 3p/two-combo river fixture');
const worlds=[];
for(const a of m.ranges[0])for(const b of m.ranges[1])for(const c of m.ranges[2])worlds.push([a,b,c]);
const cachedRanks=new Map();
for(const r of m.ranges)for(const h of r)cachedRanks.set(h.cards,evaluate7([...m.board,...h.cards.match(/../g)]));
const nodes=new Map(m.nodes.map(n=>[n.id,n]));
function probability(n,hand,action){const bucket=m.bucketMaps[m.board.join('')][n.actor][hand],raw=m.averages[n.id],count=n.actions.length;let sum=0;for(let j=0;j<count;j++)sum+=raw[bucket*count+j];return sum?raw[bucket*count+action]/sum:1/count;}
function evaluate(hero,choice) {
  let total=0,mass=0;
  for(const world of worlds){
    const weight=world.reduce((w,h)=>w*h.weight,1);mass+=weight;
    function walk(id) {
      const n=nodes.get(id);
      if(!n.children.length){
        if(n.active.length>1&&new Set(n.active.map(p=>n.contributions[p])).size!==1)throw Error('Side pots not supported in this crosscheck');
        const top=Math.max(...n.active.map(p=>cachedRanks.get(world[p].cards)));
        const winners=n.active.filter(p=>cachedRanks.get(world[p].cards)===top);
        return (winners.includes(hero)?(m.deadPot+n.contributions.reduce((s,v)=>s+v,0))/winners.length:0)-n.contributions[hero];
      }
      if(choice&&n.actor===hero)return walk(n.children[choice[n.id+':'+world[hero].cards]]);
      return n.children.reduce((value,child,j)=>value+probability(n,world[n.actor].cards,j)*walk(child),0);
    }
    total+=weight*walk(1);
  }
  return total/mass;
}
const started=performance.now(),values=[],bestResponses=[],pureStrategies=[];
for(let hero=0;hero<3;hero++){
  const infosets=m.nodes.filter(n=>n.children.length&&n.actor===hero).flatMap(n=>m.ranges[hero].map(h=>n.id+':'+h.cards));
  if(infosets.length>15)throw Error('Crosscheck enumeration budget');
  let best=-Infinity;
  for(let mask=0;mask<2**infosets.length;mask++){
    const choice=Object.fromEntries(infosets.map((key,index)=>[key,(mask>>index)&1]));
    best=Math.max(best,evaluate(hero,choice));
  }
  values.push(evaluate(hero));bestResponses.push(best);pureStrategies.push(2**infosets.length);
}
const dynamic=auditMultiway(m);
for(let p=0;p<3;p++)if(Math.abs(values[p]-dynamic.values[p])>1e-8||Math.abs(bestResponses[p]-dynamic.bestResponses[p])>1e-8)throw Error('Independent pure-strategy enumeration disagrees');
console.log(JSON.stringify({method:'independent-normal-form-enumeration',pureStrategies,values,bestResponses,nashConvPct:dynamic.nashConvPct,matched:true,elapsedMs:performance.now()-started},null,2));
