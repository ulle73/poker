import { describe, expect, it } from "vitest";
import { currentStrength } from "../src/multiway/hand-strength";
import { calculateEquity } from "../src/multiway/equity";
import { prepareDecision } from "../src/decision/adapter";
import { allInPrice, provenChoice } from "../src/decision/flop-all-in";
import { monkerSnapshot } from "./helpers/monker";
import { FlopAllInProvider } from "../src/decision/flop-all-in";

describe("made hand versus single opponent", () => {
  it("counts kickers and suits on board quads and removes exposed dead cards", () => {
    const board = ["2s","2h","2d","2c","3d"];
    // 4 aces beat K, 3 remaining kings tie if not accompanied by an ace.
    expect(currentStrength(["Kh","6c"],board)?.counts).toEqual({stronger:170, equal:117, weaker:703});
    expect(currentStrength(["Kh","6c"],board,["As"])?.counts?.stronger).toBe(126);
    expect(currentStrength(["Kh","6c"],board,["kh"])).toBeNull();
  });
  it("handles flop, board ties, short deck and preflop", () => {
    expect(currentStrength(["Ah","Kh"],["Qh","Jh","Th"])).toEqual({category:"Färgstege", counts:{stronger:0,equal:0,weaker:1081}});
    expect(currentStrength(["2s","2d"],["Ah","Kh","Qh","Jh","Th"])?.counts?.equal).toBe(990);
    expect(currentStrength(["As","6c"],["7s","8h","9d"],[],true)?.category).toBe("Stege");
    expect(currentStrength(["6s","6h"],["Ah","Kh","Qh","Jh","Th"],[],true)?.counts?.equal).toBe(406);
    expect(currentStrength(["As","Ah"],[])).toEqual({category:"AA", counts:null});
  });
});
it("enumerates weighted HU equity and samples compatible joint ranges", () => {
  const config = {hero:["Kh","6c"],board:["2s","2h","2d","2c","3d"],playerCount:2,
    opponentRanges:["As4d:0.25,5d4h:0.75"],exactHeadsUp:true};
  expect(calculateEquity(config)).toMatchObject({ equity:.75, method:"exact", samples:2 });
  expect(calculateEquity({...config,playerCount:3,opponentRanges:[...config.opponentRanges,"5d7s"]}).equity).toBe(0);
});
it("requires strict range-independent dominance and returns unmatched chips", () => {
  const s=monkerSnapshot(2);s.street="flop";s.board=["Qh","Jh","Th"];s.heroCards=["Ah","Kh"];
  s.availableActions=["Fold","Syna"];s.players[1].bet=1;s.players[1].stack=0;s.players[0].stack=.4;s.pot=2;
  const input=prepareDecision(s),result=calculateEquity({hero:s.heroCards,board:s.board,playerCount:2,exactHeadsUp:true});
  expect(result.samples).toBe(1070190);
  expect(allInPrice(input)).toEqual({cost:40,pot:180});
  expect(provenChoice(input,result.bounds)).toBe("call");
  expect(provenChoice(input,{...result.bounds!,minimum:440})).toBeNull();
  expect(provenChoice(input,{...result.bounds!,minimum:0,maximum:439})).toBe("fold");
  expect(provenChoice(input,{...result.bounds!,combinations:1})).toBeNull();
});

it.each([3,4,5,6])("proves only closing, range-independent choices for %i dealt players", count => {
  const snapshot = monkerSnapshot(count);
  Object.assign(snapshot, { street:"flop", board:["Qh","Jh","Th"], heroCards:["Ah","Kh"],
    availableActions:["Fold","Syna"], pot:count });
  for (const p of snapshot.players.filter(p => !p.hero)) Object.assign(p,{bet:1,stack:0});
  snapshot.players[0].stack = .4;
  const input = prepareDecision(snapshot);
  expect(allInPrice(input)).toEqual({cost:40,pot:100+40*count});
  const provider = new FlopAllInProvider();
  expect(provider.unsupportedReason(snapshot,input)).toBeNull();
  const royal = {minimum:1980, maximum:1980, denominator:1980, combinations:1081};
  expect(provenChoice(input,royal)).toBe("call");
  expect(provenChoice(input,{...royal,minimum:1000})).toBeNull();
  snapshot.players.push({...snapshot.players[1],seat:20,inHand:false,folded:true});
  expect(provider.unsupportedReason(snapshot,input)).toBeTruthy();
  input.state.bets[1] = 50;
  expect(allInPrice(input)).toBeNull();
  input.state.bets[1] = 100;
  input.state.stacks[1] = 1;
  expect(allInPrice(input)).toBeNull();
});
