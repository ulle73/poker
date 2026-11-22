import {expect,it} from 'vitest';
import {nativeRequest,checkNativeRanges} from '../src/solver/native-config';
const config={board:['Ks','7d','2c','8h'],oopRange:'KK,A4s:0.25',ipRange:'TT,JJ',pot:10,stack:20,
  betSizes:[50],raiseSizes:[50],maxIterations:300,targetPct:2};
it('binds explicit weighted combinations and board blockers independently of native range syntax',()=>{
  const request=nativeRequest(config);
  expect(request.ranges[0]).toHaveLength(7);
  expect(request.ranges[0].filter(h=>h.weight===0.25)).toHaveLength(4);
  expect(request.ranges.flat().some(h=>config.board.some(c=>h.cards.includes(c)))).toBe(false);
  expect(()=>checkNativeRanges(request,request.ranges)).not.toThrow();
  const changed=structuredClone(request.ranges);changed[0][0].weight=0.6;
  expect(()=>checkNativeRanges(request,changed)).toThrow();
  expect(()=>checkNativeRanges(request,[request.ranges[0].slice(1),request.ranges[1]])).toThrow();
});
