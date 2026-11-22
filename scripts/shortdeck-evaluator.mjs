export function evaluate5(cards){
 const ranks=cards.map(c=>'23456789TJQKA'.indexOf(c[0])+2).sort((a,b)=>b-a);
 const groups=[...new Set(ranks)].map(rank=>({rank,count:ranks.filter(r=>r===rank).length})).sort((a,b)=>b.count-a.count||b.rank-a.rank);
 const flush=cards.every(c=>c[1]===cards[0][1]);
 const straight=groups.length===5 ? ranks[0]-ranks[4]===4 ? ranks[0] : ranks.join(',')==='14,9,8,7,6' ? 9 : 0 : 0;
 let cat, kick;
 if(flush&&straight){cat=8;kick=[straight];}
 else if(groups[0].count===4){cat=7;kick=groups.map(g=>g.rank);}
 else if(flush){cat=6;kick=ranks;}
 else if(groups[0].count===3&&groups[1].count===2){cat=5;kick=groups.map(g=>g.rank);}
 else if(groups[0].count===3){cat=4;kick=groups.map(g=>g.rank);}
 else if(straight){cat=3;kick=[straight];}
 else if(groups[0].count===2&&groups[1].count===2){cat=2;kick=groups.map(g=>g.rank);}
 else if(groups[0].count===2){cat=1;kick=groups.map(g=>g.rank);}
 else{cat=0;kick=ranks;}
 return Array.from({length:5},(_,i)=>kick[i]??0).reduce((v,k)=>v*15+k,cat);
}
export function evaluate7(cards){
 if(cards.length!==7||new Set(cards).size!==7||cards.some(c=>!/^[6-9TJQKA][cdhs]$/.test(c))) throw new Error('Invalid 6+ showdown cards');
 let best=-1;
 for(let i=0;i<7;i++)for(let j=i+1;j<7;j++) best=Math.max(best,evaluate5(cards.filter((_,k)=>k!==i&&k!==j)));
 return best;
}
