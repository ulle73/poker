import {readFile,writeFile,stat,appendFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const root='C:/Users/ryd/Documents/Codex/2026-11-04/i-x20/work/';
const mode=process.argv[2]||'bb-vs-bu',startedAt=Date.now();
const pair=JSON.parse(await readFile('C:/Users/ryd/AppData/Roaming/Poker GTO Advisor/live-connection.json','utf8'));
const readerId='synthetic-preflop-'+randomUUID();let sequence=0,lastPhase=-1;const fixtures=[];
await writeFile(root+'preflop-ui-'+mode+'.events.jsonl','');
while(Date.now()-startedAt<50000){
 if((await stat(root+'preflop-ui-stop.txt').catch(()=>null))?.mtimeMs>startedAt)break;
 const age=Date.now()-startedAt,hu=mode==='hu',hero=mode==='four-bet'?3:2,n=hu?2:6;
 const phase=age<1800?0:mode==='four-bet'&&age<3600?1:2;
 const labels=hu?['SB','BB']:['SB','BB','UTG','HJ','CO','BTN'];
 const s={version:1,source:'svenskaspel-dom',variant:'holdem',readerId,sequence:++sequence,
  handId:mode==='hu'?'990000000000303':mode==='four-bet'?'990000000000302':'990000000000301',capturedAt:Date.now(),currency:'EUR',maxSeats:6,
  players:labels.map((position,i)=>({seat:i+1,hero:i+1===hero,position,stack:(hu?.2:2)-(i===0?.01:i===1?.02:0),bet:i===0?.01:i===1?.02:0,
   folded:!hu&&[4,5,...(mode==='four-bet'?[]:[3])].includes(i+1),inHand:hu||![4,5,...(mode==='four-bet'?[]:[3])].includes(i+1)})),
  heroCards:['As','Qd'],board:[],pot:.03,street:'preflop',dealerSeat:hu?1:6,heroTurn:phase===2,availableActions:['Fold','Syna','Höj'],valid:true,issues:[],observedActions:[]};
 const bet=(seat,to)=>{const p=s.players[seat-1];const add=to-p.bet;p.stack-=add;p.bet=to;s.pot+=add;};
 if(hu&&phase===2){s.heroCards=['As','Ah'];bet(1,.2);}
 if(mode==='four-bet'&&phase>=1){bet(3,.04);if(phase===2){bet(6,.14);for(const p of s.players.slice(0,2)){p.folded=true;p.inHand=false;}}}
 if(!hu&&mode!=='four-bet'&&phase===2){bet(6,.04);s.players[0].folded=true;s.players[0].inHand=false;}
 if(phase!==lastPhase){fixtures.push(s);await appendFile(root+'preflop-ui-'+mode+'.events.jsonl',JSON.stringify({synthetic:true,phase,at:Date.now(),fixture:s})+'\n');lastPhase=phase;}
 const r=await fetch(pair.endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-poker-token':pair.token},body:JSON.stringify(s),signal:AbortSignal.timeout(5000)});
 if(!r.ok)throw Error('Synthetic preflop refused: '+r.status);
 await r.json();await new Promise(resolve=>setTimeout(resolve,450));
}
await writeFile(root+'preflop-ui-'+mode+'.input.json',JSON.stringify({synthetic:true,mode,startedAt,finishedAt:Date.now(),updates:sequence,fixtures,tokenIncluded:false},null,2));
console.log(JSON.stringify({synthetic:true,mode,stopped:true,updates:sequence}));
