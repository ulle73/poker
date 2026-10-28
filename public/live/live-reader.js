var PokerTableReader = (function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	// src/live/positions.ts
	var tails = {
		3: [],
		4: ["CO"],
		5: ["UTG", "CO"],
		6: [
			"UTG",
			"HJ",
			"CO"
		],
		7: [
			"UTG",
			"UTG+1",
			"HJ",
			"CO"
		],
		8: [
			"UTG",
			"UTG+1",
			"LJ",
			"HJ",
			"CO"
		],
		9: [
			"UTG",
			"UTG+1",
			"UTG+2",
			"LJ",
			"HJ",
			"CO"
		],
		10: [
			"UTG",
			"UTG+1",
			"UTG+2",
			"UTG+3",
			"LJ",
			"HJ",
			"CO"
		]
	};
	function seatPositions(seats, dealer, maxSeats) {
		const result = {};
		for (const seat of seats) result[seat] = "Okänd";
		if (dealer === null || !seats.includes(dealer) || new Set(seats).size !== seats.length || seats.length < 2 || seats.length > 10) return result;
		const clockwise = [...seats].sort((a, b) => (a - dealer + maxSeats) % maxSeats - (b - dealer + maxSeats) % maxSeats);
		const labels = seats.length === 2 ? ["BTN / SB", "BB"] : [
			"BTN",
			"SB",
			"BB",
			...tails[seats.length]
		];
		clockwise.forEach((seat, i) => {
			result[seat] = labels[i];
		});
		return result;
	}
	// src/live/hand-memory.ts
	var LiveHandMemory = class {
		hand = "";
		folded = /* @__PURE__ */ new Set();
		seenActive = /* @__PURE__ */ new Set();
		apply(snapshot) {
			if (snapshot.handId !== this.hand) {
				this.hand = snapshot.handId;
				this.folded.clear();
				this.seenActive.clear();
			}
			for (const p of snapshot.players) {
				if (p.inHand) this.seenActive.add(p.seat);
				if (p.folded && (this.seenActive.has(p.seat) || snapshot.street !== "preflop")) this.folded.add(p.seat);
			}
			return {
				...snapshot,
				players: snapshot.players.map((p) => this.folded.has(p.seat) ? {
					...p,
					folded: true,
					inHand: false
				} : p)
			};
		}
	};
	// src/live/reader.ts
	var SUIT = {
		"♠": "s",
		"♥": "h",
		"♦": "d",
		"♣": "c"
	};
	function parseMoney(value) {
		const match = value.replace(/\u00a0|\u202f/g, " ").trim().match(/^([\d\s]+(?:[.,]\d+)?)\s*(€|kr|SEK|EUR)$/i);
		if (!match) return null;
		const amount = Number(match[1].replace(/\s/g, "").replace(",", "."));
		return Number.isFinite(amount) && amount >= 0 ? {
			amount,
			currency: /€|EUR/i.test(match[2]) ? "EUR" : "SEK"
		} : null;
	}
	function visible(el) {
		if (!el) return false;
		for (let e = el; e; e = e.parentElement) {
			const style = getComputedStyle(e);
			if (e.hasAttribute("hidden") || e.getAttribute("aria-hidden") === "true" || /\bpt-(?:visibility-)?hidden\b/.test(e.className) || style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || style.opacity === "0") return false;
		}
		return true;
	}
	function readCards(zone) {
		if (!zone) return [];
		const result = [];
		for (const c of zone.querySelectorAll(".card")) {
			if (!visible(c)) continue;
			const rank = c.querySelector(".card-rank")?.textContent?.trim().toUpperCase().replace("10", "T");
			const suit = SUIT[c.querySelector(".card-suit")?.textContent?.trim() ?? ""];
			let value = rank && suit && /^[2-9TJQKA]$/.test(rank) ? rank + suit : null;
			if (!value) {
				const m = (c.querySelector(".card-image")?.getAttribute("src") ?? "").match(/\/([shdc])([2-9tjqka])\.svg(?:[?#]|$)/i);
				if (m) value = m[2].toUpperCase() + m[1].toLowerCase();
			}
			if (value) result.push(value);
		}
		return result;
	}
	var actionLabel = (text) => /fold|lägg/i.test(text) ? "fold" : /check|passa/i.test(text) ? "check" : /syna|call/i.test(text) ? "call" : /all.?in/i.test(text) ? "allin" : /höj|raise/i.test(text) ? "raise" : /bet|satsa/i.test(text) ? "bet" : "";
	function readSiteTable(doc, sequence, readerId) {
		const roots = [...doc.querySelectorAll(".cash-table-view")].filter(visible);
		if (roots.length !== 1) return null;
		const root = roots[0], issues = [];
		const readMoney = (e) => visible(e) ? parseMoney(e?.textContent ?? "") : null;
		const pot = readMoney(root.querySelector(".total-pot .total-pot-amount"));
		const currencies = new Set(pot ? [pot.currency] : []);
		const areas = [...root.querySelectorAll(".player-area")];
		const occupied = areas.filter((e) => visible(e.querySelector(".player-nameplate .amount")));
		const seat = (e) => Number(e.className.match(/\bplayer-seat-(\d+)\b/)?.[1]);
		const dealer = areas.find((e) => visible(e.querySelector(".game-position .dealer")));
		const dealerSeat = dealer ? seat(dealer) : null;
		const positions = seatPositions(occupied.map(seat), dealerSeat, Number(root.querySelector(".table")?.className.match(/table-(\d+)-players/)?.[1] ?? 0));
		const players = occupied.map((e) => {
			const stack = readMoney(e.querySelector(".player-nameplate .amount"));
			const betElement = e.querySelector(".player-bet .amount");
			const bet = readMoney(betElement);
			if (stack) currencies.add(stack.currency);
			if (bet) currencies.add(bet.currency);
			const foldBadge = !![...e.querySelectorAll(".player-action.action-fold")].find(visible);
			const cards = [...e.querySelectorAll(".cards-holder-hero .card,.cards-holder-other-hidden .card,.cards-holder-other .card")].filter(visible);
			const folded = foldBadge && cards.length < 2;
			if (foldBadge && cards.length >= 2) issues.push("Foldanimation pågår; väntar på stabilt deltagande.");
			const id = seat(e);
			return {
				seat: id,
				hero: e.classList.contains("my-player"),
				position: positions[id],
				stack: stack?.amount ?? null,
				bet: bet?.amount ?? (betElement && visible(betElement) && betElement.textContent?.trim() ? null : 0),
				folded,
				inHand: cards.length >= 2 && !folded
			};
		});
		const heroCards = readCards(occupied.find((e) => e.classList.contains("my-player"))?.querySelector(".cards-holder-hero") ?? null);
		const board = readCards(root.querySelector(".community-cards"));
		const handId = doc.querySelector(".hand-id")?.textContent?.replace(/[^\d]/g, "") ?? "";
		const availableActions = [...doc.querySelectorAll("button,div,span")].filter((e) => !e.children.length && visible(e) && !e.closest(".player-area") && /^(Fold|Check|Syna(?:\s|$)|Call(?:\s|$)|Höj Till|Höj$|Bet$|Satsa)/i.test(e.textContent?.trim() ?? "")).map((e) => e.textContent.trim().slice(0, 80));
		const heroTurn = availableActions.some((a) => /^Fold$/i.test(a)) && availableActions.some((a) => /^(Check|Syna|Call|Höj|Bet|Satsa)/i.test(a));
		if (!handId) issues.push("Handnummer saknas.");
		if (!pot) issues.push("Potten kan inte läsas.");
		if (currencies.size !== 1) issues.push("Valutan saknas eller skiljer sig mellan fält.");
		if (players.filter((p) => p.hero).length !== 1) issues.push("Ditt säte kan inte identifieras.");
		if (players.some((p) => p.stack === null || p.bet === null || !Number.isInteger(p.seat))) issues.push("Stack eller insats saknas.");
		if (![
			0,
			3,
			4,
			5
		].includes(board.length)) issues.push("Kortanimation eller ofullständig bräda.");
		if ((/* @__PURE__ */ new Set([...board, ...heroCards])).size !== board.length + heroCards.length) issues.push("Överlappande kort: väntar på en stabil bild.");
		if (heroCards.length !== 2) issues.push("Dina två kort är inte synliga.");
		if (!root.classList.contains("POKER_GAME_TYPE_HOLDEM")) issues.push("Endast Texas Hold’em stöds.");
		const street = board.length === 0 ? "preflop" : board.length === 3 ? "flop" : board.length === 4 ? "turn" : board.length === 5 ? "river" : "unknown";
		const observedActions = occupied.flatMap((e) => {
			const action = actionLabel([...e.querySelectorAll(".player-action .action-text")].find(visible)?.textContent ?? "");
			return action ? [{
				seat: seat(e),
				street,
				action,
				amount: players.find((p) => p.seat === seat(e))?.bet ?? null
			}] : [];
		});
		return {
			version: 1,
			source: "svenskaspel-dom",
			readerId,
			sequence,
			handId,
			capturedAt: Date.now(),
			currency: [...currencies][0] ?? "UNKNOWN",
			maxSeats: Number(root.querySelector(".table")?.className.match(/table-(\d+)-players/)?.[1] ?? 0),
			players,
			heroCards,
			board,
			pot: pot?.amount ?? null,
			street,
			dealerSeat,
			heroTurn,
			availableActions,
			valid: issues.length === 0,
			issues,
			observedActions
		};
	}
	function connect(options) {
		if (location.hostname !== "games-svenskaspel.onegameslink.com") throw new Error("Läsaren är begränsad till Svenska Spels pokerklient.");
		const url = new URL(options.endpoint);
		if (url.hostname !== "127.0.0.1" || url.protocol !== "http:" || url.pathname !== "/ingest") throw new Error("Mottagaren måste vara den lokala appen.");
		const owner = window;
		owner.__pokerAdvisorLiveStop?.();
		const readerId = crypto.randomUUID();
		const memory = new LiveHandMemory();
		let sequence = 0, stopped = false, pending = false, failed = 0, lastSent = 0;
		let debounce;
		const tick = async () => {
			if (stopped || pending || Date.now() - lastSent < 180) return;
			const capture = readSiteTable(document, ++sequence, readerId);
			if (!capture) return;
			const snapshot = memory.apply(capture);
			pending = true;
			lastSent = Date.now();
			try {
				const response = await fetch(options.endpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Poker-Token": options.token
					},
					body: JSON.stringify(snapshot),
					signal: AbortSignal.timeout(2e3),
					credentials: "omit",
					cache: "no-store"
				});
				if (response.status === 422 || response.status === 409) {
					owner.__pokerAdvisorLiveStatus = {
						ok: false,
						error: `bridge ${response.status}`,
						waitingForValidCapture: true
					};
					failed = 0;
					return;
				}
				if (!response.ok) throw new Error(`bridge ${response.status}`);
				owner.__pokerAdvisorLiveStatus = {
					ok: true,
					handId: snapshot.handId,
					...await response.json()
				};
				failed = 0;
			} catch (e) {
				owner.__pokerAdvisorLiveStatus = {
					ok: false,
					error: String(e)
				};
				if (++failed >= 30) stop();
			} finally {
				pending = false;
			}
		};
		const observer = new MutationObserver(() => {
			clearTimeout(debounce);
			debounce = setTimeout(tick, 80);
		});
		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			characterData: true
		});
		const heartbeat = setInterval(tick, 600);
		const stop = () => {
			stopped = true;
			observer.disconnect();
			clearInterval(heartbeat);
			clearTimeout(debounce);
			delete owner.__pokerAdvisorLiveStop;
		};
		owner.__pokerAdvisorLiveStop = stop;
		tick();
		return {
			readerId,
			endpoint: url.origin,
			mode: "read-only",
			stopsOnReload: true
		};
	}
	exports.connect = connect;
	exports.parseMoney = parseMoney;
	exports.readSiteTable = readSiteTable;
	return exports;
})({});
