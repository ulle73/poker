import {it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DecisionAdvisor} from '../src/components/DecisionAdvisor';
import type {DecisionResult} from '../src/decision/types';
it('shows a chart reference and actual stack without a solver quality certificate',()=>{
 const result:DecisionResult={key:'pre',rangeRevision:0,quality:'chart-reference',provider:'artgto-preflop',modelVerified:true,
  reference:{source:'artgto',archiveSha256:'a'.repeat(64),modelDepthBB:100,actualDepthBB:94,tablePlayers:6,modelPlayers:6,history:'',sizingNotes:[]},
  actions:[{kind:'fold',to:0,cost:0,allIn:false,id:'fold:0',frequency:1,ev:null}],recommended:0,iterations:0,rootVisits:0,cutoffCount:0,elapsedMs:1,exploitabilityPct:null,assumptions:[],limitations:[]};
 const html=renderToStaticMarkup(createElement(DecisionAdvisor,{input:null,result,busy:false,error:''}));
 expect(html).toMatch(/Prefloptabell/);expect(html).toContain('94');expect(html).toContain('100');
 expect(html).not.toMatch(/Experimentell handling|Verifierad GTO|Strategi inte godkänd/);
});
