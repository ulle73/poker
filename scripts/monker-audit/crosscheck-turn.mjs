// Independent evaluation of a fixed deviation certificate. No training or search.
// The supplied certificate may use only the node, public board and own holding.
import fs from 'node:fs';
import {evaluate7} from '../river-oracle.mjs';
const [input,certificatePath]=process.argv.slice(2);
if(!input||!certificatePath)throw Error('Expected decoded 3p turn fixture and fixed BR certificate');
const m=JSON.parse(fs.readFileSync(input));
const certificate=JSON.parse(fs.readFileSync(certificatePath));
if(m.board.length!==4||m.players!==3||m.ranges.some(r=>r.length!==2))throw Error('Expected the 3p/two-combo turn fixture');
const nodes=new Map(m.nodes.map(n=>[n.id,n]));
const deck='23456789TJQKA'.split('').flatMap(r=>['s','h','d','c'].map(s=>r+s));
const worlds=[];
for(const a of m.ranges[0])for(const b of m.ranges[1])for(const c of m.ranges[2])worlds.push([a,b,c]);
function policy(node,hand,board) {
  const raw=m.averages[node.id],k=node.children.length,bucket=m.bucketMaps[board.join('')][node.actor][hand];
  const values=raw.slice(bucket*k,(bucket+1)*k),sum=values.reduce((s,v)=>s+v,0);
  if(values.length!==k||values.some(v=>!Number.isFinite(v)||v<0))throw Error('Invalid fixed strategy');
  return values.map(v=>sum?v/sum:1/k);
}
const ranks=new Map();
function rank(board,hand){const key=board.join('')+hand;if(!ranks.has(key))ranks.set(key,evaluate7([...board,...hand.match(/../g)]));return ranks.get(key);}
function value(deviate) {
  let total=0,mass=0;
  for(const world of worlds){
    const used=new Set([...m.board,...world.flatMap(h=>h.cards.match(/../g))]);
    if(used.size!==10)throw Error('Joint deal overlap');
    const runouts=deck.filter(c=>!used.has(c)),weight=world.reduce((s,h)=>s*h.weight,1);mass+=weight;
    for(const card of runouts){
      const fullBoard=[...m.board,card];
      function walk(id) {
        const n=nodes.get(id),board=n.street===2?m.board:fullBoard;
        if(!n.children.length){
          if(n.active.length>1&&new Set(n.active.map(p=>n.contributions[p])).size!==1)throw Error('Side pots are outside this crosscheck');
          const top=Math.max(...n.active.map(p=>rank(fullBoard,world[p].cards)));
          const winners=n.active.filter(p=>rank(fullBoard,world[p].cards)===top);
          return (winners.includes(1)?(m.deadPot+n.contributions.reduce((s,v)=>s+v,0))/winners.length:0)-n.contributions[1];
        }
        if(deviate&&n.actor===1){
          const selected=certificate.bestResponseActions['1:'+n.id+':'+board.join('')+':'+world[1].cards];
          if(!Number.isInteger(selected)||selected<0||selected>=n.children.length)throw Error('Incomplete non-cheating deviation certificate');
          return walk(n.children[selected]);
        }
        const frequencies=policy(n,world[n.actor].cards,board);
        return n.children.reduce((s,child,j)=>s+(frequencies[j]===0?0:frequencies[j]*walk(child)),0);
      }
      total+=weight*walk(1)/runouts.length;
    }
  }
  return total/mass;
}
const baseline=value(false),deviation=value(true),gain=deviation-baseline;
console.log(JSON.stringify({method:'independent-fixed-noncheating-deviation-enumeration',baseline,deviation,gain,gainPct:100*gain/m.deadPot,disprovesTwoPercent:gain>0.02*m.deadPot,hiddenCardsUsedForDecisions:false},null,2));
