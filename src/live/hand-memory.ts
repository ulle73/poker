import type { LiveSnapshot } from "./types";
// Retain only facts actually observed in this document, never fabricate earlier folds.
export class LiveHandMemory {
  private hand = "";
  private folded = new Set<number>();
  private seenActive = new Set<number>();
  apply(snapshot: LiveSnapshot): LiveSnapshot {
    if (snapshot.handId !== this.hand) {
      this.hand = snapshot.handId;
      this.folded.clear();
      this.seenActive.clear();
    }
    for (const p of snapshot.players) {
      if (p.inHand) this.seenActive.add(p.seat);
      if (
        p.folded &&
        (this.seenActive.has(p.seat) || snapshot.street !== "preflop")
      )
        this.folded.add(p.seat);
    }
    return {
      ...snapshot,
      players: snapshot.players.map((p) =>
        this.folded.has(p.seat) ? { ...p, folded: true, inHand: false } : p,
      ),
    };
  }
}
