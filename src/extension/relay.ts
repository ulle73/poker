export interface Sender {id?:string; url?:string; frameId?:number; tab?:{id?:number}}
export async function relaySnapshot(payload: unknown, sender: Sender, extensionId: string,
  token: unknown, request: typeof fetch = fetch): Promise<{status:number}> {
  let url: URL;
  try {url = new URL(sender.url ?? '');} catch {return {status:403};}
  if (sender.id !== extensionId || sender.frameId !== 0 || !Number.isInteger(sender.tab?.id) ||
    url.origin !== 'https://games-svenskaspel.onegameslink.com' || !url.pathname.startsWith('/poker/web/'))
    return {status:403};
  if (typeof token !== 'string' || !/^[a-f0-9]{48}$/.test(token)) return {status:401};
  const body = JSON.stringify(payload);
  if (!body || new TextEncoder().encode(body).length > 32768) return {status:413};
  const response = await request('http://127.0.0.1:47832/ingest', {
    method:'POST', headers:{'Content-Type':'application/json','X-Poker-Token':token}, body,
    credentials:'omit', redirect:'error', cache:'no-store', signal:AbortSignal.timeout(2000),
  });
  return {status:response.status};
}
