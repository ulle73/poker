// Hand offsets count observed changes of hand, never the difference between IDs.
// 0 requests no extra delay. On Svenska Spel the hero's confirmed exit or a
// confirmed new deal is still required before any review is released.
const HAND_REVIEW_LAG = 3;

function createHandReview(lag = HAND_REVIEW_LAG) {
  if (!Number.isSafeInteger(lag) || lag < 0 || lag > 100) throw Error("Ogiltig handfördröjning.");
  let reader, current, opening, lastReceipt = 0, lastKey = "";
  const waiting = [], released = [];
  function release(hand) {
    if (released.some(h => h.id === hand.id) || !hand.frames.some(f => f.valid && f.heroTurn)) return;
    released.unshift(hand);
    if (released.length > 6) released.pop();
  }
  function observe(s, now) {
    if (s.readerId !== reader || now - lastReceipt >= 5000) {
      waiting.length = released.length = 0;
      current = null;
      opening = null;
      reader = s.readerId;
      lastKey = "";
    }
    lastReceipt = now;
    if (now - s.capturedAt > 4000 || s.capturedAt - now > 500) return;
    if (current?.id !== s.handId) {
      if (current && BigInt(s.handId) <= BigInt(current.id)) return;
      // Animations can briefly combine a new number with the old board.
      // Only a credible new preflop deal confirms a boundary.
      const dealt = s.street === "preflop" && !s.board.length && s.valid;
      if (!s.valid || (current && !dealt)) {
        if (s.street === "preflop" && !s.board.length && !s.valid) opening = s;
        return;
      }
      if (current) waiting.push(current);
      if (waiting.length >= Math.max(1,lag)) release(waiting.shift());
      const prefix = opening?.handId === s.handId ? [opening] : [];
      current = {id:s.handId, reader:s.readerId, frames:prefix, overflow:false};
      opening = null;
      lastKey = "";
    }
    const {capturedAt, sequence, ...facts} = s;
    const key = JSON.stringify(facts);
    if (key === lastKey || current.overflow || current.finished) return;
    lastKey = key;
    if (current.frames.length >= 200) { current.overflow = true; return; }
    current.frames.push(s);
    if (lag === 0 && !s.heroTurn && !s.availableActions.length) {
      const hero = s.players.find(p => p.hero);
      if (hero?.folded && !hero.inHand && s.observedActions.some(a => a.seat === hero.seat && a.action === "fold" && a.street === s.street)) {
        current.finished = true;
        release(current);
      }
    }
  }
  return {
    observe,
    status: () => ({lag, completed:waiting.length, hands:released.map(h => h.id), reader}),
    get: (id, owner) => released.find(h => h.id === id && h.reader === owner),
  };
}
module.exports = {createHandReview, HAND_REVIEW_LAG};
