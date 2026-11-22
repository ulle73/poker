# Automatisk bordsläsare för Edge

Byggd 2026-11-05. Källkod i C:\dev\poker\src\extension och extension.

Aktuell status: byggd och enhetstestad, INTE installerad i användarens Edge.
Installation/åtkomst i InPrivate väntar på användarens uttryckliga godkännande.
Riktig omladdning/ny flik i Edge är därför ännu inte verifierad med tillägget.

Bygg från repot: npm run build:extension
Färdig mapp: C:\dev\poker\release\edge-live-reader

Efter godkännande:
1. Edge → edge://extensions → Utvecklarläge → Läs in okomprimerat.
2. Välj den färdiga mappen ovan.
3. Öppna tilläggets Detaljer och aktivera Tillåt i InPrivate om bordet körs privat.
4. Öppna tilläggets inställning. Kopiera parningskoden från Poker Advisor →
   Live · Edge → Teknisk anslutning och spara den en gång. Koden ska inte
   publiceras eller läggas i Git. Den ligger endast lokalt i tilläggets lagring.
5. En redan öppen pokerflik behöver laddas om en gång efter installationen.
   Därefter startar läsaren själv i nya flikar och efter omladdning.

Tillägget läser bara https://games-svenskaspel.onegameslink.com/poker/web/*.
Mottagaren är låst i koden till http://127.0.0.1:47832/ingest. Cookies skickas
inte. Tillägget gör inga spelhandlingar och begär inte cookies-, historik-,
debugger- eller all-webbplatsbehörighet. Lokal storage och åtkomst till
loopback behövs. Aktuell app måste köras. En aktiv bordsström åt gången.
Vid flera öppna bord behåller mottagaren den befintliga färska strömmen;
den andra läsaren väntar. Det är inte automatisk växling mellan flera bord.

Enhetstester verifierar transport, ursprungskontroll, parning, återförsök,
nya tabell-element efter lobby och avbrott. Detta ersätter inte verifiering
av den installerade extensionen med riktiga Edge-behörigheter.

Gränsen i själva strategin kvarstår: gratisleverantören täcker matchande
heads-up på turn och river. Flop, preflop och multiway saknar strategi.
Fler anslutningsfunktioner ändrar inte detta.
