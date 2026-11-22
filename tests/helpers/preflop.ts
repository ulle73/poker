import type {LiveSnapshot} from '../../src/live/types';
export function preflopSnapshot(hero=4,count=6):LiveSnapshot {
  // Clockwise seats: SB, BB, UTG, HJ, CO, BTN for six players.
  const labels=count===6?['SB','BB','UTG','HJ','CO','BTN']:count===2?['SB','BB']:['SB','BB',...Array.from({length:count-3},(_,i)=>i===0&&count===5?'UTG':'CO'),'BTN'];
  return {version:1,source:'svenskaspel-dom',variant:'holdem',readerId:'preflop-test',sequence:1,handId:'100',capturedAt:Date.now(),currency:'EUR',maxSeats:6,
    players:labels.map((position,i)=>({seat:i+1,hero:i===hero,position,stack:2-(i===0?.01:i===1?.02:0),bet:i===0?.01:i===1?.02:0,folded:false,inHand:true})),
    heroCards:['As','Qd'],board:[],pot:.03,street:'preflop',dealerSeat:count===2?1:count,heroTurn:true,availableActions:['Fold','Syna','Höj'],valid:true,issues:[],observedActions:[]};
}
export function changed(s:LiveSnapshot,seat:number,to:number):LiveSnapshot {
  const n=structuredClone(s);const p=n.players.find(p=>p.seat===seat)!;const old=p.bet!;
  p.stack!-=to-old;p.bet=to;n.pot!+=to-old;n.sequence++;return n;
}
