import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { createLiveBridge } = require("../electron/live-bridge.cjs");
describe("authenticated loopback bridge", () => {
  it("rejects invalid authorization and origins, validates schema and accepts ordered snapshots", async () => {
    const bridge = await createLiveBridge({ port: 0, token: "test-token" });
    const endpoint = `http://127.0.0.1:${bridge.port}/ingest`;
    const snapshot = {
      version: 1,
      source: "svenskaspel-dom",
      readerId: "r",
      sequence: 1,
      handId: "123",
      capturedAt: Date.now(),
      currency: "EUR",
      maxSeats: 6,
      players: [
        {
          seat: 4,
          hero: true,
          position: "BB",
          stack: 4,
          bet: 0.02,
          folded: false,
          inHand: true,
        },
        {
          seat: 6,
          hero: false,
          position: "BTN / SB",
          stack: 1,
          bet: 0.02,
          folded: false,
          inHand: true,
        },
      ],
      heroCards: ["Qh", "2h"],
      board: [],
      pot: 0.04,
      street: "preflop",
      dealerSeat: 6,
      valid: true,
      issues: [],
      observedActions: [],
    };
    try {
      expect(
        (
          await fetch(endpoint, {
            method: "POST",
            body: JSON.stringify(snapshot),
          })
        ).status,
      ).toBe(401);
      expect(
        (
          await fetch(endpoint, {
            method: "POST",
            headers: {
              "X-Poker-Token": "test-token",
              Origin: "https://evil.example",
            },
            body: JSON.stringify(snapshot),
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await fetch(endpoint, {
            method: "POST",
            headers: { "X-Poker-Token": "test-token" },
            body: JSON.stringify({ ...snapshot, pot: -1 }),
          })
        ).status,
      ).toBe(422);
      expect(
        (
          await fetch(endpoint, {
            method: "POST",
            headers: { "X-Poker-Token": "test-token" },
            body: JSON.stringify(snapshot),
          })
        ).status,
      ).toBe(200);
      expect((await fetch(endpoint, {method:'POST',
        headers:{'X-Poker-Token':'test-token',Origin:'chrome-extension://'+'a'.repeat(32)},
        body:JSON.stringify({...snapshot,sequence:2})})).status).toBe(200);
      expect((await fetch(endpoint, {method:'POST',
        headers:{Origin:'chrome-extension://'+'a'.repeat(32)},
        body:JSON.stringify({...snapshot,sequence:3})})).status).toBe(401);
      expect((await fetch(endpoint, {method:'POST',headers:{'X-Poker-Token':'test-token'},
        body:JSON.stringify({...snapshot,sequence:3,players:snapshot.players.map(p=>({...p,sittingOut:true}))})})).status).toBe(422);
      expect(bridge.state().snapshot.handId).toBe("123");
      expect(
        (
          await fetch(endpoint, {
            method: "POST",
            headers: { "X-Poker-Token": "test-token" },
            body: JSON.stringify(snapshot),
          })
        ).status,
      ).toBe(409);
      const post = async (sequence: number, observedActions: object[], handId="123") => {
        const response=await fetch(endpoint,{method:"POST",headers:{"X-Poker-Token":"test-token"},
          body:JSON.stringify({...snapshot,sequence,observedActions,handId})});
        expect(response.status).toBe(200);
        return bridge.state().snapshot.observedActions;
      };
      const call={seat:6,street:"preflop",action:"call",amount:.02};
      expect(await post(4,[call])).toEqual([call]);
      const firstReceipt=bridge.state().decisionReceivedAt;
      await new Promise(resolve=>setTimeout(resolve,12));
      expect(await post(5,[])).toEqual([call]);
      expect(bridge.state().receivedAt).toBeGreaterThan(firstReceipt);
      expect(bridge.state().decisionReceivedAt).toBe(firstReceipt);
      expect(await post(6,[],"124")).toEqual([]);
      expect(bridge.state().decisionReceivedAt).toBeGreaterThan(firstReceipt);
    } finally {
      await bridge.close();
    }
  });
});
