import { expect, it, vi } from 'vitest';
import { relaySnapshot } from '../src/extension/relay';
const sender = {id: 'extension-id', url: 'https://games-svenskaspel.onegameslink.com/poker/web/test/index.html', frameId: 0, tab: {id: 7}};
const payload = {version: 1, source: 'svenskaspel-dom', sequence: 1, handId: '123'};
it('requires a paired token and never returns it to the content script', async () => {
  const request = vi.fn();
  expect(await relaySnapshot(payload, sender, 'extension-id', undefined, request)).toEqual({status: 401});
  expect(request).not.toHaveBeenCalled();
});
it.each([
  {...sender, url: 'https://evil.example/'},
  {...sender, url: 'https://games-svenskaspel.onegameslink.com.evil.example/poker/web/'},
  {...sender, id: 'other-extension'},
  {...sender, frameId: 1},
])('rejects foreign senders before network access', async (bad) => {
  const request = vi.fn();
  expect(await relaySnapshot(payload, bad, 'extension-id', 'a'.repeat(48), request)).toEqual({status: 403});
  expect(request).not.toHaveBeenCalled();
});
it('sends only to fixed loopback without cookies or redirects', async () => {
  const request = vi.fn<typeof fetch>(async () => ({status: 200} as Response));
  expect(await relaySnapshot(payload, sender, 'extension-id', 'a'.repeat(48), request)).toEqual({status: 200});
  expect(request.mock.calls[0][0]).toBe('http://127.0.0.1:47832/ingest');
  expect(request.mock.calls[0][1]).toMatchObject({method:'POST',credentials:'omit',redirect:'error',headers:{'X-Poker-Token':'a'.repeat(48)}});
});
it('rejects oversized messages instead of sending arbitrary page content', async () => {
  const request = vi.fn();
  expect(await relaySnapshot({...payload, extra: 'x'.repeat(33000)}, sender, 'extension-id', 'a'.repeat(48), request)).toEqual({status: 413});
  expect(request).not.toHaveBeenCalled();
});

