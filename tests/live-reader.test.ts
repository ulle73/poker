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
  it.each([["€","EUR"],[" kr","SEK"],[" SEK","SEK"]])("reads a whole table using %s", (symbol,currency)=>{
    fixture();
    for(const e of document.querySelectorAll(".amount,.total-pot-amount"))
      e.textContent=e.textContent!.replace("€",symbol);
    const s=readSiteTable(document,1,"currency");
    expect(s).toMatchObject({valid:true,currency,pot:.04});
    expect(s!.players.find(p=>p.hero)).toMatchObject({stack:3.99,bet:.02});
  });
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

it('treats a visible sit-out seat without cards or chips as occupied but not an unknown participant', () => {
  fixture();
  const table = document.querySelector('.table')!;
  table.insertAdjacentHTML('beforeend', '<div class="player-area player-seat-2"><div class="player-nameplate"><div class="amount">0.64€</div></div><div class="player-left-wing-color player-sit-out"></div></div>');
  const s = readSiteTable(document, 1, 'sitout')!;
  expect(s.players.find(p => p.seat === 2)).toMatchObject({sittingOut: true, inHand: false, folded: false});
  expect(s.players).toHaveLength(3);
  expect(s.players.find(p => p.hero)?.position).toBe('BB');
});
it('does not remove a sit-out-marked player who still has cards or a live bet', () => {
  fixture();
  document.querySelector('.player-seat-6')!.insertAdjacentHTML('beforeend', '<div class="player-sit-out"></div>');
  const s = readSiteTable(document, 1, 'sitout')!;
  expect(s.players.find(p => p.seat === 6)).toMatchObject({sittingOut: false, inHand: true});
});
it('does not guess sit-out status from missing cards alone or hidden markers', () => {
  fixture();
  document.querySelector('.table')!.insertAdjacentHTML('beforeend', '<div class="player-area player-seat-2"><div class="player-nameplate"><div class="amount">0.64€</div></div><div class="player-sit-out" hidden></div></div>');
  const s = readSiteTable(document, 1, 'sitout')!;
  expect(s.players.find(p => p.seat === 2)).toMatchObject({sittingOut: false, inHand: false, folded: false});
});

it('recognizes 6+ explicitly while keeping cards below six invalid', () => {
 fixture();
 const root=document.querySelector('.cash-table-view')!;
 root.classList.replace('POKER_GAME_TYPE_HOLDEM','POKER_GAME_TYPE_SIX_PLUS_HOLDEM');
 document.querySelector('.cards-holder-hero')!.innerHTML='<div class="card"><span class="card-rank">A</span><span class="card-suit">♥</span></div><div class="card"><span class="card-rank">9</span><span class="card-suit">♣</span></div>';
 expect(readSiteTable(document,1,'six')).toMatchObject({variant:'sixplus',valid:true});
 document.querySelector('.cards-holder-hero .card-rank')!.textContent='2';
 expect(readSiteTable(document,2,'six')?.valid).toBe(false);
});
