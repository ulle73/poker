import type { LiveSnapshot } from './types';
import { LiveHandMemory } from './hand-memory';
export function startTableObserver(options: {
  capture: (sequence: number, readerId: string) => LiveSnapshot | null;
  send: (snapshot: LiveSnapshot) => Promise<{status: number}>;
  onStatus?: (status: {ok: boolean; handId?: string; sequence?: number; error?: string}) => void;
}) {
  const readerId = crypto.randomUUID(), memory = new LiveHandMemory();
  let stopped = false, pending = false, sequence = 0, failed = 0, nextAttempt = 0;
  let debounce: ReturnType<typeof setTimeout>;
  const tick = async () => {
    if (stopped || pending || Date.now() < nextAttempt) return;
    const capture = options.capture(++sequence, readerId);
    if (!capture) return;
    const snapshot = memory.apply(capture);
    pending = true;
    nextAttempt = Date.now() + 180;
    try {
      const {status} = await options.send(snapshot);
      if (stopped) return;
      if (status !== 200 && status !== 409 && status !== 422) throw new Error(`bridge ${status}`);
      failed = 0;
      options.onStatus?.({ok: status === 200, handId: snapshot.handId, sequence: snapshot.sequence,
        ...(status === 200 ? {} : {error: `bridge ${status}`})});
    } catch {
      if (stopped) return;
      nextAttempt = Date.now() + Math.min(15000, 600 * 2 ** Math.min(++failed, 5));
      options.onStatus?.({ok:false, error:'Mottagaren är inte tillgänglig; återansluter automatiskt.'});
    } finally { pending = false; }
  };
  const observer = new MutationObserver(() => {
    clearTimeout(debounce);
    debounce = setTimeout(tick, 80);
  });
  observer.observe(document.body, {subtree:true, childList:true, attributes:true, characterData:true});
  const timer = setInterval(tick, 600);
  void tick();
  return {readerId, stop: () => {
    stopped = true; observer.disconnect(); clearInterval(timer); clearTimeout(debounce);
  }};
}
