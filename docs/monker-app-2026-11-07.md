# Monker Free ansluten till Windows-appen

2026-11-07, Europe/Stockholm. Branch `codex/free-solver-providers`.

## Vad som fungerar nu

Monker Free10114 är installerad lokalt och registrerad som en faktisk
`DecisionProvider` för vanlig NLHE med **3–6 aktiva spelare på turn och river**.
Appen kör nu den ursprungliga numeriska kärnan på aktuella ranger och det
matchande begränsade bettingträdet. Den återanvänder Java-process och korttabell,
men börjar varje ny modell med nya regrets och ny medelstrategi.

Din förvalda Monker-range är topp50 % med viktad massa663/1326 före blockers.
Den visas i rangefältet och kan ändras. Tomma motståndarranger är fulla lagliga
52-kortsranger; de kapas inte utifrån hjältekorten. Explicita vikter bevaras.
Det är en angiven startprior, inte en härledd GTO-prefloprange eller automatisk
rangeuppdatering från hela den tidigare handen.

**Nytt användarbeslut:** användaren accepterade2,1 % och fick därefter välja
mellan enbart oberoende verifierade råd och Monkers beräknade råd med tydlig
märkning när felmått saknas. Svaret var ”välj du vad du anser är bäst”. Jag
valde den senare möjligheten för den versionsbundna Monkerkällan. Appen visar
då **”Monker · felgräns ej verifierad”**, uppmätt fel **”Okänt”**, samt att2,1 %
är ett mål och att resultatet inte är verifierad GTO. Detta är mitt val under
användarens delegation, inte ett uttryckligt menyval från användaren.

Den gamla egna MCCFR-approximationen är fortfarande blockerad. Om ett faktiskt
exakt Monkermått kan beräknas men överskrider2,1 %, visas inget godkänt råd för
den lösningen. Historisk CLI-standard i den fristående granskaren är fortsatt
2 % NashConv för reproduktion; appens Monkergräns är explicit2,1 % maximal
ensidig EV-förbättring per spelare. HU-gränsen2 % och6+-gränsen0,2 % är oförändrade.

## Verkligt genomförda funktionstester

Den installerade tjänsten kördes med topp50 % för hjälten och fulla
motståndarranger, med olika stackar3/1,6/1/2/1,2/0,8 EUR. Alla modellnoder,
handlingar och faktiska rangevikter jämfördes med beställningen.

| Aktiva | Turn, tjänstens väggtid | River, tjänstens väggtid |
| --- | ---: | ---: |
| 3 | 4 456 ms, första kalla jobbet | 2 291 ms |
| 4 | 2 573 ms | 2 336 ms |
| 5 | 2 940 ms | 2 459 ms |
| 6 | 4 388 ms | 2 639 ms |

Dessa åtta fall är **breda syntetiska funktionstester**, inte de tidigare små
parmodellerna. De har okänd GTO-kvalitet. Tiderna inkluderar servervalidering,
numerisk initialisering, tvåsekundersträning och resultathantering, men inte
rendering och polling i appen. Kall verifiering/processstart ingår i första raden.

Ytterligare tjänstprov: tidigare checkar till en senare hjälteposition,
observerad bet0,37 EUR som binds exakt till modellen, annullering av ett aktivt
jobb och nästa hand i ny process. Alla passerade. Testet med olika stackar
fångade först en trädexplosion och därefter det för låga30-miljonerscelltaket.
Modellen kräver för den svåraste testade sexspelarturnen41,35 miljoner doubles.
Gränsen är nu100 miljoner, JVM-heap högst1536 MiB; datorn har16 GB RAM.
Budgetöverskridande ger fel, inte avkapade ranger eller ersättningsråd.

**Synligt i den riktiga Windows-appen:** ett syntetiskt sexspelarturnfall gav
tränade frekvenser och visat beslut med tjänsttid5425ms,458752 iterationer.
Riverfallet visade2844ms,598016 iterationer. På river återvisades samma exakta
modell från klientcachen vid slutlig skärmbild; tiden i UI avser dess tidigare
beräkning, inte tiden för cacheåtervisningen. Inga tider från första snapshot
till färdigmålad pixel har mätts automatiskt i denna ändring.

Riverskärmbild: `docs/evidence/monker-app-2026-11-07/river-desktop.png`.
Den visar tydligt okänd felgräns. Råinmatningar och tjänstmatris ligger i samma
mapp. De syntetiska uppdateringarna är avslutade; efter tre sekunder döljer
appen inaktuella råd som vanligt.

**Aktuell användarhand är inte verifierad.** Båda befintliga Edge-pokerflikarna
visade ”Du har blivit frånkopplad på grund av inaktivitet”. Användaren har
ombetts öppna träningsbordet igen. Ingen pokerhandling, bordsanmälan, insats,
betalning eller återinloggning utfördes. Extensionens befintliga parning/token
bevarades. Appen är omstartad med ny kod och väntar på färska avläsningar.

