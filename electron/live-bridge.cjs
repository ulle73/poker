const http = require("node:http");
const crypto = require("node:crypto");
const SITE = "https://games-svenskaspel.onegameslink.com";
function validSnapshot(s) {
  if (
    !s ||
    s.version !== 1 ||
    (s.variant !== undefined && !["holdem", "sixplus", "unknown"].includes(s.variant)) ||
    s.source !== "svenskaspel-dom" ||
    typeof s.readerId !== "string" ||
    s.readerId.length > 80 ||
    !Number.isSafeInteger(s.sequence) ||
    s.sequence < 1 ||
    typeof s.handId !== "string" ||
    !/^\d{1,30}$/.test(s.handId)
  )
    return false;
  if (
    !Number.isFinite(s.capturedAt) ||
    Math.abs(Date.now() - s.capturedAt) > 10000 ||
    !["EUR", "SEK", "UNKNOWN"].includes(s.currency) ||
    !Number.isInteger(s.maxSeats) ||
    s.maxSeats < 2 ||
    s.maxSeats > 10
  )
    return false;
  const cards = (a) =>
    Array.isArray(a) &&
    a.length <= 5 &&
    a.every((c) => typeof c === "string" && /^[2-9TJQKA][shdc]$/.test(c));
  const amount = (n) =>
    n === null || (Number.isFinite(n) && n >= 0 && n <= 1e8);
  if (
    !cards(s.heroCards) ||
    s.heroCards.length > 2 ||
    !cards(s.board) ||
    !amount(s.pot) ||
    !Array.isArray(s.players) ||
    s.players.length > 10 ||
    s.players.length < 1
  )
    return false;
  if (
    !s.players.every(
      (p) =>
        Number.isInteger(p.seat) &&
        p.seat >= 1 &&
        p.seat <= 10 &&
        typeof p.hero === "boolean" &&
        typeof p.folded === "boolean" &&
        typeof p.inHand === "boolean" &&
        (p.sittingOut === undefined || (typeof p.sittingOut === "boolean" && (!p.sittingOut || (!p.inHand && p.bet === 0)))) &&
        (p.shownCards === undefined || (!p.hero && cards(p.shownCards) && p.shownCards.length <= 2)) &&
        amount(p.stack) &&
        amount(p.bet) &&
        typeof p.position === "string" &&
        p.position.length < 30,
    )
  )
    return false;
  if (
    new Set(s.players.map((p) => p.seat)).size !== s.players.length ||
    s.players.filter((p) => p.hero).length !== 1
  )
    return false;
  if (
    !Array.isArray(s.issues) ||
    s.issues.length > 20 ||
    s.issues.some((x) => typeof x !== "string" || x.length > 250) ||
    typeof s.valid !== "boolean" ||
    !["preflop", "flop", "turn", "river", "unknown"].includes(s.street)
  )
    return false;
  if (
    !Array.isArray(s.observedActions) ||
    s.observedActions.length > 10 ||
    s.observedActions.some(
      (a) =>
        !Number.isInteger(a.seat) ||
        !["fold", "check", "call", "bet", "raise", "allin"].includes(
          a.action,
        ) ||
        typeof a.street !== "string" ||
        !amount(a.amount),
    )
  )
    return false;
  if (
    s.valid &&
    (s.heroCards.length !== 2 ||
      ![0, 3, 4, 5].includes(s.board.length) ||
      new Set([...s.heroCards, ...s.board, ...s.players.flatMap(p => p.shownCards ?? [])]).size !==
        s.heroCards.length + s.board.length + s.players.reduce((n,p) => n + (p.shownCards?.length ?? 0), 0) ||
      s.issues.length ||
      s.pot === null ||
      s.currency === "UNKNOWN")
  )
    return false;
  return true;
}
async function createLiveBridge({
  port = 47832,
  token = crypto.randomBytes(24).toString("hex"),
} = {}) {
  let snapshot = null,
    receivedAt = 0,
    connectedAt = 0,
    history = [],
    reader = null,
    lastSequence = 0,
    lastHand = null;
  const events = new Set();
  const review = require("./hand-review.cjs").createHandReview();
  let actionState = "";
  let decisionReceivedAt = 0;
  const decisionActions = new Map();
  let revision = 0;
  let lastIssue = null;
  const reportIssue = message => { lastIssue = { message, at: Date.now() }; };
  const subscribers = new Set();
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (origin && origin !== SITE && !/^chrome-extension:\/\/[a-p]{32}$/.test(origin)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Poker-Token",
        "Access-Control-Allow-Private-Network": "true",
      });
      res.end();
      return;
    }
    const supplied = String(req.headers["x-poker-token"] ?? "");
    if (
      Buffer.byteLength(supplied) !== Buffer.byteLength(token) ||
      !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(token))
    ) {
      if (req.url === "/ingest" && /^chrome-extension:\/\/[a-p]{32}$/.test(origin ?? ""))
        reportIssue("Edge kontaktar appen med en ogiltig parningskod. Spara appens kod i bordsläsarens inställningar.");
      res.writeHead(401);
      res.end();
      return;
    }
    if (req.method !== "POST" || req.url !== "/ingest") {
      res.writeHead(404);
      res.end();
      return;
    }
    let body = "";
    try {
      for await (const part of req) {
        body += part.toString("utf8");
        if (Buffer.byteLength(body) > 32768) {
          res.writeHead(413);
          res.end();
          return;
        }
      }
      const data = JSON.parse(body);
      if (!validSnapshot(data)) {
        reportIssue("Edge är anslutet men bordets avläsning kunde inte tolkas. Kontrollera att rätt bord är öppet och att läsaren är uppdaterad.");
        res.writeHead(422);
        res.end();
        return;
      }
      if (
        reader &&
        data.readerId !== reader &&
        Date.now() - receivedAt < 5000
      ) {
        res.writeHead(409);
        res.end();
        return;
      }
      if (data.readerId === reader && data.sequence <= lastSequence) {
        res.writeHead(409);
        res.end();
        return;
      }
      const now = Date.now();
      if (!connectedAt) connectedAt = now;
      const stateKey = JSON.stringify([data.readerId, data.handId, data.street, data.variant,
        data.board, data.heroCards, data.players, data.pot, data.currency, data.dealerSeat,
        data.availableActions, data.heroTurn, data.valid]);
      if (stateKey !== actionState || now - receivedAt >= 3000 ||
          (snapshot && data.capturedAt - snapshot.capturedAt >= 4000)) {
        actionState = stateKey;
        decisionReceivedAt = now;
        decisionActions.clear();
      }
      if (data.readerId !== reader || data.handId !== lastHand) {
        history = [];
        events.clear();
      }
      for (const a of data.observedActions) {
        const key = JSON.stringify(a);
        if (data.valid && a.street === data.street && !decisionActions.has(key)) {
          decisionActions.set(key, a);
          decisionReceivedAt = now;
        }
        if (!events.has(key)) {
          events.add(key);
          history.push(a);
        }
      }
      history = history.slice(-200);
      reader = data.readerId;
      lastHand = data.handId;
      lastSequence = data.sequence;
      // A fading action label changes the DOM but does not undo an observed bet.
      snapshot = { ...data, observedActions: [...decisionActions.values()] };
      review.observe(snapshot, now);
      lastIssue = null;
      receivedAt = now;
      revision++;
      for (const notify of subscribers) notify();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, sequence: lastSequence, receivedAt }));
    } catch {
      if (!res.headersSent) res.writeHead(400);
      res.end();
    }
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  server.unref();
  const actualPort = server.address().port;
  return {
    port: actualPort,
    token,
    reviewedHand: review.get,
    waitForChange(after, signal) {
      if (after !== revision || signal?.aborted) return Promise.resolve();
      return new Promise(resolve => {
        const notify = () => {
          clearTimeout(timer);
          subscribers.delete(notify);
          signal?.removeEventListener("abort", notify);
          resolve();
        };
        const timer = setTimeout(notify, 1200);
        subscribers.add(notify);
        signal?.addEventListener("abort", notify, {once: true});
      });
    },
    state: () => ({
      revision,
      review: review.status(),
      readerIssue: lastIssue,
      available: true,
      endpoint: `http://127.0.0.1:${actualPort}/ingest`,
      token,
      receivedAt,
      decisionReceivedAt,
      connectedAt,
      snapshot,
      history,
    }),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
module.exports = { createLiveBridge, validSnapshot };
