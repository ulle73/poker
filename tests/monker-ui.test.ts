import {it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DecisionAdvisor} from '../src/components/DecisionAdvisor';
import {prepareDecision} from '../src/decision/adapter';
import {MONKER} from '../src/decision/providers';
import type {DecisionResult} from '../src/decision/types';
import {monkerSnapshot} from './helpers/monker';
it('shows source-computed Monker decisions and explicitly states missing quality without calling them verified GTO',()=>{
 const input=prepareDecision(monkerSnapshot()),result:DecisionResult={key:input.key,rangeRevision:0,quality:'solver-unverified',provider:'monker-free-10114',actions:[{kind:'check',to:0,cost:0,allIn:false,id:'check:0',frequency:1,ev:null}],recommended:0,iterations:50000,rootVisits:0,elapsedMs:3000,cutoffCount:0,assumptions:[],limitations:[],exploitabilityPct:null,qualityMetric:'max-unilateral',qualityLimitPct:2.1,modelVerified:true,qualityNote:'Breda ranger: uppmätt fel saknas.'};
 const html=renderToStaticMarkup(createElement(DecisionAdvisor,{input,result,provider:MONKER,busy:false,error:''}));
 expect(html).toContain('felgräns ej verifierad');expect(html).toContain('recommendation');expect(html).toContain('2,1');expect(html).toContain('Breda ranger: uppmätt fel saknas.');
 expect(html).not.toContain('Experimentell handling');expect(html).not.toContain('Verifierad GTO i valt träd');
});
