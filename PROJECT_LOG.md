# Projektlogg och överlämning — Poker GTO Advisor

Senast uppdaterad: **2026-11-02, Europe/Stockholm**, av Codex.
Läs denna fil först om du tar över projektet. Uppdatera statusen och lägg till
daterade resultat längst ned efter fortsatt arbete. Historiska resultat ska
behållas och märkas som ersatta om en senare körning ändrar bilden.

## 1. Uppdraget och aktuell status

Bygg en fungerande Windows-tränare som läser pokerbord, följer hela handen och
visar verkligt beräknade Fold/Call/Raise-frekvenser och sizing för **2–10 spelare**,
från preflop till river. Användaren prioriterar verifierbar funktion och riktiga
strategier framför AI-gissningar. EGM är avböjt; fortsatt tekniskt arbete är
auktoriserat. Det fulla målet är **inte uppnått**.

**Det centrala felet är fortfarande strategitäckningen.** Den generella motorn
kan producera siffror men har inte klarat kvalitetskontrollen. Därför döljs dess
råd som standard. Att slå på experimentläget skulle visa approximationer, men
skulle inte lösa det beställda problemet.

| Del | Fungerar / verifierat | Begränsning / återstår |
| --- | --- | --- |
| Windows-app | Electron-app, lokala typsnitt, sessionslagring, träningsbord | Senaste portable är 1.4.0; senare källändringar finns inte automatiskt i den |
| DOM-avläsning | Svenska Spel har lästs från riktig Edge-flik; kort, pott, stackar, säten, positioner, turknappar | Sessionsbunden observer; inte permanent automatisk återanslutning |
| Bord och potter | Domäntester för 2–10, korta all-in, återöppning, sidopotter och split | Synliga snapshots kan inte återskapa okänd tidigare historik/sidopott |
| Verifierade råd | Matchade heads-up-träd på turn och river, med laglighetskontroll och uppmätt lösningsfel | Valda ranger och begränsat bettingträd, chip EV utan rake; inte all HU-poker |
| Generella råd | MCCFR-worker på alla gator, 2–10 spelare, avbrott och skydd mot gamla svar | **Underkänd för tillförlitliga spelråd**, experimentval krävs |
| Ranger/historik | Uniform fullrange som standard; egna viktade ranger; synliga handlingar samlas | Strategibaserad rangeuppdatering genom hela handen saknas |
| Equity | Showdown-equity för flera spelare | Är inte en GTO-strategi eller handlingsfrekvens |
| Native forskning | NoRegrets byggd isolerat på Windows; spelmotor utökad till 10 | Ej integrerad; två fallerade strategitester och flera öppna granskningsfynd |

**Ingen aktuell Edge-anslutning eller pågående hand har verifierats i denna
logguppdatering.** Tidigare lyckade liveavläsningar är historisk evidens, inte
bevis för att användarens bord är anslutet just nu.

## 2. Varför användaren kan se en tom rekommendationsruta

Diagnostisera i denna ordning och dokumentera vilken punkt som faktiskt faller:

1. **Anslutning:** visar panelen ”Väntar på Edge-anslutning” finns ingen aktuell
   bordsdata. En fungerande app innebär inte att observern är ansluten.
   Observern försvinner vid omladdad/stängd pokerflik och slutar efter 30
   misslyckade överföringar. Appstart återansluter ännu inte automatiskt.
2. **Färskhet och egen tur:** mottagning måste vara inom 3 sekunder och capture
   inom 4. Ogiltiga kort/belopp, oklar tur eller ändrad hand släcker gamla råd.
3. **Verifierad täckning:** exakt provider gäller två aktiva händer på turn/river,
   även vid ett större bord. Checklinje eller första bet/all-in kan matchas.
   Redan höjda/ofullständiga linjer och andra gator får inte denna certifiering.
4. **Kvalitet:** preflop, flop och multiway går till experimentmotorn. Den är
   dold som standard eftersom strategin inte är godkänd. Etiketten GTO får inte
   användas bara för att frekvenserna summerar till 100 %.
5. **Beräkning:** ett pågående exakt svar ska behålla beräkningsindikeringen även
   om den snabba experimentmotorn redan avslutats. Sena svar från en gammal hand
   ska avvisas. Detta har regressionstester.

