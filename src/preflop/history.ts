import type {LiveSnapshot} from '../live/types';
import type {PreflopFacts} from './types';
const cents=(n:number|null)=>Math.round((n??0)*100);
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
/** Replay action order, inserting only folds of seats that never entered.
 * A visible hero button alone must not turn an unacted earlier seat into a fold.
 */
export function validatePreflopTurn(s:LiveSnapshot,f:PreflopFacts):void {
  const order=f.participants.slice().sort((a,b)=>(f.participants.length===2?['SB','BB']:['UTG','MP','CO','BU','SB','BB']).indexOf(f.positions[a])-(f.participants.length===2?['SB','BB']:['UTG','MP','CO','BU','SB','BB']).indexOf(f.positions[b]));
  const live=new Set(order),pending=new Set(order),entered=new Set<number>();
  const willEnter=new Set(f.steps.filter(a=>a.kind!=='fold').map(a=>a.seat));
  const committed=new Map(order.map(seat=>[seat,f.positions[seat]==='SB'?f.bigBlind!/2:f.positions[seat]==='BB'?f.bigBlind!:0]));
  let cursor=0;
  const next=()=>{for(let i=0;i<order.length;i++){const seat=order[(cursor+i)%order.length];if(pending.has(seat))return seat;}return undefined;};
  const advance=(target:number)=>{
    let actor=next();
    while(actor!==target){
      if(actor===undefined||willEnter.has(actor)||!s.players.find(p=>p.seat===actor)?.folded)throw Error('Preflop: en tidigare spelares handling saknas eller avläst tur stämmer inte med linjen.');
      pending.delete(actor);live.delete(actor);cursor=(order.indexOf(actor)+1)%order.length;actor=next();
    }
  };
  for(const step of f.steps){
    if(step.kind==='fold'&&!entered.has(step.seat))continue;
    advance(step.seat);
    if(step.kind==='fold'){live.delete(step.seat);pending.delete(step.seat);}
    else {
      committed.set(step.seat,step.to);entered.add(step.seat);
      if(step.kind==='raise'){pending.clear();for(const seat of live)if(seat!==step.seat&&f.startingStacks[seat]>committed.get(seat)!)pending.add(seat);}
      else pending.delete(step.seat);
    }
    cursor=(order.indexOf(step.seat)+1)%order.length;
  }
  advance(s.players.find(p=>p.hero)!.seat);
}
export class PreflopTracker {
  private previous:LiveSnapshot|null=null;
  private data:PreflopFacts|undefined;
  private entered=new Set<number>();
  private awaitingBlinds=false;
  private transientError:string|undefined;
  observe(s:LiveSnapshot):void {
    if(s.street!=='preflop')return;
    if(!s.valid){
      // The table can post both blinds before the hero's cards finish dealing.
      // Only seed a new hand from a fully accounted, uncontested blind pot.
      if(this.previous?.handId===s.handId&&this.previous.readerId===s.readerId)return;
      const seats=s.players.filter(p=>!p.sittingOut);
      const sb=seats.find(p=>p.position.includes('SB')),bb=seats.find(p=>p.position==='BB');
      if(s.issues.length!==1||s.issues[0]!=='Dina två kort är inte synliga.'||
        !s.handId||s.board.length||s.observedActions.length||s.currency==='UNKNOWN'||
        !seats.some(p=>p.seat===s.dealerSeat)||seats.some(p=>p.stack===null||p.bet===null||p.folded)||
        !sb?.bet||!bb?.bet||cents(bb.bet)!==2*cents(sb.bet)||
        s.players.some(p=>p!==sb&&p!==bb&&p.bet!==0)||cents(s.pot)!==cents(sb.bet)+cents(bb.bet))return;
    }
    const old=this.awaitingBlinds?null:this.previous;
    if(!old||old.handId!==s.handId||old.readerId!==s.readerId){
      this.transientError=undefined;
      this.entered.clear();
      const players=s.players.filter(p=>!p.sittingOut),participants=players.map(p=>p.seat).sort((a,b)=>a-b);
      const clockwise=[...participants].sort((a,b)=>((a-s.dealerSeat!+s.maxSeats)%s.maxSeats||s.maxSeats)-((b-s.dealerSeat!+s.maxSeats)%s.maxSeats||s.maxSeats));
      const labels=participants.length===2?['BB','SB']:['SB','BB',...['UTG','MP','CO','BU'].slice(6-participants.length)];
      this.data={handId:s.handId,readerId:s.readerId,participants,positions:Object.fromEntries(clockwise.map((seat,i)=>[seat,labels[i]])),startingStacks:Object.fromEntries(players.map(p=>[p.seat,cents(p.stack)+cents(p.bet)])),steps:[]};
      const d=this.data;
      const sb=players.find(p=>d.positions[p.seat]==='SB'),bb=players.find(p=>d.positions[p.seat]==='BB');
      this.awaitingBlinds=(!bb?.bet||!sb?.bet)&&players.filter(p=>p!==sb&&p!==bb).every(p=>!p.bet);
      if(!sb?.bet||!bb?.bet||cents(bb.bet)!==2*cents(sb.bet))d.error='Preflop: blinds är inte säkert avlästa. Inväntar en hand från blindpostningen.';
      else {
        this.awaitingBlinds=false;
        d.bigBlind=cents(bb.bet);
        const others=players.filter(p=>p!==sb&&p!==bb&&cents(p.bet)>0);
        if(Math.abs(cents(s.pot)-players.reduce((sum,p)=>sum+cents(p.bet),0))>0){d.error='Preflop: tidigare pengar saknar entydig insatshistorik.';this.awaitingBlinds=true;}
        else if(others.length>1||others.some(p=>cents(p.bet)<=d.bigBlind!))d.error='Preflop: tidigare limps eller höjningar saknar säker ordning.';
        else if(others.length){d.steps.push({seat:others[0].seat,kind:'raise',to:cents(others[0].bet)});this.entered.add(others[0].seat);}
        for(const p of players.filter(p=>p.folded))d.steps.push({seat:p.seat,kind:'fold',to:0});
      }
      this.previous=clone(s);return;
    }
    const d=this.data!;
    if(d.error){this.previous=clone(s);return;}
    if(s.dealerSeat!==old.dealerSeat||s.players.filter(p=>!p.sittingOut).some(p=>!d.participants.includes(p.seat))){d.error='Preflop: deltagande eller dealer ändrades mitt i handen.';return;}
    const increased=s.players.filter(p=>cents(p.bet)>cents(old.players.find(q=>q.seat===p.seat)?.bet??null));
    const folds=s.players.filter(p=>p.folded&&!old.players.find(q=>q.seat===p.seat)?.folded);
    const expectedPot=cents(old.pot)+increased.reduce((sum,p)=>sum+cents(p.bet)-cents(old.players.find(q=>q.seat===p.seat)?.bet??null),0);
    if(cents(s.pot)!==expectedPot){this.transientError='Preflop: pottförändringen saknar ännu matchande bidrag. Väntar på stabil avläsning eller ny hand.';return;}
    this.transientError=undefined;
    if(increased.length>1||(increased.length&&folds.some(p=>this.entered.has(p.seat))))d.error='Preflop: flera handlingar passerade mellan avläsningarna; insatshistorikens ordning är oklar.';
    else {
      const highest=Math.max(...old.players.map(p=>cents(p.bet)));
      for(const p of increased){
        const to=cents(p.bet),kind=to>highest?'raise':'call';
        if(p.folded||to<highest&&cents(p.stack)>0)d.error='Preflop: bidraget kan inte matchas mot en laglig handling.';
        d.steps.push({seat:p.seat,kind,to});this.entered.add(p.seat);
      }
      for(const p of folds)d.steps.push({seat:p.seat,kind:'fold',to:0});
      for(const p of s.players){
        const before=old.players.find(q=>q.seat===p.seat);
        if(!p.folded&&cents(p.bet)<cents(before?.bet??null))d.error='Preflop: ett bidrag försvann utan verifierad fold.';
      }
      if(d.steps.length>60)d.error='Preflop: insatshistoriken överskrider gränsen.';
    }
    this.previous=clone(s);
  }
  facts(s:LiveSnapshot):PreflopFacts|undefined {
    if(s.street!=='preflop'||s.handId!==this.data?.handId||s.readerId!==this.data.readerId)return undefined;
    return clone({...this.data,...(this.transientError?{error:this.transientError}:{})});
  }
}
