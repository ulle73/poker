import { describe, expect, it } from "vitest";
import { monkerPolicy, monkerCurrentPolicy, monkerRuntimeTree, auditMultiway } from "../scripts/monker-audit/policy-audit.mjs";
import type { MonkerModel } from "../scripts/monker-audit/policy-audit.mjs";
import riverFixture from "./fixtures/monker-3p-river-10114.json";

describe("Monker export contract", () => {
  it("keeps Check paired with its weights when stored children are reversed at load", () => {
    const tree = monkerRuntimeTree({action:-1,children:[
      {action:3,children:[]}, {action:1,children:[{action:0,children:[]},{action:1,children:[]}]},
    ]});
    expect(tree.map((n:any)=>({id:n.id,action:n.action,children:n.children}))).toEqual([
      {id:1,action:-1,children:[2,5]}, {id:2,action:1,children:[3,4]},
      {id:3,action:1,children:[]}, {id:4,action:0,children:[]},
      {id:5,action:3,children:[]},
    ]);
    expect(monkerPolicy([0,10,3,1],1,2)).toEqual([0.75,0.25]);
    expect(monkerPolicy([0,10,3,1],0,2)).toEqual([0,1]);
  });
  it("uses a uniform fallback only for an unvisited valid hand and rejects invalid weights", () => {
    expect(monkerPolicy([0,0],0,2)).toEqual([0.5,0.5]);
    expect(()=>monkerPolicy([1,Number.NaN],0,2)).toThrow();
    expect(()=>monkerPolicy([1,-1],0,2)).toThrow();
    expect(()=>monkerPolicy([1],0,2)).toThrow();
    expect(()=>monkerPolicy([1,1],1,2)).toThrow();
  });
  it("decodes current regret-matching separately from nonnegative average-strategy weights", () => {
    expect(monkerCurrentPolicy([-2,5,3,1],0,2)).toEqual([0,1]);
    expect(monkerCurrentPolicy([-2,5,3,1],1,2)).toEqual([0.75,0.25]);
    expect(monkerCurrentPolicy([-2,-1],0,2)).toEqual([0.5,0.5]);
    expect(()=>monkerCurrentPolicy([1,Number.NaN],0,2)).toThrow();
  });
});

const tieModel = (): MonkerModel => ({
  players:3, board:["As","Ks","Qs","Js","Ts"], deadPot:4,
  ranges:[[{cards:"2c3c",weight:1}],[{cards:"4c5c",weight:1}],[{cards:"6c7c",weight:1}]],
  nodes:[
    {id:1,actor:0,street:3,contributions:[0,0,0],active:[0,1,2],actions:[1,3],children:[2,3],policy:{"2c3c":[1,0]}},
    {id:2,street:4,contributions:[0,0,0],active:[0,1,2],actions:[],children:[]},
    {id:3,actor:1,street:3,contributions:[4,0,0],active:[0,1,2],actions:[0,1],children:[4,5],policy:{"4c5c":[1,0]}},
    {id:4,actor:2,street:3,contributions:[4,0,0],active:[0,2],actions:[0,1],children:[6,7],policy:{"6c7c":[1,0]}},
    {id:5,street:4,contributions:[4,4,0],active:[0,1],actions:[],children:[]},
    {id:6,street:4,contributions:[4,0,0],active:[0],actions:[],children:[]},
    {id:7,street:4,contributions:[4,0,4],active:[0,2],actions:[],children:[]},
  ],
});

describe("independent multiway quality audit", () => {
  it("reproduces the real FREE10114 river export and independently crosschecked best responses", () => {
    const result=auditMultiway(riverFixture);
    expect(result.nashConvPct).toBeCloseTo(0.9596038471735281,9);
    expect(result.accepted).toBe(true);
    const expected=[32.70198750347991,3972.86072686256,32.82143952090097];
    result.bestResponses.forEach((value,p)=>expect(value).toBeCloseTo(expected[p],8));
  });
  it("sums unilateral gains and does not divide NashConv by player count to pass 2 percent", () => {
    const result = auditMultiway(tieModel(),{collectBestResponses:true});
    expect(result.values).toEqual([4/3,4/3,4/3]);
    expect(result.gains[0]).toBeCloseTo(8/3,12);
    expect(result.gains.slice(1)).toEqual([0,0]);
    expect(result.nashConvPct).toBeCloseTo(200/3,10);
    expect(result.accepted).toBe(false);
    expect(result.rootActions["2c3c"]).toEqual([4/3,4]);
    expect(result.bestResponseActions["0:1:AsKsQsJsTs:2c3c"]).toBe(1);
  });
  it("chooses one best-response action per information set, without seeing hidden opponent cards", () => {
    const model = {
      players:3,board:["2s","3h","4d","8c","9s"],deadPot:4,
      ranges:[[{cards:"AcAd",weight:1}],[{cards:"KhKd",weight:1},{cards:"9c9d",weight:2}],[{cards:"5c6c",weight:1}]],
      nodes:[
        {id:1,actor:0,street:3,contributions:[0,4,0],active:[0,1],actions:[0,1],children:[2,3],policy:{AcAd:[1,0]}},
        {id:2,street:4,contributions:[0,4,0],active:[1],actions:[],children:[]},
        {id:3,street:4,contributions:[4,4,0],active:[0,1],actions:[],children:[]},
      ],
    };
    const result = auditMultiway(model);
    expect(result.gains[0]).toBeCloseTo(0,12);
    expect(result.nashConvPct).toBeCloseTo(0,12);
    expect(result.accepted).toBe(true);
  });
  it("does not accept an export with a missing policy or illegal overlapping root ranges", () => {
    const missing = tieModel(); missing.nodes[0].policy = {};
    expect(()=>auditMultiway(missing)).toThrow();
    const overlap=tieModel(); overlap.ranges[1]=[{cards:"2c3c",weight:1}];
    expect(()=>auditMultiway(overlap)).toThrow();
  });
  it("keeps folded players' hole cards blocked in exact turn runouts", () => {
    const result=auditMultiway({players:3,board:["Ac","Ad","Ah","As"],deadPot:42,
      ranges:[[{cards:"KcKd",weight:1}],[{cards:"QcQd",weight:1}],[{cards:"KhKs",weight:1}]],
      nodes:[{id:1,street:4,contributions:[0,0,0],active:[0,1],actions:[],children:[]}],
    });
    expect(result.values[0]).toBeCloseTo(42,10);
    expect(result.values[1]).toBeCloseTo(0,10);
    expect(result.nashConvPct).toBe(0);
  });
});