Se [liveanslutningen](docs/live.md) och [beslutsmotorns kvalitetsrapport](docs/decision-engine.md).
Ändra inte avläsningen på chans för att lösa ett verifierat strategiproblem.

## 3. Checkout, versioner och start

- Lokal rot: `C:\Users\rydqv\Documents\ChatGPT\poker`.
- Arbetsgren: `codex/poker-trainer-mvp`. Kontrollera alltid `git status --short`
  och `git log -6 --oneline` före ändringar; andra AI kan ha arbetat vidare.
- Senaste tidigare implementation: `56b3bf6`, publik trädåteranvändning.
- Sparat forskningsunderlag: `3cb75c2`, isolerad native-kandidat, patch,
  byggkommandon, licens och både passerade och fallerade tester.
- Föregående: `28b19fa`, kontrollvariater och oberoende multiway-orakel.
- Releasebas: `afce8ed`, verifierad turn och rättad fullrange-notation `AKo`.
- `package.json` är fortfarande 1.4.0. Det betyder inte att en gammal `.exe`
  innehåller aktuella ändringar i arbetskopian.

Starta portable: `Start-Poker.cmd` eller
`release/Poker-GTO-Advisor-1.4.0-Windows.exe --live`.
**Start-Poker väljer befintlig portable först.** För aktuell källkod, använd
`npm run desktop`, som bygger och startar Electron. Stäng tidigare appinstans
innan test av den fasta bryggporten `127.0.0.1:47832`.

`npm run dev` visar webbgränssnittet på `127.0.0.1:5173`; det ersätter inte
Electron-processens autentiserade livebrygga. Startad Vite är därför inte ett
test av hela livekedjan. Parningstoken är lokal och ska inte skrivas i loggen.

Senaste portable-manifest:
[decision-release-manifest.json](docs/evidence/decision-release-manifest.json).
SHA-256: `8227C3B4B212E8D168A366F4FC2BEC7A64CEED7F3CB15F1947B4D596F7109D48`.
Binären är en ignorerad lokal artefakt, inte incheckad i Git. Manifestet är
historiskt underlag; kontrollera hash om binären ska användas igen.

## 4. Kodkarta för nästa AI

| Fil / katalog | Ansvar |
| --- | --- |
| `src/live/reader.ts`, `public/live/live-reader.js` | DOM-sensor och genererad läsare |
| `electron/live-bridge.cjs` | Autentiserad lokal mottagning och snapshotvalidering |
| `src/live/hand-memory.ts`, `positions.ts`, `types.ts` | Observerade folds, positioner och snapshotkontrakt |
| `src/live/LivePanel.tsx` | Livepanel, status och experimentval |
| `src/decision/adapter.ts`, `context.ts` | Snapshot till beslutsmodell och historikkontext |
| `src/decision/use-decision.ts`, `client.ts`, `worker.ts` | Providerflöde, workers, avbrott, färskhet och identitet |
| `src/decision/betting.ts`, `payoffs.ts` | Spelregler och chiputfall |
| `src/decision/verified-river.ts`, `river-legality.ts` | Exakt HU-turn/river och kvalitetsgrind |
| `src/decision/mccfr.ts`, `sampler.ts`, `card-information.ts` | Experimentell strategi, rangesampling, exakta kortsymmetrier |
| `src/decision/public-tree.ts`, `variance-reduction.ts` | Publik cache och valfria kontrollvariater |
| `tests/helpers/check-jam-oracle.ts` | Oberoende litet multiway-spel och bästa ensidiga avvikelse |
| `scripts/river-oracle.mjs`, `verify-turn.mjs`, `verify-solver.mjs` | Oberoende kontroll av exakt solver |
| `research/noregrets/` | Sparad forskningspatch, licens och bygginstruktioner |
| `.research/noregrets/` | Ignorerad upstream-checkout, lokala byggen; inte appkod |

De sex avläsningsfiler som behållits oförändrade under det senaste
strategiarbetet är `reader.ts`, `positions.ts`, `hand-memory.ts`, `types.ts`,
`electron/live-bridge.cjs` och `public/live/live-reader.js`. En ändring av dem
kräver separat motivering och avläsningsregression; en solverändring gör det inte.

