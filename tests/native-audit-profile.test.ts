import {it,expect} from "vitest";
import { nativeAuditProfile } from "./helpers/native-audit-profile";
import { independentCheckJamPublicNodes, independentCheckJamReport, type CheckJamSpot } from "./helpers/check-jam-oracle";
const spot: CheckJamSpot = {board:["2c","3d","7h","9s","Jc"],
  ranges:[[{cards:["As","Ah"],weight:1}],[{cards:["Ks","Kh"],weight:1}]],investment:2,stack:2};
function uniformArtifact() {
  return {protocol:"advisor-native-audit-v1",eligibleForAdvice:false,request:structuredClone(spot),
    root:{actor:0,dealer:1,pot:4,stacks:[2,2],bets:[0,0],invested:[2,2]},
    nodes:independentCheckJamPublicNodes(spot).map(({state,actions})=>({
      history:state.history,actor:state.actor,pot:state.invested.reduce((a,b)=>a+b,0),
      stacks:state.stacks,bets:state.bets,invested:state.invested,folded:state.folded,actions,
      rows:spot.ranges[state.actor].map((h)=>({cards:h.cards,frequencies:[0.5,0.5],trained:false,
        currentFrequencies:actions.map(a=>state.actor===0 ? Number(a.kind==="bet"||a.kind==="call") : Number(a.kind==="fold"||a.kind==="check")),
        currentVisited:true})),
    }))};
}
it("calibrates the foreign policy adapter with the analytically known uniform game",()=>{
  const report=independentCheckJamReport(spot,nativeAuditProfile(spot,uniformArtifact()));
  expect(report.nashConv).toBe(1.5);
  expect(report.nashConvPct).toBe(37.5);
  expect(report.untrainedInformationSets).toBeGreaterThan(0);
});
it("evaluates current and average policies separately from the same foreign artifact",()=>{
  const data=uniformArtifact();
  expect(independentCheckJamReport(spot,nativeAuditProfile(spot,data,"average")).nashConv).toBe(1.5);
  expect(independentCheckJamReport(spot,nativeAuditProfile(spot,data,"current")).nashConv).toBe(0);
});
it("rejects a missing off-policy node or mandatory action before evaluating quality",()=>{
  const pruned=uniformArtifact();pruned.nodes.pop();
  expect(()=>nativeAuditProfile(spot,pruned)).toThrow(/public nodes/);
  const actions=uniformArtifact();actions.nodes[0].actions.pop();
  expect(()=>nativeAuditProfile(spot,actions)).toThrow(/actions differ/);
});
it("rejects mismatched stacks, another board and aliasing of private rows",()=>{
  const stacks=uniformArtifact();stacks.nodes[0].stacks[0]++;
  expect(()=>nativeAuditProfile(spot,stacks)).toThrow(/state differs/);
  const board=uniformArtifact();board.request.board[0]="4c";
  expect(()=>nativeAuditProfile(spot,board)).toThrow();
  const rows=uniformArtifact();rows.nodes[0].rows[0].cards=["Ks","Kh"];
  expect(()=>nativeAuditProfile(spot,rows)).toThrow(/private row/);
});
