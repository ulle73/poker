// @vitest-environment node
import {expect,it} from 'vitest';
import {createRequire} from 'node:module';
const {commands,validate}=createRequire(import.meta.url)('../electron/shortdeck-service.cjs');
const pair=(rank:string)=>[...'shdc'].flatMap((a,i)=>[...'shdc'].slice(i+1).map(b=>({cards:rank+a+rank+b,weight:1})));
const config={board:['Ks','7d','6c','8h','9d'],pot:1000,stack:2000,minBet:2,ranges:[pair('A'),pair('T')]};
it('serializes only constrained short-deck inputs and uses a conservative native target',()=>{
 expect(commands(config)).toContain('set_accuracy 0.05');
 expect(commands(config)).toContain('set_range_oop AA:1');
 expect(()=>commands({...config,board:['Ks\ndump_result evil','7d','6c','8h','9d']})).toThrow();
 expect(()=>validate({...config,ranges:[[{cards:'2c2d',weight:1}],config.ranges[1]]})).toThrow();
 expect(()=>validate({...config,ranges:[[{cards:'KsKd',weight:1}],config.ranges[1]]})).toThrow();
});


it('cancels a job before a delayed provenance check finishes', async () => {
 const {ShortdeckService}=createRequire(import.meta.url)('../electron/shortdeck-service.cjs');
 const service=new ShortdeckService({directory:'unused',temporaryRoot:'unused'});
 let ready!:()=>void;
 service.verify=()=>new Promise<void>(resolve=>{ready=resolve;});
 const promise=service.compute(config,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
 service.cancel('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
 ready();
 await expect(promise).rejects.toThrow('Avbruten');
 expect(service.job).toBeNull();
});
it('rejects partial per-combination weights instead of silently averaging them',()=>{
 const broken={...config,ranges:[config.ranges[0].slice(0,1),config.ranges[1]]};
 expect(()=>commands(broken)).toThrow('samma vikt');
});