## 5. Testresultat och bevisens gränser

Resultat nedan är observerade körningar, inte löften om nästa körning.
Datum är Europe/Stockholm. Ursprungliga JSON/loggar innehåller mer mätdata.

| Datum / test | Observerat resultat | Vad det bevisar / inte bevisar |
| --- | --- | --- |
| 2026-10-28, portable 1.4 | 258 tester, 1 opt-in överhoppat; 16 native-fall, inga oväntade rendererfel | Paketerat flöde och HU-turn/river, inte bred GTO-täckning |
| 2026-10-28, oberoende turn/river | Turn-orakel matchade WASM inom 0,0001 marker; större fullrange-fixture hade 0,0076 % solverrapporterat fel | Litet oberoende kontrollfall och separat större solve; båda gäller sina modeller |
| 2026-11-02, appens ordinarie svit efter cache | 302 passerade, 3 opt-in överhoppade | Domän och regressionsfunktion; inte strategikvalitet i full NLHE |
| 2026-11-02, Electron med syntetiska snapshots | 16 kombinationer: 2/3/6/10 spelare × fyra gator; grinden och verifierad HU fungerar | Verklig app/worker-kedja; inte en riktig full livehand |
| 2026-11-02, publik cache | Identiska frekvenser/EV/noder vid samma cykler/frö; cirka 2–3,5× snabbare i fasta benchmarkfall | Effektivare implementation, inte ny strategikälla |
| 2026-11-02, fullrange-diagnostik | Alla åtta cachefall fyllde 50 000 infosets; 10p hann 365–401 cykler och 191–213 rotbesök | Tränings-/minnesbristen kvarstår |
| 2026-11-02, litet multiway-check/all-in-spel | NashConv 0,85 % / 1,91 % / 6,92 % för 3/6/10 utan baseline, fyra sekunder | Uppmätt ensidig förbättring i små ranger; inte allmän multiway-certifiering |
| 2026-11-02, native-kandidat före regelpatch | 1 ny regression passerade, 4 föll | Reproducerade fel, inte enbart kodgranskningshypoteser |
| 2026-11-02, native-spelmotor efter patch | 18 passerade; 18 000 slumpade händer. Abstraktionssviten omfattar också 4 500 slumpade händer | Regler och tillstånd testade upp till 10 spelare |
| 2026-11-02, hela native-kandidaten | **139 passerade, 2 föll** | Kandidaten är inte godkänd, även om den går att bygga |
| 2026-11-02, native modell-IO | En 20-traversals testmodell skapad och inläst för varje spelarantal 2–10 | Filflöde och lagrat spelarantal; **inga användbara tränade råd** |

Viktiga evidensfiler:

- [Turnkontroll](docs/evidence/turn-solver-verification.json),
  [riverkontroll](docs/evidence/solver-verification.json),
  [portable 1.4](docs/evidence/decision-portable-smoke-1.4.0.json).
- [Senare Electron-test](docs/evidence/decision-native-public-cache-smoke.json),
  [cacheprestanda](docs/evidence/public-tree-performance-2026-11-02.json),
  [fullrange-diagnostik](docs/evidence/decision-quality-public-cache.json),
  [oberoende liten multiway-kontroll](docs/evidence/multiway-public-cache-quality-2026-11-02.json).
- [Native-audit](docs/evidence/noregrets-candidate-audit.json),
  [röda tester](docs/evidence/noregrets-engine-red.log),
  [gröna motortester](docs/evidence/noregrets-engine-green.log),
  [hela sviten med två fel](docs/evidence/noregrets-full-test.log),
  [modell-IO](docs/evidence/noregrets-training-smoke.json).
- [Ny app-testlogg vid överlämningen](docs/evidence/application-tests-2026-11-02.log)
  och [kontroll av överlämningens länkar/hashvärden](docs/evidence/project-handoff-check-2026-11-02.json).

## 6. Undersökt och förkastat eller begränsat

- **Gamla C#/OCR-projektet:** granskades, men besluten byggde på equity/heuristik,
  inte en verifierad GTO-strategi. Nuvarande app är ombyggd i Electron/React/TS.
  OCR/AI-skärmanalys är inte levererad som alternativ läsare. Se
  [ursprunglig research](docs/research.md).
