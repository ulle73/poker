import fs from 'node:fs';
import {auditMultiway} from './rank-chance-audit.mjs';
const m=JSON.parse(fs.readFileSync(process.argv[2]));
if(m.board.length!==4||new Set(m.board.map(c=>c[1])).size!==4)throw Error('Requires rainbow turn');
const owner=new Map(),compressed=structuredClone(m);
for(let p=0;p<m.players;p++){
 const groups=new Map();
 for(const h of m.ranges[p]){
  if(h.cards[0]!==h.cards[2])throw Error('Pocket-pair-only compression');
  const r=h.cards[0];if(owner.has(r)&&owner.get(r)!==p)throw Error('Overlapping ranks across seats');owner.set(r,p);
  if(!groups.has(r))groups.set(r,[]);groups.get(r).push(h);
 }
 const available='shdc'.split('');
 for(const [r,hands] of groups){
  const suits=available.filter(s=>!m.board.includes(r+s)),expected=suits.length*(suits.length-1)/2;
  if(hands.length!==expected||new Set(hands.map(h=>h.weight)).size!==1)throw Error('Incomplete/unequal pair class');
  const seen=new Map();
  for(const [board,seats] of Object.entries(m.bucketMaps)){
   const publicGroup=board.length===8?'root':board.slice(-2,-1);
   for(const h of hands){const bucket=seats[p][h.cards];if(bucket===undefined)continue;
    if(seen.has(publicGroup)&&seen.get(publicGroup)!==bucket)throw Error('Policy bucket is not suit-invariant');seen.set(publicGroup,bucket);
   }
  }
 }
 const mass=Array.from(groups.values(),hs=>hs.reduce((s,h)=>s+h.weight,0)),max=Math.max(...mass);
 compressed.ranges[p]=Array.from(groups.values(),(hs,j)=>({...hs[0],weight:mass[j]/max}));
}
compressed.pairRankChance=true;const result=auditMultiway(compressed);fs.writeFileSync(process.argv[3],JSON.stringify(compressed));console.log(JSON.stringify({sourceRangeCounts:m.ranges.map(r=>r.length),compressedRangeCounts:compressed.ranges.map(r=>r.length),...result},null,2));
