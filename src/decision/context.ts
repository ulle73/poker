import type { LiveSnapshot } from "../live/types";
import { prepareDecision, observedBlind, type DecisionFacts } from "./adapter";
/** Inference belongs to the decision layer. Capture and card recognition are untouched. */
export class DecisionContext {
  private previous: LiveSnapshot | null = null;
  private blind: number | undefined;
  private fullRaise: number | undefined;
  private acted: Record<number, number> = {};
  private events = new Set<string>();
  private ranges: Record<number, string> = {};
  private revision = 0;
  observe(s: LiveSnapshot): void {
    if (!s.valid) return;
    const prev = this.previous,
      newHand =
        !prev || prev.handId !== s.handId || prev.readerId !== s.readerId,
      newStreet = newHand || prev!.street !== s.street;
    if (newHand) {
      this.blind = undefined;
      this.ranges = {};
      this.revision++;
    }
    if (newStreet) {
      this.fullRaise = undefined;
      this.acted = {};
      this.events.clear();
      for (const a of s.observedActions) this.events.add(JSON.stringify(a));
    }
    if (!this.blind) this.blind = observedBlind(s);
    if (!newStreet && prev) {
      const before = Math.max(...prev.players.map((p) => p.bet ?? 0)),
        after = Math.max(...s.players.map((p) => p.bet ?? 0)),
        increase = Math.round((after - before) / 0.01);
      if (increase >= Math.max(this.fullRaise ?? this.blind ?? 1, 1)) {
        this.fullRaise = increase;
      }
    }
    if (!newStreet)
      for (const a of s.observedActions) {
        const id = JSON.stringify(a);
        if (this.events.has(id)) continue;
        this.events.add(id);
        if (a.street !== s.street || a.action === "fold") continue;
        const p = s.players.find((p) => p.seat === a.seat);
        if (!p || p.bet === null) continue;
        this.acted[a.seat] = Math.round(p.bet / 0.01);
      }
    this.previous = s;
  }
  setRange(seat: number, range: string): void {
    if (this.ranges[seat] !== range) {
      this.ranges[seat] = range;
      this.revision++;
    }
  }
  facts(): DecisionFacts {
    return {
      minBet: this.blind,
      lastFullRaise: this.fullRaise,
      actedAt: { ...this.acted },
      ranges: { ...this.ranges },
      rangeRevision: this.revision,
      notes: [
        "Dolda händer profileras inte som kända fakta. Ranger utan observerad strategilikelihood är ofiltrerade.",
      ],
    };
  }
  prepare(s: LiveSnapshot) {
    this.observe(s);
    return prepareDecision(s, this.facts());
  }
  get rangeRevision() {
    return this.revision;
  }
}