- **HUD-/skärmreferenserna:** idéer om UI/avläsning är inte strategiskt facit.
  Postflop valdes som faktisk lokal HU-solver. Solverursprung/licens finns i
  [proveniens](docs/solver-provenance.json) och [notiser](THIRD_PARTY_NOTICES.md).
- **Zeta:** byggd och utökad till 10 som forskning. En liten trepersonersriver
  fick oberoende NashConv 0,011149 % av potten efter 10 000 iterationer.
  En tiopersoners minimal beräkning tog cirka 88 sekunder för två iterationer;
  fullranges enumerering är opraktisk. Ingen generell liveintegration. Se
  [multiway-rapporten](docs/multiway-research.md).
- **Egen MCCFR:** bättre sampling, exakta färgsymmetrier, kompletta terminala
  episoder, kontrollvariater och publik cache har prövats. Kvalitetsgapet finns
  kvar; mer hastighet räcker inte när stora delar av strategin saknar träning.
  Gamla extrema AKo-all-in-resultat får inte döljas bakom ett godkänt funktionstest.
- **Externa strategitjänster/solvers:** undersökta, men ingen verifierad,
  tillgänglig allgata/2–10-strategikälla har integrerats. Kommersiella modeller
  har inte köpts eller hämtats. Se [källgranskningen](docs/strategy-source-audit.md)
  för faktiska täcknings-, licens- och integrationshinder.

## 7. Native-kandidat: exakt läge och nästa tekniska steg

Upstream: `conorarmstrong/noregrets`, MIT, låst till
`757f7692738069522195d2b486eec60a8b010c0c`.
Den sparade patchen utökar 6 till 10 spelare och rättar höjningsrätt efter kort
all-in, höjning utan kvarvarande motståndare med marker samt udda marker per pott.
Den är **isolerad forskning**, inte en installerad beslutsmotor.

Kända öppna fel/fynd:

1. `bot::tests::round_rooted_search_calls_the_nuts_three_way`: absoluta nuts på
   river foldades 10,64 %, call 89,36 %, mot testkravet över 90 % call.
   Hypotes: aktuell grov bucket blandar ihop handtyper. Det är inte bevisat att
   enbart fler buckets löser det; aktuell exakt hand måste särskiljas och testas.
2. `cfr::tests::multiway_focus_keeps_the_fixed_point`: 72o call 27,4 %, krav under
   20 %. Detta test kör utan VR; det är **inte automatiskt samma fel som punkt 3**.
3. `cfr.rs`, VR kombinerad med fokus/spinesampling: implementationen använder
   `Eσ[b] + (ratio * child - b_selected)`, men korrektionen ska vara
   `Eσ[b] + ratio * (child - b_selected)`. Oberoende tvåhandlingsfall med
   σ=(0,5;0,5), q=(0,25;0,75), b=child=(1;3) har väntevärde 2; aktuell formel
   ger 1,5. **Nästa avgränsade fix:** röd analytisk regression, rättning,
   kontroll av baseline-läsning före sampling, riktade tester och ny bred körning.
4. Checkpoint/blueprint binder inte hela spel-/träningskonfigurationen, bland
   annat stackar och blinds. Återanvänd inte en fil för ett annat spel.
5. Strategiska checkpointar återställer inte beroendemodellen; saknad koppling
   till tidigare blueprint kan ge postflop-panik.
6. Infosetnyckeln består av aktuell bucket + publika tokens och glömmer tidigare
   privat information. Det är inte perfekt minne eller exakt kortisomorfi.

Trösklar i fallerade tester har inte sänkts. Endast 20-traversals IO-modeller
finns från proben; inga kvalitetsgodkända breda blueprints har tränats.
Anslut inte dessa filer till rekommendationsvyn.

Lokala kompilatorer är installerade endast under `.research/tools`: Rust GNU
1.99.1 och Zig 0.17.0. Rusts medföljande `rust-lld` länkar; Zig används för
C/ar/dlltool. Global PATH är oförändrad. Undvik att upprepa misslyckade försök
med Zig som Rust-länkare eller den instabila länkflaggformen `gnu-lld`.
Fungerande inställningar och återställning i en ny checkout finns i
[forskningsinstruktionen](research/noregrets/README.md).

## 8. Checklista till avsedd produkt

