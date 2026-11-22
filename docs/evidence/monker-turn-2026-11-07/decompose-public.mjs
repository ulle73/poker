import fs from 'node:fs';
import {auditMultiway} from './diagnostic-audit.mjs';
const paths=process.argv.slice(2),results=[];
for(const path of paths){
 const m=JSON.parse(fs.readFileSync(path));
 const original=auditMultiway(m,{collectBestResponses:true});
 const byId=new Map(m.nodes.map(n=>[n.id,n]));
 const rows=[];
 for(let hero=0;hero<m.players;hero++)for(const street of [2,3]){
  const changed=structuredClone(m);changed.diagnosticOverrides={};let count=0;
  for(const [key,action] of Object.entries(original.bestResponseActions)){
   const [p,id,board,hand]=key.split(':');if(+p!==hero||byId.get(+id).street!==street)continue;
   const node=byId.get(+id),bucket=m.bucketMaps[board][hero][hand],index=bucket*node.actions.length,info=id+':'+bucket;
   count++;changed.diagnosticOverrides[id]??={};changed.diagnosticOverrides[id][board]??={};changed.diagnosticOverrides[id][board][hand]=node.actions.map((_,a)=>a===action?1:0);
  }
  const values=auditMultiway(changed).values;
  rows.push({hero,street,changedInfosets:count,gainPct:100*(values[hero]-original.values[hero])/m.deadPot});
 }
 results.push({file:path,baseNashConvPct:original.nashConvPct,originalGainsPct:original.gains.map(x=>100*x/m.deadPot),rows});
}
console.log(JSON.stringify(results,null,2));
