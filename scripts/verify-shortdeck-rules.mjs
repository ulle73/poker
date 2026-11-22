import {evaluate5} from './shortdeck-evaluator.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const file=process.argv[2];
if(!file) throw new Error('Usage: node scripts/verify-shortdeck-rules.mjs <card5_dic_sorted_shortdeck.txt>');
const raw=readFileSync(file,'utf8');
const rankOrder='6789TJQKA', suits='cdhs';
const key=cards=>[...cards].sort((a,b)=>rankOrder.indexOf(a[0])-rankOrder.indexOf(b[0])||suits.indexOf(a[1])-suits.indexOf(b[1])).join('-');
// Independent five-card evaluator for Svenska Spel 6+: flush > full house,
// trips > straight, A6789 is the lowest straight. Larger value is stronger.
const table=new Map(), values=new Map();
for(const line of raw.trim().split(/\r?\n/)){
 const [text,rawRank]=line.split(','), cards=text.split('-'), rank=Number(rawRank);
 if(cards.length!==5||new Set(cards).size!==5||cards.some(c=>!/^[6-9TJQKA][cdhs]$/.test(c))||!Number.isInteger(rank)||rank<0) throw new Error('Invalid table entry');
 const canonical=key(cards), value=evaluate5(cards);
 if(table.has(canonical)) throw new Error('Duplicate combination');
 table.set(canonical,rank);
 if(values.has(rank)&&values.get(rank)!==value) throw new Error('Different independent strengths share one native rank');
 values.set(rank,value);
}
if(table.size!==376992) throw new Error('Missing short-deck five-card combinations');
const ordered=[...values].sort((a,b)=>a[0]-b[0]);
for(let i=1;i<ordered.length;i++) if(ordered[i][1]>=ordered[i-1][1]) throw new Error('Native ranks disagree with Svenska Spel ordering');
const hands={flush:'6c 8c Tc Qc Ac',fullHouse:'6c 6d 6h 7c 7d',trips:'6c 6d 6h 7c 8c',straight:'6c 7d 8h 9s Tc',aceLowStraight:'6c 7d 8h 9s Ac',highCard:'6c 7d 8h Ts Qc'};
const ranks=Object.fromEntries(Object.entries(hands).map(([name,cards])=>[name,table.get(key(cards.split(' ')))]));
console.log(JSON.stringify({sourceSha256:createHash('sha256').update(raw).digest('hex'),entries:table.size,distinctRanks:values.size,ranks,allFiveCardHandsChecked:true,compatible:true},null,2));
