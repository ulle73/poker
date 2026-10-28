import { describe, expect, it } from "vitest";
import { readSiteTable, parseMoney } from "../src/live/reader";
const fixture = () => {
  document.body.innerHTML = `<div class="cash-table-view POKER_GAME_TYPE_HOLDEM"><div class="table table-6-players">
  <div class="player-area player-seat-6"><div class="table-player"><div class="player-nameplate"><div class="amount">1.25€</div></div><div class="cards-holder-other-hidden"><div class="card"></div><div class="card"></div></div></div><div class="player-bet"><div class="bet"><div class="amount">0.02€</div></div></div><div class="game-position"><div class="dealer"></div></div></div>
  <div class="player-area my-player player-seat-4"><div class="table-player my-player"><div class="player-nameplate"><div class="amount">3.99€</div></div><div class="cards-holder-hero"><div class="card"><span class="card-rank">Q</span><span class="card-suit">♥</span></div><div class="card"><img class="card-image" src="/cards/h2.svg"></div><div class="card" style="visibility:hidden"><span class="card-rank">5</span><span class="card-suit">♣</span></div></div></div><div class="player-bet"><div class="amount">0.02€</div></div></div>
  <div class="player-area player-seat-1"><div class="empty-seat">Tom</div></div>
  <div class="total-pot"><span class="total-pot-amount">0.04€</span></div><div class="community-cards"><div class="card pt-visibility-hidden"><span class="card-rank">5</span><span class="card-suit">♣</span></div></div>
  </div></div><div class="hand-id">#12606864673</div>`;
};
describe("Svenska Spel DOM reader", () => {
  it("parses money without inventing missing values or mixing currencies", () => {
    expect(parseMoney("1 234,56€")).toEqual({
      amount: 1234.56,
      currency: "EUR",
    });
    expect(parseMoney("0.02€")).toEqual({ amount: 0.02, currency: "EUR" });
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("Tid: 4")).toBeNull();
  });
  it("distinguishes occupied seats from six-seat layout and hidden placeholder cards", () => {
    fixture();
    const s = readSiteTable(document, 1, "test");
    expect(s?.players).toHaveLength(2);
    expect(s?.maxSeats).toBe(6);
    expect(s?.heroCards).toEqual(["Qh", "2h"]);
    expect(s?.board).toEqual([]);
    expect(s?.street).toBe("preflop");
    expect(s?.handId).toBe("12606864673");
    expect(s?.pot).toBe(0.04);
    expect(s?.players.find((p) => p.hero)?.position).toBe("BB");
    expect(s?.players.find((p) => !p.hero)?.position).toBe("BTN / SB");
  });
  it("suppresses inconsistent and mid-animation card states rather than guessing", () => {
    fixture();
    document.querySelector(".community-cards")!.innerHTML =
      '<div class="card"><span class="card-rank">Q</span><span class="card-suit">♥</span></div>';
    expect(readSiteTable(document, 2, "test")?.issues.length).toBeGreaterThan(
      0,
    );
    expect(readSiteTable(document, 2, "test")?.valid).toBe(false);
    document.querySelector(".hand-id")!.textContent = "";
    expect(readSiteTable(document, 3, "test")?.valid).toBe(false);
  });
});
