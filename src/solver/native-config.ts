import {cardCode} from 'phe';
import {parseRange} from '../decision/sampler';
import {validateConfig} from '../core/config';
import type {TrainingConfig,SolveResult} from '../core/types';
export {validateConfig,configToToml} from '../core/config';
const labels=new Map<number,string>();
for(const r of '23456789TJQKA')for(const s of 'shdc')labels.set(cardCode(r,s),r+s);
const canonical=(s:string)=>s.match(/../g)!.sort().join('');
export function nativeRequest(input:TrainingConfig){
  const config=validateConfig(input,{postflop:true});
  const ranges=[config.oopRange,config.ipRange].map(text=>parseRange(text)
    .map(h=>({cards:h.cards.map(c=>labels.get(c)!).join(''),weight:h.weight}))
    .filter(h=>!h.cards.match(/../g)!.some(c=>config.board.includes(c))));
  if(ranges.some(r=>!r.length))throw new Error('En native-range saknar lagliga kombinationer.');
  return {config,ranges};
}
export function checkNativeRanges(request:ReturnType<typeof nativeRequest>,actual:SolveResult['rootRanges']){
  if(!Array.isArray(actual)||actual.length!==2)throw new Error('Native range count mismatch');
  request.ranges.forEach((range,p)=>{
    const expected=new Map(range.map(h=>[canonical(h.cards),h.weight]));
    if(!Array.isArray(actual[p])||actual[p].length!==expected.size||new Set(actual[p].map(h=>canonical(h.cards))).size!==expected.size||
      actual[p].some(h=>!Number.isFinite(h.weight)||Math.abs(h.weight-(expected.get(canonical(h.cards))??NaN))>1e-6||!expected.has(canonical(h.cards))))
      throw new Error('Native range differs from requested combinations or weights');
  });
}
