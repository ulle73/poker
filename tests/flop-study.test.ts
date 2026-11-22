import { createRequire } from "node:module";
import { join } from "node:path";
import { expect, it } from "vitest";
import boards from "../electron/flop-study-boards.json";
import { actionName, studyLines, type FlopStudy, type StudyNode } from "../src/flop/study";

const {readBoard} = createRequire(import.meta.url)("../electron/flop-study.cjs");
it("refuses boards outside the pinned library before reading a file", async()=>{
  await expect(readBoard("unused","../other")).rejects.toThrow("Brädan saknas");
});
it("uses the call price and the raise-to amount for the acting seat",()=>{
  const node={player:1,stacks:[8654,9568]} as StudyNode;
  expect(actionName(node,{token:"call",child:"x"})).toBe("Syna 9,14 BB");
  expect(actionName(node,{token:"raise100",amount:1096,child:"x"})).toBe("Höj till 10,96 BB");
});
it.skipIf(!process.env.POKER_FLOP_TEST_DIR)("checks all installed source trees, exact hands and both players",async()=>{
  let count=0;
  for(const board of Object.keys(boards)){
    const doc:FlopStudy=JSON.parse((await readBoard(join(process.env.POKER_FLOP_TEST_DIR!),board)).toString("utf8"));
    expect(doc.meta).toMatchObject({stop:"converged",backend:"texas"});
    expect(doc.meta.exploitability_pct_pot).toBeGreaterThan(0);
    expect(doc.meta.exploitability_pct_pot).toBeLessThanOrEqual(1);
    expect(doc.combos.length).toBe(1326);
    const lines=studyLines(doc,board);
    expect(lines).toHaveLength(Object.values(doc.nodes).filter(n=>n.type==="action").length);
    expect(new Set(lines.map(l=>doc.nodes[l.id].player))).toEqual(new Set([0,1]));
    for(const line of lines){
      const node=doc.nodes[line.id];
      for(const i of line.hands){
        const cards=doc.combos[i].match(/../g)!;
        if(cards.some(c=>board.includes(c)) || node.reach[i]<=0)throw Error("Otillgänglig hand");
      }
      node.actions.forEach(a=>expect(actionName(node,a)).toBeTruthy());
      count++;
    }
  }
  expect(count).toBe(10 * Object.keys(boards).length);
},30000);
