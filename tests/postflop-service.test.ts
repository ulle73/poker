// @vitest-environment node
import {expect,it,vi} from 'vitest';
import {createRequire} from 'node:module';
const {PostflopService}=createRequire(import.meta.url)('../electron/postflop-service.cjs');
it('remembers cancellation arriving before the solve request starts',async()=>{
  const service=new PostflopService({directory:'unused',temporaryRoot:'unused'});
  service.verify=vi.fn();
  const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  service.cancel(id);
  await expect(service.compute({},[],id)).rejects.toThrow('avbröts');
  expect(service.verify).not.toHaveBeenCalled();
  expect(service.job).toBeNull();
});
it('does not cancel a different job when an older renderer request is aborted',()=>{
  const service=new PostflopService({directory:'unused',temporaryRoot:'unused'});
  const stop=vi.fn();service.job={id:'new',stop};
  service.cancel('old');expect(stop).not.toHaveBeenCalled();
  service.cancel('new');expect(stop).toHaveBeenCalledOnce();
});