## Begränsningar som faktiskt påverkar råden

* Bettingträdet är en avsiktlig, synlig abstraktion. Aktuellt beslut innehåller
  check/fold/call,50 % pott och effektiv all-in när lagligt. Fortsättningar
  använder check, effektiva all-in-bets och fold/call utan ytterligare höjningar.
  Det är inte ett obegränsat NLHE-träd. Ingen rake.
* Tidigare checkar och en entydig observerad bet med efterföljande kända calls
  kan representeras. Oklara höjningslinjer med flera insatsnivåer avvisas.
  Tidigare all-in/sidopotter som inte kan rekonstrueras avvisas också.
* En hjältehand utanför den valda rangen får inget fabricerat råd. Ändra rangen
  för att analysera den. Inga automatiska pokerklick görs.
* Monkers egna samplade EV-slotar visas inte som verifierade action-EV.
* Ett positivt numeriskt resultat, många iterationer eller normaliserade
  frekvenser visar inte att2,1 %-målet har uppnåtts. Det är därför okänd status
  finns som en separat källspecifik kategori och syns före rekommendationen.
* Preflop, flop, fler än6 aktiva och6+-multiway saknar denna anslutning.

## Teknik och reproduktion

`src/monker/config.ts` bygger det lagliga offentliga trädet med samma
`decision/betting.ts` som appen. Trädet sparas i Monkers ursprungliga ordning;
native seat1 motsvarar första apppositionen0, även på efterföljande river.
Monker använder1000 interna enheter per cent. Belopp, parning av handling och
policy, effektiv stack och tidigare check-/betprefix binds utan avrundning av
observerad bet till en närmaste standardstorlek.

`MonkerBridge.java` gör endast dataöverföring och anropar den oförändrade
versionsbundna kärnan via `MonkerKernel.java`. `MonkerCoreProbe.java` är nu en
kompatibel diagnostikingång till samma implementation. För breda modeller
undviks den stora checkpoint-/policyexporten; faktiska ranger, det fulla
offentliga trädet och den tränade aktuella handpolicyn exporteras ändå och
kontrolleras separat. En obesökt rotbucket avvisas i stället för uniform fallback.

`electron/monker-service.cjs` håller en seriell Java-worker, kontrollerar vendor-,
ranktabells- och klasshashar, normaliserad förfrågan, exakt requesthash,
faktiska ranger/vikter och hela bettingträdet. Jobb har tids-/minnesgränser;
annullering dödar ett aktivt numeriskt jobb. Nästa jobb får ny process.
Identitet, rangeversion och lagliga rotåtgärder kontrolleras igen i routern.
Ett gammalt cancel-id får inte döda ett nyare jobb.

Små lämpliga modeller granskas i en separat worker med exakt informationsmängds-
bästa-svarskontroll, när beslutet ligger vid modellroten utan tidigare prefix.
Breda eller för långsamma kontroller märks okända. En
andra oberoende verifierad skalbar felkontroll för breda ranger återstår.

Installation som faktiskt användes:

```powershell
node scripts/install-monker.mjs '<officiell-runtime>' 'C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot\bin' 'C:\Users\ryd\AppData\Roaming\Poker GTO Advisor\solvers\monker-free'
npm run build
```

Installationsskriptet verifierar originalfiler, kompilerar våra bryggklasser
och skriver deras låsta hashar till installerat manifest och provenancefilen.
Ingen vendorbytekod ändras. Java/JDK och originalruntime följer inte med i
källöverlämningen. `POKER_MONKER_SOLVER_DIR` kan ange annan lokal installation.

Kontroller:

```powershell
npm test -- --maxWorkers=1 --reporter=dot
# Faktisk separat installerad tjänst:
$env:POKER_MONKER_SERVICE_TEST_DIR='C:\Users\ryd\AppData\Roaming\Poker GTO Advisor\solvers\monker-free'
npx vitest run tests/monker-service.integration.test.ts --maxWorkers=1
# Separat compile/kontraktprov av ursprunglig Java-worker:
$env:POKER_MONKER_TEST_DIR='<officiell-runtime>'
$env:POKER_MONKER_JAVA_DIR='C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot\bin'
npx vitest run tests/monker-worker.integration.test.ts --maxWorkers=1
```

Före sista granskningsrättningen passerade normal svit:391pass/19skip,
36passade/6överhoppade filer, exit0. Efter rättningen gav två fulla körningar
391pass/1fail/20skip. Felet i båda är det befintliga oberoende WASM-turnoraklet
på tests/postflop-wasm.test.ts:87 som överskrider testets5000ms; andra körningen
hade inget samtidigt bygge. Orsak till skillnaden mot separat körning är inte
fastställd. Båda separata omkörningarna av hela WASM-filen gav17pass; i sista
verbose-körningen tog orakeltestet3821ms. **Senaste fullsviten
är alltså inte helt grön**; felet och omkörningarna bevaras i evidensen.
Inga timeoutgränser höjdes.

