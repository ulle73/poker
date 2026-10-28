# Liveanslutning 1.2

Avläsning, bordspositioner och lokal showdown-equity hanterar 2–10 spelare. Observerade folds behålls under handen. Två kvarvarande aktiva spelare kan analyseras i en heads-up-modell även på större bord, förutsatt bekräftade deltagare och en stödjad riverlinje. Den heltäckande automatiska beslutsmotorn är inte färdig; se [multiway-arbetet](multiway-research.md).

Välj **Live · Edge** i Windows-appen. Den aktuella Svenska Spel-fliken har fått en läsande DOM-observer genom utvecklaranslutningen. Den skickar en begränsad snapshot till appen på `127.0.0.1:47832`, med en lokal parningskod. Inga pokerhandlingar utförs. Ingen extension har installerats.

Observern stannar vid omladdning, stängd flik eller 30 misslyckade överföringar. Anslutningen är därför sessionsbunden. Appens start och en omladdad pokerflik återansluter ännu inte automatiskt. Detta är kvarvarande produktarbete, inte en färdig permanent browserintegration. Samma lokala parningskod återanvänds vid appomstart; stäng den gamla appinstansen först.

Kort, pott, valuta, stackar, synliga insatser, dealer och turknappar avläses. Sex bordssäten och två deltagare hålls isär. Motståndares namn, cookies, inloggning, lobbybalans och bilder skickas inte. Historiken innehåller bara observerade synliga handlingar sedan anslutningen och kan missa händelser under animationer.

## Strategi

Ange två **antagna ranger vid riverstart**. De är modellantaganden som användaren ansvarar för; inga motståndarranger hittas på. Rådet är en riktig DCFR-strategi villkorad på dessa ranger, valt träd och ingen rake. Det är ingen fullständig lösning av den observerade handen från preflop.

Stöder två deltagare, river, bekräftad egen tur samt checklinje eller en första bet/all-in från motståndaren. Båda spelarnas synliga riverinsatser, andra gator eller fler deltagare stoppar rådet. Belopp behåller EUR/SEK; blindstorlek antas aldrig.

Modellen räknar riverstartpotten som totalpott minus aktuella synliga insatser. Detta överensstämde med observerade blinds och insatsändringar, men en komplett separat verifiering av alla sajtens sidepot-/uncalled-betfall återstår. Effektiv stack beräknas vid riverstart. Överflödiga marker hos den större stacken ingår inte i solvern. Trädet innehåller inga sajtens exakta minraise-/chipavrundningsregler; sizing är modellstorlekar och måste granskas mot klientens lagliga handlingar.

Färskhet kräver mottagning inom tre sekunder och capture inom fyra. Hand, kort, valuta, belopp, position, tur och giltighet binder lösningen till snapshoten. Ändringar släcker tidigare råd. Sena workerresultat avvisas.

## Verifiering

- Riktig Edge-flik: kort, bräda, EUR, pott, två deltagare på sex säten, turknappar och kvitterade snapshots observerade.
- Native test: autentiserad loopback → livepanel → riktig WASM → EUR-rekommendation. Ogiltig och för gammal snapshot släcker rådet; 1440/390 px utan overflow.
- Inga pokerhandlingar utfördes under testningen. Full handslinga med verkliga rangeantaganden och faktiska live-råd har inte verifierats mot en full handhistorik.

Dokumentation: [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [cross-origin requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests), [Edge sideloading](https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading). Permanent MV3-tillägg är ett senare steg; aktuell session använder DOM-observern.
