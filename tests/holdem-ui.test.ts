import {it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DecisionAdvisor} from '../src/components/DecisionAdvisor';
import {prepareDecision} from '../src/decision/adapter';
import {monkerSnapshot} from './helpers/monker';
import {prepareHoldem,holdemDecision} from '../src/holdem/model';
it('shows a trained Holdem source result with missing error bound stated explicitly',()=>{
 const s=monkerSnapshot();s.street='flop';s.board=['Jh','Qh','Kh'];s.heroCards=['9s','9h'];const input=prepareDecision(s),config=prepareHoldem(s,input);
 const result=holdemDecision(input,config,{player:0,history:'entry_flop',street:'flop',hand_index:config.handIndex,exact_entry_street_key:true,visits:40,legal_actions:['check','bet_50p'],action_freqs:{check:.7,bet_50p:.3}},2345,20000,'owned');
 const html=renderToStaticMarkup(createElement(DecisionAdvisor,{input,result,busy:false,error:''}));
 expect(html).toContain('Holdem Solver · felgräns ej verifierad');expect(html).toContain('recommendation');
 expect(html).not.toContain('Monkers');expect(html).not.toContain('Verifierad GTO i valt träd');expect(html).not.toContain('2 % felgräns');
});