Kryss betyder verifierad del, inte att hela målet är färdigt.

- [x] Körbar Windows-tränare med lokala scenarier och sessionslagring.
- [x] DOM-läsning demonstrerad mot riktig Edge-flik; 2–10 bordsmodell.
- [x] Bettingregler, gemensam kortlek och hand-/resultatidentitet testade.
- [x] Exakt, kvalitetskontrollerad HU-turn/river för matchade begränsade träd.
- [x] Oberoende river-/turn- och liten multiway-orakelkontroll.
- [x] Alla gator/2–10 kan köras tekniskt med experimentworker.
- [x] Reproducerbar projektlogg, testunderlag och AI-överlämning.
- [ ] Rätta och granska native-kandidatens öppna estimator-/modellfel, eller
  förkasta den med tydliga mätningar om arkitekturen inte håller.
- [ ] Välj/träna faktisk strategi och fortsättningsmodell för preflop, flop,
  turn och river med flera spelare; bind modeller till spelkonfiguration,
  version, träningsdata, seed och beroenden.
- [ ] Uppdatera ranger efter observerade handlingar med verifierad
  strategilikelihood; hantera blockerade händer och gemensamma sannolikheter.
- [ ] Mät oberoende bästa ensidiga avvikelse och stabilitet över flera frön,
  tillräckliga budgetar, handklasser, positioner, stackdjup och spelarantal.
  Specificera accepterat fel, täckning och antaganden före godkännande.
- [ ] Hantera okända blinds, ofullständig historik, sidopotter och off-tree
  sizing utan att kalla obekräftade antaganden för avlästa fakta.
- [ ] Integrera endast en godkänd strategi i workers/UI; kontrollera lagliga
  belopp, beräkningstid, avbrott, minne och skydd mot föråldrade råd.
- [ ] Gör browseranslutningen beständig och återanslutning synlig och testad.
- [ ] Verifiera full handslinga i träningsmiljö från preflop till river,
  inklusive ändrat antal aktiva spelare och omladdning/avbrott.
- [ ] Paketera en ny Windows-version från exakt verifierad källrevision;
  testa den faktiska nya `.exe`-filen och spara manifest/hash.
- [ ] Kontrollera användarens aktuella anslutning separat innan besked att
  livefunktionen fungerar. Gamla skärmbilder/native-smokes räcker inte.

## 9. Reproducera tester

Kör från projektroten. Node 24 rekommenderas; använd låsfilen med `npm ci` i ny
checkout. Kör tunga kvalitetsprober separat; konkurrerande last påverkar budgetar.

```powershell
npm test -- --pool=threads --maxWorkers=1
npm run verify:solver
npm run verify:turn
npm run build
npm run smoke:desktop
```

Opt-in-prober är diagnostik, inte automatiskt godkännande:

```powershell
$env:POKER_QUALITY_PROBE='1'
npx vitest run tests/decision-quality.test.ts --maxWorkers=1
Remove-Item Env:POKER_QUALITY_PROBE
$env:POKER_MULTIWAY_PROBE='1'
npx vitest run tests/decision-multiway-quality.test.ts --maxWorkers=1
Remove-Item Env:POKER_MULTIWAY_PROBE
```

Native-forskning, när lokal checkout/verktyg finns:

```powershell
node scripts/native-research-cargo.mjs test --manifest-path .research/noregrets/Cargo.toml --release --locked -j 4 engine::tests -- --test-threads=1
node scripts/native-research-cargo.mjs test --manifest-path .research/noregrets/Cargo.toml --release --locked -j 4 -- --test-threads=2
node scripts/probe-native-training.mjs
```

Sista proben kräver separat byggd `pluribus.exe` som exakt motsvarar den sparade
patchen. Den ska avvisa källavvikelser. Se forskningsinstruktionen för byggning.
`.research/`, `artifacts/`, `node_modules/`, `dist/` och `release/` är ignorerade;
de följer inte med en Git-checkout. Beständig evidens ligger i `docs/evidence/`.

## 10. Daterad arbetslogg

### 2026-10-28 — sammanfattad historik från commits och evidens

- Ombyggnad från gamla projektet till lokal Electron-tränare med Postflop.
  `b0b40e7`: riverträning; `c0167a9`: liveavläsning och multiway-equity.
