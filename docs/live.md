# Liveanslutning 1.4

Avläsning, bordspositioner och lokal showdown-equity hanterar 2–10 spelare. Version 1.3 lägger till en automatisk MCCFR-beslutsmotor på alla gator. Den har inte klarat strategikvalitetsgranskningen och visas bara som experiment efter aktivt val. Den heltäckande tillförlitliga beslutsmotorn är inte färdig; se [kvalitetsrapporten](decision-engine.md). Avläsningen är oförändrad.

Välj **Live · Edge** i Windows-appen. Den aktuella Svenska Spel-fliken har fått en läsande DOM-observer genom utvecklaranslutningen. Den skickar en begränsad snapshot till appen på `127.0.0.1:47832`, med en lokal parningskod. Inga pokerhandlingar utförs. Ingen extension har installerats.

Observern stannar vid omladdning, stängd flik eller 30 misslyckade överföringar. Anslutningen är därför sessionsbunden. Appens start och en omladdad pokerflik återansluter ännu inte automatiskt. Detta är kvarvarande produktarbete, inte en färdig permanent browserintegration. Samma lokala parningskod återanvänds vid appomstart; stäng den gamla appinstansen först.

Kort, pott, valuta, stackar, synliga insatser, dealer och turknappar avläses. Sex bordssäten och två deltagare hålls isär. Motståndares namn, cookies, inloggning, lobbybalans och bilder skickas inte. Historiken innehåller bara observerade synliga handlingar sedan anslutningen och kan missa händelser under animationer.

## Strategi

Ranger fylls automatiskt med alla lagliga händer och kan ersättas per spelare. Det är ett uniformt modellantagande, inte en härledd motståndarrange. Context behåller observerad blind, betökningar och handlingar men uppdaterar ännu inte ranger efter varje handling. Den snabba MCCFR-providern är uttryckligen experimentell och spärrad som standard.

En separat DCFR-provider kan kvalitetsmärka ett matchat heads-up-träd på turn eller river vid bekräftad egen tur samt checklinje eller första bet/all-in från motståndaren. Två deltagare kan finnas kvar även vid ett större bord. Andra lägen går genom den experimentella providern. Automatiska fulla ranger accepteras nu korrekt även med offsuit-notation. Belopp behåller EUR/SEK. Blinden lärs från trovärdiga observerade blindposter; annars används ett synligt modellantagande på 0,02. Detta är ingen verifiering av sajtens okända verkliga blind.

Modellen räknar tidigare pott som totalpott minus aktuella synliga insatser. Tidigare okända sidopotter behandlas som gemensam huvudpott och anges som begränsning. HU-providern använder effektiv stack vid turn-/riverstart. Innan ett sådant träd får kvalitetsmärkas kontrolleras alla vägar mot heltalsmarker, antagen/observerad blind, höjningsrätt, obligatoriska check/fold/call-handlingar och stackar. Turn omfattar varje tillåtet riverkort. Matchning av aktuella handlingsknappar kontrolleras separat.

Färskhet kräver mottagning inom tre sekunder och capture inom fyra. Hand, kort, valuta, belopp, position, tur och giltighet binder lösningen till snapshoten. Ändringar släcker tidigare råd. Sena workerresultat avvisas.

## Verifiering

- Riktig Edge-flik: kort, bräda, EUR, pott, två deltagare på sex säten, turknappar och kvitterade snapshots observerade.
- Native test: autentiserad loopback → livepanel → riktig WASM → EUR-rekommendation. Ogiltig och för gammal snapshot släcker rådet; 1440/390 px utan overflow.
- Version 1.3: samtliga gator med 2, 3, 6 och 10 spelare genom riktiga workers; experimentläget är avstängt som standard; kvalitetskontrollerad riveruppgradering fungerar. Tester av funktion är inte bevis för strategikvalitet i breda multiway-lägen.
- Version 1.4: automatisk fullrange-turn ger verifierat råd i den riktiga appen även med experimentläget avstängt. Separat handvärderare och best-response-kontroll matchar ett mindre turnträds EV och felmått. Resursgränser och kontroll av alla obligatoriska handlingar gäller innan kvalitetsmärkning.
- Inga pokerhandlingar utfördes under testningen. Full handslinga med verkliga rangeantaganden och faktiska live-råd har inte verifierats mot en full handhistorik.

Dokumentation: [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [cross-origin requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests), [Edge sideloading](https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading). Permanent MV3-tillägg är ett senare steg; aktuell session använder DOM-observern.
