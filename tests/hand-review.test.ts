import {createRequire} from "node:module";
import {expect,it} from "vitest";
import {changed,preflopSnapshot} from "./helpers/preflop";
import {reviewSpots} from "../src/live/HandReview";
import {flopReference} from "../src/flop/match-review";
import type {LiveSnapshot} from "../src/live/types";
const {createHandReview} = createRequire(import.meta.url)("../electron/hand-review.cjs");

it.each([1,2,3])("releases only after %i distinct confirmed hand changes", lag => {
  const review = createHandReview(lag);
  const base = preflopSnapshot();
  const send = (id:number, patch:Partial<LiveSnapshot>={}) => {
    const now = Date.now();
    review.observe({...base,handId:String(id),capturedAt:now,...patch}, now);
  };
  send(101);
  for (let change=1;change<=lag;change++) {
    const next=101+change*11;
    send(next,{valid:false});
    send(next,{street:"flop",board:["Ac","Kd","Jc"]});
    send(next-11);
    expect(review.get("101",base.readerId)).toBeUndefined();
    send(next);
  }
  expect(review.status().hands).toEqual(["101"]);
  expect(review.get("101","another tab")).toBeUndefined();
  expect(review.get("101",base.readerId).frames).toHaveLength(1);
});
it("protects the active hand at zero and isolates readers",()=>{
  const review=createHandReview(0), s=preflopSnapshot(), now=Date.now();
  review.observe(s,now);
  expect(review.status().hands).toEqual([]);
  review.observe({...s,handId:"102"},now);
  expect(review.status().hands).toEqual([s.handId]);
  review.observe({...s,readerId:"another"},now);
  expect(review.get(s.handId,s.readerId)).toBeUndefined();
});
it("allows zero extra delay only after the hero's observed fold",()=>{
  const review=createHandReview(0), s=preflopSnapshot(), now=Date.now();
  review.observe(s,now);
  const done=structuredClone(s), hero=done.players.find(p=>p.hero)!;
  done.heroTurn=false;
  done.availableActions=[];
  hero.folded=true;
  hero.inHand=false;
  review.observe(done,now);
  expect(review.status().hands).toEqual([]);
  review.observe({...done,observedActions:[{seat:hero.seat,street:"preflop",action:"fold",amount:0}]},now);
  expect(review.status().hands).toEqual([s.handId]);
});

it("rejects an off-tree opening and interrupted flop contributions before lookup", async()=>{
  const deal=preflopSnapshot(5);
  deal.heroTurn=false;
  deal.heroCards=["Kh","7c"];
  const open=changed(deal,6,.05), call=changed(open,2,.05);
  const flop=structuredClone(call);
  Object.assign(flop,{street:"flop",board:["Ac","Kd","Jc"],heroCards:["Kh","7c"],
    heroTurn:true,availableActions:["Check","Satsa"]});
  for(const p of flop.players) {
    p.bet=0;
    p.inHand=[2,6].includes(p.seat);
    p.folded=!p.inHand;
  }
  const frames=[deal,open,call,flop];
  const [spot]=reviewSpots({id:deal.handId,reader:deal.readerId,overflow:false,frames});
  expect(spot.input?.seats).toHaveLength(2);
  const noFetch=async()=>{throw Error("unexpected lookup");};
  const wrongOpen={...spot.pre!,steps:[{seat:6,kind:"raise" as const,to:7}]};
  await expect(flopReference(frames,wrongOpen,spot.input!,noFetch)).rejects.toThrow("Prefloplinjen");
  await expect(flopReference([{...deal,heroCards:["Th","Ts"]},...frames.slice(1)],spot.pre,spot.input!,noFetch))
    .rejects.toThrow("Hålkort");
  const later=structuredClone(flop);
  for(const p of later.players.filter(p=>p.inHand)) {p.bet=.12;p.stack!-=.12;}
  later.pot!+=.24;
  await expect(flopReference([...frames,later],spot.pre,spot.input!,noFetch)).rejects.toThrow("ordning");
});
