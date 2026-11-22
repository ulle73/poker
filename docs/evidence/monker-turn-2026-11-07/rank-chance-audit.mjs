import { evaluate7 } from "file:///C:/dev/poker/scripts/river-oracle.mjs";
/** Current regret-matching policy; negative regrets receive zero mass. */
export function monkerCurrentPolicy(raw,bucket,actions) {
  return normalizedPolicy(raw,bucket,actions,true);
}

/** FREE10114 prepends action codes while loading each stored tree node. */
export function monkerRuntimeTree(stored) {
  const result=[];
  function visit(node) {
    const item={id:result.length+1,action:node.action,children:[]};
    result.push(item);
    for(const child of [...node.children].reverse()) item.children.push(visit(child));
    return item.id;
  }
  visit(stored);
  return result;
}

/** Accumulated reach-weighted averages, not regret matching or EVs. */
export function monkerPolicy(raw,bucket,actions) {
  return normalizedPolicy(raw,bucket,actions,false);
}
function normalizedPolicy(raw,bucket,actions,current) {
  if(!Array.isArray(raw)||!Number.isSafeInteger(bucket)||bucket<0||!Number.isSafeInteger(actions)||actions<1||raw.length%actions||bucket>=raw.length/actions) throw Error("Invalid strategy shape/index");
  let values=raw.slice(bucket*actions,(bucket+1)*actions);
  if(values.some(v=>!Number.isFinite(v)||(!current&&v<0))) throw Error("Invalid strategy weight");
  if(current)values=values.map(v=>Math.max(0,v));
  const total=values.reduce((a,b)=>a+b,0);
  if(!Number.isFinite(total)) throw Error("Invalid average-strategy total");
  return total>0?values.map(v=>v/total):values.map(()=>1/actions);
}

const deck="23456789TJQKA".split("").flatMap(r=>["s","h","d","c"].map(s=>r+s));
const parse = hand => {
  if(typeof hand!=="string"||!/^([2-9TJQKA][shdc]){2}$/.test(hand)) throw Error("Invalid holding");
  const cards=hand.match(/../g);
  if(cards[0]===cards[1]) throw Error("Duplicate card in holding");
  return cards;
};

/** Exact evaluation and independent information-set best responses. No training.
 * Intentionally bounded: broad ranges that cannot be enumerated are rejected,
 * never relabelled as having 2% error from samples or vendor iteration counts.
 * NashConv is SUM of unilateral improvements, normalized by the root pot.
 */
