// @vitest-environment node
import {it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
const {MonkerService}=createRequire(import.meta.url)('../electron/monker-service.cjs');
it('remembers an early cancel before validating input or starting Java',async()=>{
 const service=new MonkerService({directory:'unused',temporaryRoot:'unused'});service.verify=vi.fn();
 const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';service.cancel(id);
 await expect(service.compute({},id)).rejects.toThrow('avbr');expect(service.verify).not.toHaveBeenCalled();
});
it('does not stop a newer Monker job when an old request is cancelled',()=>{
 const service=new MonkerService({directory:'unused',temporaryRoot:'unused'}),stop=vi.fn();service.job={id:'new',stop};
 service.cancel('old');expect(stop).not.toHaveBeenCalled();service.cancel('new');expect(stop).toHaveBeenCalledOnce();
});
it('rejects malformed job identities without touching the runtime',async()=>{
 const service=new MonkerService({directory:'unused',temporaryRoot:'unused'});service.verify=vi.fn();
 await expect(service.compute({},'../other')).rejects.toThrow(/identity/i);expect(service.verify).not.toHaveBeenCalled();
});
