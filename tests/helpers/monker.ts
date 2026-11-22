import type {LiveSnapshot} from '../../src/live/types';
export const monkerSnapshot=(count=3,hero=0):LiveSnapshot=>({
  version:1,source:'svenskaspel-dom',readerId:'monker-integration',sequence:1,
  handId:'training-1',capturedAt:Date.now(),variant:'holdem',currency:'EUR',maxSeats:6,
  players:Array.from({length:count},(_,i)=>({seat:i+1,hero:i===hero,position:i===count-1?'BTN':'BB',stack:1.6,bet:0,folded:false,inHand:true})),
  heroCards:['Kh','8d'],board:['6h','8s','Jd','4c'],pot:0.8,street:'turn',dealerSeat:count,heroTurn:true,
  availableActions:['Fold','Check','Satsa'],valid:true,issues:[],observedActions:[],
});