export function auditMultiway(model,{maxWorlds=4096,maxVisits=20000000,collectBestResponses=false}={}) {
  const start=performance.now(), n=model.players;
  if(model.strategyMode&&!['average','current-regret-matching'].includes(model.strategyMode))throw Error("Unsupported strategy mode");
  if(!Number.isInteger(n)||n<2||n>6||![4,5].includes(model.board?.length)||new Set(model.board).size!==model.board.length||model.board.some(c=>!deck.includes(c))||!Number.isFinite(model.deadPot)||model.deadPot<=0||model.ranges?.length!==n) throw Error("Unsupported audit model");
  const nodes=new Map(model.nodes.map(node=>[node.id,node]));
  if(nodes.size!==model.nodes.length||!nodes.has(1)) throw Error("Invalid node identities");
  for(const node of nodes.values()) {
    if(![2,3,4].includes(node.street)||node.contributions?.length!==n||node.contributions.some(v=>!Number.isFinite(v)||v<0)||!node.active?.length||new Set(node.active).size!==node.active.length||node.active.some(p=>!Number.isInteger(p)||p<0||p>=n)||node.actions?.length!==node.children?.length||new Set(node.actions).size!==node.actions.length||node.children.some(id=>!nodes.has(id)||id<=node.id)||(node.children.length>0&&(!node.active.includes(node.actor)||node.street===4))) throw Error("Invalid public tree");
  }
  const worlds=[];
  function deal(p,hands,used,weight) {
    if(p===n){worlds.push({hands,cards:used,weight});if(worlds.length>maxWorlds) throw Error("Exact audit world budget exceeded; quality unknown");return;}
    const range=model.ranges[p];
    if(!Array.isArray(range)||!range.length||range.length>1326) throw Error("Invalid range");
    const seen=new Set();
    for(const h of range) {
      const cards=parse(h.cards),key=[...cards].sort().join("");
      if(!Number.isFinite(h.weight)||h.weight<=0||seen.has(key)) throw Error("Invalid range weights/duplicates");
      seen.add(key);
      if(cards.some(c=>used.has(c))) continue;
      deal(p+1,[...hands,h.cards],new Set([...used,...cards]),weight*h.weight);
    }
  }
  const upperCount=model.ranges.reduce((v,r)=>v*(r?.length??0),1);
  if(!Number.isFinite(upperCount)||upperCount>maxWorlds) throw Error("Exact audit joint-range budget exceeded; quality unknown");
  deal(0,[],new Set(model.board),1);
  const mass=worlds.reduce((s,w)=>s+w.weight,0);
  if(!Number.isFinite(mass)||mass<=0) throw Error("No legal joint deals");
  for(const w of worlds) w.weight/=mass;
  let visits=0;
  const bestResponseActions={};
  const rankCache=new Map(),utilityCache=new Map();
  let cachedUtilities=0;
  function rank(board,hand) {
    const key=board.join("")+hand;
    if(!rankCache.has(key))rankCache.set(key,evaluate7([...board,...parse(hand)]));
    return rankCache.get(key);
  }
  function policy(node,hand,board) {
    let result=node.policy?.[hand];
    if(!result&&model.bucketMaps) {
      const bucket=model.bucketMaps[board.join("")]?.[node.actor]?.[hand];
      result=model.strategyMode==='current-regret-matching'
        ?monkerCurrentPolicy(model.currentRegrets?.[node.id],bucket,node.actions.length)
        :monkerPolicy(model.averages?.[node.id],bucket,node.actions.length);
    }
    if(!Array.isArray(result)||result.length!==node.actions.length||result.some(v=>!Number.isFinite(v)||v<0||v>1)||Math.abs(result.reduce((s,v)=>s+v,0)-1)>1e-9) throw Error("Missing or invalid information-set policy");
    return result;
  }
  function utility(node,board,world,hero,cache) {
    const previous=cache.get(world);
    if(previous)return previous[hero];
    const e=node.contributions,pot=model.deadPot+e.reduce((s,v)=>s+v,0);
    const values=e.map(v=>-v);
    if(node.active.length===1) {
      values[node.active[0]]+=pot;
      if(cachedUtilities<100000){cache.set(world,values);cachedUtilities++;}
      return values[hero];
    }
    const scores=node.active.map(p=>[p,rank(board,world.hands[p])]);
    function distribute(amount,eligible) {
      const best=Math.max(...eligible.map(p=>scores.find(([seat])=>seat===p)[1]));
      const winners=eligible.filter(p=>scores.find(([seat])=>seat===p)[1]===best);
      for(const p of winners)values[p]+=amount/winners.length;
    }
    distribute(model.deadPot,node.active);
    let lower=0;
    for(const upper of [...new Set(e)].filter(v=>v>0).sort((a,b)=>a-b)) {
      const eligible=node.active.filter(p=>e[p]>=upper);
      if(!eligible.length)throw Error("Invalid side-pot eligibility");
      distribute((upper-lower)*e.filter(v=>v>=upper).length,eligible);lower=upper;
    }
    if(cachedUtilities<100000){cache.set(world,values);cachedUtilities++;}
    return values[hero];
  }
  function visit(id,board,weights,hero,maximize) {
    if(++visits>maxVisits)throw Error("Exact audit traversal budget exceeded; quality unknown");
    if(weights.every(w=>w===0))return 0;
    const node=nodes.get(id),terminal=node.children.length===0;
    if((!terminal&&node.street===3&&board.length===4)||(terminal&&node.active.length>1&&board.length<5)) {
      let total=0;
      const denominator=52-board.length-2*n;
      if(model.pairRankChance){
        for(const r of '23456789TJQKA'){
          const card=deck.find(c=>c[0]===r&&!board.includes(c)&&!model.ranges.some(range=>range.some(h=>h.cards.match(/../g).includes(c))));
          if(!card)throw Error('No safe representative river');
          const remaining=worlds.map(world=>4-board.filter(c=>c[0]===r).length-world.hands.reduce((n,h)=>n+h.match(/../g).filter(c=>c[0]===r).length,0));
          total+=visit(id,[...board,card],weights.map((w,i)=>w*remaining[i]/denominator),hero,maximize);
        }
      }else for(const card of deck)if(!board.includes(card))total+=visit(id,[...board,card],weights.map((w,i)=>worlds[i].cards.has(card)?0:w/denominator),hero,maximize);
      return total;
    }
    if(terminal) {
      const key=node.id+":"+board.join("");
      if(!utilityCache.has(key))utilityCache.set(key,new Map());
      const cache=utilityCache.get(key);
      return worlds.reduce((sum,w,i)=>sum+(weights[i]===0?0:weights[i]*utility(node,board,w,hero,cache)),0);
    }
    if(maximize&&node.actor===hero) {
      const alternatives=node.children.map(child=>visit(child,board,weights,hero,true));
      const best=Math.max(...alternatives);
      if(collectBestResponses) {
        const hand=worlds[weights.findIndex(w=>w>0)].hands[hero];
        bestResponseActions[hero+":"+id+":"+board.join("")+":"+hand]=alternatives.indexOf(best);
      }
      return best;
    }
    const choices=worlds.map((w,i)=>weights[i]===0?null:policy(node,w.hands[node.actor],board));
    return node.children.reduce((sum,child,a)=>sum+visit(child,board,weights.map((w,i)=>w===0?0:w*choices[i][a]),hero,maximize),0);
  }
  const values=[],bestResponses=[],gains=[];
  for(let hero=0;hero<n;hero++) {
    let value=0,best=0;
    for(const hand of new Set(worlds.map(w=>w.hands[hero]))) {
      const weights=worlds.map(w=>w.hands[hero]===hand?w.weight:0);
      value+=visit(1,model.board,weights,hero,false);
      best+=visit(1,model.board,weights,hero,true);
    }
    const gain=best-value;
    if(gain< -1e-8)throw Error("Best response below policy value");
    values.push(value);bestResponses.push(best);gains.push(Math.max(0,gain));
  }
  const rootPot=model.deadPot+nodes.get(1).contributions.reduce((s,v)=>s+v,0);
  const root=nodes.get(1),rootActions={};
  if(root.children.length)for(const hand of new Set(worlds.map(w=>w.hands[root.actor]))) {
    const weights=worlds.map(w=>w.hands[root.actor]===hand?w.weight:0);
    const handMass=weights.reduce((s,w)=>s+w,0);
    rootActions[hand]=root.children.map(child=>visit(child,model.board,weights,root.actor,false)/handMass);
  }
  const nashConv=gains.reduce((s,v)=>s+v,0),nashConvPct=100*nashConv/rootPot;
  if(!Number.isFinite(nashConvPct))throw Error("Invalid quality result");
  return {method:"exact-enumeration-information-set-best-response",values,bestResponses,gains,nashConv,nashConvPct,maxGainPct:100*Math.max(...gains)/rootPot,accepted:nashConvPct<=2,rootPot,rootActions,jointDeals:worlds.length,visits,...(collectBestResponses?{bestResponseActions}:{}),elapsedMs:performance.now()-start};
}
