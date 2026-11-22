// @vitest-environment node
import {it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {prepareDecision} from '../src/decision/adapter';
import {monkerSnapshot} from './helpers/monker';
import {prepareHoldem} from '../src/holdem/model';
const {HoldemService}=createRequire(import.meta.url)('../electron/holdem-service.cjs');
const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
function config(){const s=monkerSnapshot();s.street='flop';s.board=['Jh','Qh','Kh'];s.heroCards=['9s','9h'];return prepareHoldem(s,prepareDecision(s));}
it('remembers an early cancellation without contacting the account or vendor',async()=>{
 const request=vi.fn(),service=new HoldemService({transport:{request}});service.cancel(id);
 await expect(service.compute(config(),id)).rejects.toThrow(/avbr/);expect(request).not.toHaveBeenCalled();
});
it('waits past unvisited defaults, verifies the watched node, and stops only its own completed job',async()=>{
 const c=config(),calls:string[]=[];let snap=0;
 const request=async(method:string,path:string)=>{calls.push(method+' '+path);
  if(path==='/api/runner/solve')return {status:202,data:{solve_id:'owned',status:'running'}};
  if(path.endsWith('/strategy-snapshot'))return {status:200,data:{solve_id:'owned',iterations:20000,watched_node:{history:c.history,rows:[{player:c.hero,hand_index:c.handIndex,history:c.history,street:'flop',exact_entry_street_key:true,visits:++snap===1?0:40+snap,legal_actions:['check','bet_50p'],action_freqs:{check:.7,bet_50p:.3}}]}}};
  return {status:200,data:{status:'running'}};
 };
 const service=new HoldemService({transport:{request},pollMs:1,availableMemory:()=>4*1024**3});
 const r=await service.compute(c,id);expect(r.row.visits).toBeGreaterThanOrEqual(43);expect(r.solveId).toBe('owned');
 expect(calls.filter(p=>p.endsWith('/strategy-snapshot'))).toHaveLength(3);
 expect(calls).toContain('POST /api/runner/solve/owned/strategy-watch');expect(calls.at(-1)).toBe('POST /api/runner/solve/owned/stop');
});
it('keeps a source memory stop distinct from a license failure and never returns its initialization row',async()=>{
 const request=async(_m:string,path:string)=>({status:path==='/api/runner/solve'?202:200,data:path==='/api/runner/solve'?{solve_id:'memory'}:{status:'stopped',stop_reason:'memory_pressure',runtime_memory_guard:{system_available_memory_mb:600,effective_checkpoint_reserve_mb:2048}}});
 const service=new HoldemService({transport:{request},availableMemory:()=>4*1024**3});
 await expect(service.compute(config(),id)).rejects.toThrow(/minne|MB/);
});
