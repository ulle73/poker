import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { convertTexasRiver, auditRiver } from '../src/shortdeck/audit';
const raw = JSON.parse(readFileSync('docs/evidence/shortdeck-river-fullrange-2026-11-05.json','utf8'));
const config = {board:['Ks','7d','6c','8h','9d'],pot:10,stack:20,minBet:1};
it('matches the saved independent scalar oracle for the complete exported 6+ policy', () => {
 const tree=convertTexasRiver(raw,config);
 const answer=auditRiver(tree);
 expect(answer.ev[0]+answer.ev[1]).toBeCloseTo(0,10);
 expect(answer.averageExploitabilityPct).toBeCloseTo(0.16784862,4);
 expect(answer.nashConvPct).toBeCloseTo(0.33569724,4);

});
it('rejects missing nonterminal branches, invalid probabilities and fractional chips', () => {
 const missing=structuredClone(raw); delete missing.childrens.CHECK;
 expect(()=>convertTexasRiver(missing,config)).toThrow();
 const bad=structuredClone(raw); bad.strategy.strategy[Object.keys(bad.strategy.strategy)[0]]=[NaN,0,0,1];
 expect(()=>convertTexasRiver(bad,config)).toThrow();
 const fractional=structuredClone(raw); fractional.actions[1]='BET 5.001';
 expect(()=>convertTexasRiver(fractional,config)).toThrow();
});
it('rejects low cards and keeps 6+ hand ranking separate', () => {
 expect(()=>convertTexasRiver(raw,{...config,board:['Ks','7d','2c','8h','9d']})).toThrow();
});



it('preserves weighted information-set best responses against the independent scalar traversal', async () => {
 const {independentRiverReport}=await import('../scripts/river-oracle.mjs');
 const {evaluate7}=await import('../scripts/shortdeck-evaluator.mjs');
 const tree=convertTexasRiver(raw,config);
 tree.rootRanges=tree.rootRanges.map((range,p)=>range.slice(p?4:0,p?11:6).map((h,i)=>({...h,weight:(i+1)/10})));
 const slow=independentRiverReport(tree,evaluate7),fast=auditRiver(tree);
 fast.ev.forEach((v,i)=>expect(v).toBeCloseTo(slow.ev[i],11));
 fast.bestResponse.forEach((v,i)=>expect(v).toBeCloseTo(slow.bestResponse[i],11));
});
