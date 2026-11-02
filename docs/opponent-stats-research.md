# VPIP/PFR: undersökning före implementation

Datum: 2026-11-02, Codex. **HTML-fält är ännu inte verifierade.**

## Vad användaren har uppgett

Användaren ser VPIP och PFR vid spelarna och vill undersöka om de finns i HTML
och kan förbättra rangeantaganden, exempelvis med ett spann på ±5–10 %.
Det är användarens observation; DOM-struktur, fältnamn och antal händer är inte
kontrollerade. Ingen statsavläsning eller rangeanpassning har implementerats.

## Faktisk åtkomstkontroll

- Chrome DevTools-anslutningen visade endast `about:blank`.
- Computer Use rapporterade att lokal webbläsaråtkomst är avstängd i Work.
- Läsning av det befintliga Edge-fönstret stoppades sedan av verktyget:
  aktuell browser-URL kunde inte identifieras tillräckligt säkert på Windows.
- Inga pokerhandlingar, säkerhets-/behörighetsändringar eller försök att kringgå
  stoppet utfördes. Cookies, inloggning och spelaridentifierare samlades inte in.
- Ingen slutsats får därför anges om var statistiken ligger i sajtens HTML,
  om tooltip/hover krävs eller om ett tillförlitligt antal händer finns där.

## Hur statistiken kan användas

[PokerTrackers officiella HUD-guide](https://docs.pokertracker.com/pt4/tutorials/the-hud/basic-hud-guide/)
beskriver VPIP som frivilligt deltagande med pengar preflop, PFR som
preflop-höjningar och handantal som underlag för statistiken. Det är
övergripande beteendefrekvenser, inte en unik lista över privata kort.

Föreslagen användning, ännu inte genomförd:

1. Utgå från en angiven strategimodell för spelarantal, position, stack och
   insatslinje. VPIP/PFR kan påverka en osäker fördelning över modeller för
   spelarens beteende, inte direkt bli ”de bästa X procenten händer”.
2. Ge små/okända stickprov låg vikt och dra uppskattningen mot grundmodellen.
   Tidsspann, format och positionsfördelning behöver stämma med sammanhanget.
3. Villkora rangern på faktiskt observerad limp, öppningshöjning, syn,
   återhöjning, sizing och senare handlingar. PFR 20 % innebär inte att varje
   observerad återhöjning innehåller de översta 20 % av kortkombinationerna.
4. Behåll positiva, viktade alternativ där evidensen är svag. En hård
   topplistegräns kan utesluta legitima händer eller göra gemensamma ranger
   oförenliga när kortblockering tillämpas.
5. Lös och jämför flera rimliga rangemodeller. Visa om rekommendationen är
   stabil eller ändras väsentligt. Anpassning till en uppskattad motståndare
   ska märkas som en modellberoende anpassning, separat från verifierad GTO.

Detta ersätter inte behovet av en validerad solver och korrekt historik.

## Om ±5–10

Använd i så fall **procentenheter**, uttryckligt märkt som ett manuellt
känslighetsspann. Det är inte automatiskt ett konfidensintervall och får inte
tillämpas som ett godtyckligt påslag på alla positioner och handlingar.

Osäkerheten i en frekvens beror på stickprovet. När korrekta antal möjligheter
och händelser finns kan ett intervall beräknas under en specificerad modell.
[NIST beskriver Wilson- och exakta binomialintervall](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm),
inklusive begränsningarna hos enkla symmetriska approximationer vid små stickprov.
Pokerdata från blandade positioner och förändrat beteende behöver fler
modellantaganden än oberoende försök med en konstant sannolikhet.

## Checklista när Edge-fliken kan läsas

- [ ] Verifiera VPIP/PFR-etiketter, värden och faktiska DOM-selektorer på bordet.
- [ ] Kontrollera om antal händer, möjligheter, period och andra definitioner
  finns i synlig HTML eller en vanlig statistikpanel/tooltip.
- [ ] Bind avläsningen till rätt plats och rätt nuvarande spelare; statistik
  får inte följa med till en ny person som tar samma stol.
- [ ] Skilj saknat värde från 0 %, hantera decimaltecken och avrundade procent.
- [ ] Spara anonymiserade HTML-fixtures och testa uppdatering, platsbyte och
  borttagen statistik. Samla endast de fält som behövs.
- [ ] Presentera ett konkret avläsnings- och modellförslag med verifierade
  sajtfakta innan denna undersökning blir en implementation.
