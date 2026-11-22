import { afterEach, expect, it, vi } from "vitest";
import { startTableObserver } from "../src/live/table-observer";
import type { LiveSnapshot } from "../src/live/types";
afterEach(() => { vi.useRealTimers(); });
const snapshot = (sequence: number, readerId: string): LiveSnapshot => ({
  sequence, readerId, capturedAt: Date.now(), handId: '123', players: [], street:'preflop',
  version:1, source:'svenskaspel-dom', currency:'EUR', maxSeats:6, heroCards:[], board:[],
  pot:0.03, dealerSeat:1, heroTurn:false, availableActions:[], valid:false,
  issues:['Dina två kort är inte synliga.'], observedActions:[],
});
it('keeps reconnecting after more than thirty failures and sends a fresh capture on recovery', async () => {
  vi.useFakeTimers();
  let available = false;
  const send = vi.fn(async (_snapshot: LiveSnapshot) => { if (!available) throw new Error('offline'); return {status: 200}; });
  const reader = startTableObserver({capture: snapshot, send});
  await vi.advanceTimersByTimeAsync(600000);
  expect(send.mock.calls.length).toBeGreaterThan(30);
  available = true;
  const recoveredAt = Date.now();
  await vi.advanceTimersByTimeAsync(16000);
  expect(send.mock.lastCall![0].capturedAt).toBeGreaterThanOrEqual(recoveredAt);
  reader.stop();
  const count = send.mock.calls.length;
  await vi.advanceTimersByTimeAsync(60000);
  expect(send).toHaveBeenCalledTimes(count);
});
it('finds a table that appears after the lobby without reconnecting manually', async () => {
  vi.useFakeTimers();
  let table = false;
  const send = vi.fn(async () => ({status: 200}));
  const reader = startTableObserver({capture: (sequence, id) => table ? snapshot(sequence, id) : null, send});
  await vi.advanceTimersByTimeAsync(1800);
  expect(send).not.toHaveBeenCalled();
  table = true;
  await vi.advanceTimersByTimeAsync(600);
  expect(send).toHaveBeenCalledTimes(1);
  reader.stop();
});
it('does not overlap transfers or publish an in-flight response after stop', async () => {
  vi.useFakeTimers();
  let finish!: (value: {status: number}) => void;
  const send = vi.fn(() => new Promise<{status: number}>(resolve => {finish = resolve;}));
  const onStatus = vi.fn();
  const reader = startTableObserver({capture: snapshot, send, onStatus});
  await vi.advanceTimersByTimeAsync(3000);
  expect(send).toHaveBeenCalledTimes(1);
  reader.stop();
  finish({status: 200});
  await Promise.resolve();
  expect(onStatus).not.toHaveBeenCalled();
});
it('keeps waiting when the bridge reports another active table', async () => {
  vi.useFakeTimers();
  const send = vi.fn(async () => ({status: 409}));
  const reader = startTableObserver({capture: snapshot, send});
  await vi.advanceTimersByTimeAsync(6000);
  expect(send.mock.calls.length).toBeGreaterThan(5);
  reader.stop();
});