- `dd2fc56`: experimentell allgata/2–10-motor med synlig kvalitetsgrind.
  Resultat: funktion fungerar, fullrangestrategin inte godkänd.
- `4ec28be`: exakta färgsymmetrier och korrekt importance för rotklass.
  Resultat: återanvändning förbättrad men extrema strategier kvar.
- `b246ab8`: kompletta outcome-episoder ersatte passiv fortsättning vid
  avskärningar. Resultat: den bristen borttagen, bred strategikvalitet ej löst.
- `afce8ed`: rättade att `AKo` avvisades och stoppade automatiska ranger;
  verifierad HU-turn/river paketerades i 1.4. Se release- och solvermanifest.

### 2026-11-02 — kontrollvariater och publik cache

- `28b19fa`: valfri learned baseline och oberoende multiway-kvalitetskontroll.
  Resultat: förbättring i vissa små spel, fortsatt hög ensidig förbättring i
  större fall; ingen generell certifiering.
- `56b3bf6`: återanvänder exakta publika bettingövergångar. Samma strategi/EV
  vid samma cykler; mätt snabbare. Fullrange fyller fortfarande infosetgränsen.
  302 ordinarie testfall passerade, 3 opt-in överhoppades. Native-smoke gick
  igenom med syntetiska snapshots. Ingen ny portable levererades.

### 2026-11-02 — isolerad native-forskning och överlämningslogg

- Hypotes: offline blueprint plus sökning kan komma förbi online-MCCFR:s
  otillräckliga fullrangeträning. NoRegrets låstes till revisionen ovan och
  byggdes med projektlokal, checksumkontrollerad verktygskedja.
- Fyra nya regelregressioner föll före fix. Efter regel-/10p-patch: alla
  18 motortester passerade. Bred körning: **139 pass, 2 fel**, sparade i
  `docs/evidence/noregrets-full-test.log`. Kända fynd finns i avsnitt 7.
- Filprobe: skapade/läste 20-traversals syntetiska modeller för varje antal
  2–10. Det är ett IO-test, ingen godkänd strategi. Ingen modell inkopplad.
- Sparade forskningspatch, byggmallar, licens, källgranskning och evidens.
  Normaliserade textloggar till LF före SHA-256 så hash stämmer efter checkout.
- Skapade denna överlämning och projektinstruktion att uppdatera den efter
  fortsatt arbete. Appkod, kvalitetsgrind och avläsning ändrades inte här.
- Nästa avgränsade tekniska steg: estimatorregressionen i avsnitt 7.3;
  därefter handrepresentation och modellidentitet, innan större träning.

### 2026-11-02 14:11 Europe/Stockholm — Codex, kontroll av överlämningen

- Körning: `npm test -- --pool=threads --maxWorkers=1`, från appkällan på
  `56b3bf6`. Exitkod 0: **302 passerade, 3 opt-in överhoppade**, 52,58 sekunder.
  Beständig rålogg: `docs/evidence/application-tests-2026-11-02.log`.
- Kontrollerade att alla lokala Markdown-länkar i logg, projektinstruktion,
  README och forskningsinstruktion pekar på befintliga filer. Matchade sparad
  forskningspatch mot faktisk käll-diff och jämförde auditens logg-hashvärden.
  Rapport: `docs/evidence/project-handoff-check-2026-11-02.json`.
- `git apply --reverse --check` accepterade forskningspatchen mot den ändrade
  kandidatcheckouten. Node syntaxkontroll av båda nya forskningsskripten gav
  exitkod 0. Appens `src/`, `electron/` och `public/` hade ingen lokal diff.
- Denna nya körning gör inte native-svitens två tidigare strategifel godkända.
  Ingen ny livehand, modellträning av användbar kvalitet eller portable-release
  har verifierats här. Nästa steg i avsnitt 7 och checklistan står kvar.

### Mall för nästa loggpost

```text
YYYY-MM-DD HH:mm Europe/Stockholm — AI/agent
Ändring eller hypotes:
Filer och källrevision:
Exakt testkommando / budget / seed:
Observerat resultat (även fel och exitkod):
Evidensfil:
Vad resultatet bevisar och inte bevisar:
Kvar / nästa steg:
```
