# Automatisk bordsläsare för Edge

Byggd 2026-11-05. Källkod i C:\dev\poker\src\extension och extension.

Aktuell status: vanligt NLHE-bord verifierat 2026-11-05, hand 12625047115
i både klient och app. Sex aktiva preflop gav korrekt multiway-avslag, inte
ett verifierat strategiråd. Initialt saknades överföring; efter en diagnostisk
transportkontroll återkom automatiska uppdateringar. Orsaken till den initiala
fördröjningen är inte fastställd. Ingen extra observer/sensor anslöts.

Den faktiskt laddade content.js i Edge saknar variantmetadata och skiljer
sig från 1.1.0 på disk. Användarens omladdningsbesked räcker alltså inte som
bevis för att nya koden körs. Vanligt NLHE fungerar via äldre snapshotkontrakt;
ny 6+-metadata är ännu inte verifierad i installerad runtime.

Historik: installerad, tillåten i InPrivate och parad. Automatisk
överföring verifierad 2026-11-05 i en ny riktig pokerflik utan manuell
sensorinjektion. App och klient visade samma handnummer och färska data.
Det verifierade bordet var 6+ Hold’em; då saknades den nya 6+-providern.
Version 1.1.0 skickar nu explicit spelvariant. Användaren bekräftade omladdning
av både tillägg och pokerflik. Den nya fliken visar ”Söker efter ett spel …”;
en aktuell riktig hand med 1.1.0 är därför ännu inte verifierad. Den äldre
kontrollen bevisar anslutning, inte aktuell strategikvalitet. Installationshinder
är historik; interna Edge-sidor är fortfarande spärrade för datorstyrningen.
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

Gränsen i själva strategin: NLHE täcker matchande heads-up på turn och river;
6+ endast matchande heads-up på river. Flop, preflop och multiway saknar strategi.
Fler anslutningsfunktioner ändrar inte detta.


