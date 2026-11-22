import {readFile,writeFile,appendFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const root='C:/Users/ryd/Documents/Codex/2026-11-04/i-x20/work/';
const pair=JSON.parse(await readFile('C:/Users/ryd/AppData/Roaming/Poker GTO Advisor/live-connection.json','utf8'));
const readerId='synthetic-transition-'+randomUUID();
const startedAt=Date.now();let sequence=0,lastPhase='',lastAckPhase='';
await writeFile(root+'monker-ui-transitions-events.jsonl','');
while(Date.now()-startedAt<240000){
 const c=JSON.parse(await readFile(root+'monker-ui-transitions-control.json','utf8'));
 if(c.stop)break;
 const street=c.street||'turn',n=c.players||6;
 const s={version:1,source:'svenskaspel-dom',variant:'holdem',readerId,sequence:++sequence,handId:String(c.handId),capturedAt:Date.now(),currency:'EUR',maxSeats:6,
  players:[3,1.6,1,2,1.2,0.8].slice(0,n).map((stack,i)=>({seat:i+1,hero:i===0,position:i===n-1?'BTN':i===0?'SB':'BB',stack,bet:0,folded:false,inHand:true})),
  heroCards:['Kh','8d'],board:['6h','8s','Jd','5c',...(street==='river'?['2s']:[])],pot:0.8,street,dealerSeat:n,heroTurn:c.heroTurn!==false,
  availableActions:['Fold','Check','Satsa'],valid:true,issues:[],observedActions:[]};
 if(c.bet){s.players[n-1].stack-=c.bet;s.players[n-1].bet=c.bet;s.pot+=c.bet;s.availableActions=['Fold','Syna','Höj'];}
 if(c.phase!==lastPhase){await appendFile(root+'monker-ui-transitions-events.jsonl',JSON.stringify({synthetic:true,phase:c.phase,at:Date.now(),fixture:s})+'\n');lastPhase=c.phase;}
 const r=await fetch(pair.endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-poker-token':pair.token},body:JSON.stringify(s),signal:AbortSignal.timeout(5000)});
 if(!r.ok)throw Error('Synthetic input refused: '+r.status);
 const ack=await r.json();
 if(sequence===1||c.phase!==lastAckPhase){await appendFile(root+'monker-ui-transitions-events.jsonl',JSON.stringify({phase:c.phase,ackAt:Date.now(),receivedAt:ack.receivedAt,sequence})+'\n');lastAckPhase=c.phase;}
 await new Promise(resolve=>setTimeout(resolve,450));
}
console.log(JSON.stringify({synthetic:true,stopped:true,updates:sequence,startedAt,finishedAt:Date.now(),tokenIncluded:false}));