De sju miljöstyrda Monkerintegrationstesterna har körts separat under arbetet;
20skip betyder inte att Monker bara mocktestats. Installerad tjänstmatris och
annulleringsprov:2pass; nytt separat verkligt kernel-/klientprov för effektiv
all-in:1pass. Riktad slutgranskningsregression:36pass. Separat Java-kontrakt
för3–6 med kontrollerade range-/trädmanipulationer:4pass tidigare i arbetet.
Slutligt bygge och TypeScript passerade. Tester gäller funktionalitet; ingen ny
bred strategikvalitet är intygad och verklig aktuell livehand väntar fortfarande.

Inga köp, externa meddelanden, commits eller pushar har gjorts.

Läsande slutgranskning fann ettP2-fel: observerad bet till effektiva taket kunde
kodas som absolut storlek trots att trädet kodade den som all-in. Det är rättat
med gemensam effektiv stackberäkning och röd/grön regression. Riktiga kärnan
plus klientmappning klarar nu fallet med stackar[160,160,300], bet160 från
tredje spelaren som fortfarande har140 kvar: hjälten får lagliga fold/call,
inklusive call160 som egen all-in. Slutgranskaren fann inga ytterligare konkreta
P0/P1-fel, men gjorde ingen oberoende spelteoretisk kvalitets- eller liveverifiering.

Ändringen är installerad i den körande utvecklingsappen frånC:\dev\poker.
Den äldre portabla1.4.0-filen har inte byggts om i detta arbete.

## Fortsatt funktionstest 2026-11-07

Användaren valde att fortsätta appens funktionstest medan verkligt träningsbord
saknas. Inga försök att återinlogga eller ansluta till en riktig pokerhand gjordes.

`electron/main.cjs` anger nu explicit `backgroundThrottling: false` för appens
BrowserWindow. Avläsningen och tresekunders färskhetsgrind ska inte strypas bara
för att användaren spelar i Edge framför rådgivaren. Det är den dokumenterade
[Electron-inställningen för bakgrundstimers](https://www.electronjs.org/docs/latest/api/structures/web-preferences).
Ändringen är laddad genom normal stängning och omstart; ingen ny extensionåtkomst.

Den första avläsningen av Windows tillgänglighetstext såg frusen ut tills appen
aktiverades. Detta visade sig inte vara ett säkert mått på mottagningen: efter
omstart kvitterade HTTP-mottagaren inmatningen på cirka 50 ms, och appens Java-
worker startade medan appen låg i bakgrunden, trots att tillgänglighetstexten
fortfarande visade gamla värden. **Den ursprungliga observationsskillnadens
exakta orsak är inte fastställd.** Inställningen rättar den olämpliga standarden
för denna liveklient, men den får inte beskrivas som bevisad förklaring till
alla tidigare uteblivna råd. Ingen exakt snapshot-till-pixel-latens mättes.

Fortsatt faktiskt syntetiskt UI-prov, topp50 % och fulla motståndarranger:

| Prov | Observerat resultat |
| --- | --- |
| Sex spelare, turn, första jobbet efter omstart, app i bakgrunden | Synligt Monkerbeslut efter återgång; tjänsttid **9023 ms**. Kallstarten är fortfarande för långsam. |
| Samma hand till sexspelarriver | Ny bräda och ny strategi; tjänsttid **2689 ms**. |
| Snabb ändring till en sexspelarturn med bet, sedan ny trespelarriver | Ny hand #990000000000203 fick eget råd, tjänsttid **4514 ms**. Java PID byttes från71368 till23760 under handbytet. Inget gammalt råd observerades på den nya handen. |
| Testflödet stoppas | Vid kontroll cirka15s senare var rådet dolt med ”Inväntar färsk avläsning”. Exakt gränsövergångstid mättes inte. |

Detta är funktion och drift, inte ny verifiering av 2,1 % eller aktuell Edgehand.
Alla breda råd hade fortsatt tydlig okänd kvalitetsstatus. Positivt råd och
uteblivet råd på gammal avläsning är båda dokumenterade med skärmbild.

`npx vitest run tests/decision-hook.test.ts tests/monker-service.test.ts --maxWorkers=1 --reporter=verbose`:
**13pass**, exit0,11,08s. `node --check electron/main.cjs` och `git diff --check`:
exit0. Ingen ny fullsvit kördes; tidigare fullsvits-WASM-timeout ovan kvarstår.
Ingen ny distbyggnad behövdes för ändringen i direktladdade Electron-main;
senaste distbygget är fortfarande det tidigare godkända bygget.

Råevidens: `docs/evidence/monker-background-2026-11-07/`, sammanställning
`docs/evidence/monker-background-2026-11-07.json`. Testinmatningen är avslutad;
appen är kvar igång och väntar på nya avläsningar. Förbättrad kallstart och
oberoende kvalitetsmått för breda ranger återstår.
