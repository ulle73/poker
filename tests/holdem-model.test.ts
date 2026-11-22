import {it,expect} from 'vitest';
import {prepareDecision} from '../src/decision/adapter';
import {monkerSnapshot} from './helpers/monker';
import {prepareHoldem,checkHoldemRow,holdemDecision} from '../src/holdem/model';

function model(n=3,hero=0){const s=monkerSnapshot(n,hero);s.street='flop';s.board=['Jh','Qh','Kh'];s.heroCards=['9s','9h'];return {s,i:prepareDecision(s)};}
it.each([2,3,4,5,6])('builds a full-depth %i-player flop request with the actual positions and weighted priors',n=>{
 const {s,i}=model(n),c=prepareHoldem(s,i);
 expect(c.request.players).toBe(n);expect(c.request.button).toBe(n-1);
 expect(c.request.entry_private_keying).toBe('lossless');expect(c.request.use_default_ranges).toBe(false);
 expect(c.request.ranges['0']).toContain('33+');expect(c.request.ranges['1']).toBeUndefined();
 expect(c.request.seat_stacks_bb).toEqual(Array(n).fill(80));
 expect(c.request.starting_pot_bb).toBe(40);expect(c.history).toBe('entry_flop');
});
it('tracks preceding checks without changing who acts or conditioning opponents on the hero cards',()=>{
 const {s,i}=model(4,2),c=prepareHoldem(s,i);
 expect(c.history).toBe('entry_flop.check.check');expect(c.hero).toBe(2);
 expect(Object.keys(c.request.ranges)).toEqual(['2']);
});
it('refuses ambiguous observed bets and excluded hero hands rather than solving a different state',()=>{
 const {s}=model();s.players[1].bet=.1;s.pot=.9;
 expect(()=>prepareHoldem(s,prepareDecision(s))).toThrow(/insats|linje/);
 const weak=model();weak.s.heroCards=['7s','2d'];
 expect(()=>prepareHoldem(weak.s,prepareDecision(weak.s))).toThrow(/range/);
});
it('rejects initialization, old jobs, wrong actors and unsupported exact-hand keys',()=>{
 const {s,i}=model(),c=prepareHoldem(s,i);
 const row={player:0,history:'entry_flop',street:'flop',hand_index:c.handIndex,exact_entry_street_key:true,visits:40,legal_actions:['check','bet_50p'],action_freqs:{check:.7,bet_50p:.3}};
 const snapshot={solve_id:'owned',iterations:20000,watched_node:{history:c.history,rows:[row]}};
 expect(checkHoldemRow(c,snapshot,'owned')).toMatchObject({visits:40});
 expect(()=>checkHoldemRow(c,{...snapshot,solve_id:'old'},'owned')).toThrow();
 expect(()=>checkHoldemRow(c,{...snapshot,watched_node:{history:c.history,rows:[{...row,visits:0}]}},'owned')).toThrow();
 expect(()=>checkHoldemRow(c,{...snapshot,watched_node:{history:c.history,rows:[{...row,exact_entry_street_key:false}]}},'owned')).toThrow();
 const r=holdemDecision(i,c,row,1234,20000,'owned');
 expect(r.quality).toBe('solver-unverified');expect(r.exploitabilityPct).toBeNull();
 expect(r.actions.map(a=>a.cost)).toEqual([0,40]);
 expect(r.qualityNote).toMatch(/inte|ej/);
});
