# Projektlogg och överlämning — Poker GTO Advisor

Senast uppdaterad: **2026-11-22, Europe/Stockholm**, av Codex.
Läs denna fil först om du tar över projektet. Uppdatera statusen och lägg till
daterade resultat längst ned efter fortsatt arbete. Historiska resultat ska
behållas och märkas som ersatta om en senare körning ändrar bilden.

**Aktuell målbild, 22 november 2026.** Uppdraget omfattar vanlig No-Limit Texas Hold’em för 2–6 spelare inklusive hjälten, från första preflopbeslut till river. Avslutande all-in kan avgöras matematiskt på alla tre postflopgatorna under villkoren i [checklistan](docs/CHECKLISTA.md). Vanligt flervägsspel, flera höjningar på samma gata och full verifiering av strategikvalitet återstår. [Färska Windows-prov och källgranskning](docs/evidence/gto-coverage-2026-11-22/RESULTAT.md)

**22 november 2026.** Svenska Spel-vyn använder automatisk efteranalys med tre handbyten i fördröjning. Den senaste frigivna handen analyseras när vyn är öppen. Två kvar matchas mot befintliga HU-flopreferenser och tidigare motorer används för sina stödda lägen. För 3–6 kvar saknas generell vanlig floppstrategi. [Windows-prov och gränser](docs/evidence/hand-review-2026-11-22/RESULTAT.md)

**Senaste flopstatus, 21 november.** Egen studie har 74 färdiglösta floppar och tio beslutslägen per bräda för BB mot knappen, 100 BB i ett sexmaxspel. Den automatiska motorn har också fått matematiskt avgjorda slutbeslut mot all-in för 3–6 utdelade under villkoren i [flopprovet](docs/evidence/flop-study-2026-11-21/RESULTAT.md). Vanliga flervägsfloppar och en allmän oberoende GTO-verifiering återstår.

**Gällande tidsgräns 2026-11-21.** Användaren ändrade målet från fem till högst tio sekunder från mottaget beslutsläge. Den tidigare femsekundersmätningen är historisk. I den nya Windows-versionen stoppas sena strategisvar. Ett bekräftat gratis checkalternativ kan också visas när deltagandet är oklart. Se [tiosekundersprovet](docs/evidence/ten-seconds-2026-11-21/RESULTAT.md).

**Aktuellt 2026-11-21.** Prefloptabeller och HU-turn/river gav beslut i matchande lägen i den paketerade Windows-appen. Exakt avslutande HU-all-in på flop och korta sexmax push/fold-tabeller är tillagda. En check till hjälten på en vanlig flop saknar fortfarande jämförelse mellan check och bet. Se [mätning, källor och täckningsmatris](docs/evidence/windows-training-2026-11-21/RESULTAT.md). Femsekundersmålet uppnåddes inte generellt för kalla flervägsbeslut. Följande post beskriver det tidigare läget.

**Senaste fortsättning2026-11-08:** officiell inloggning och motor återkontrollerade:
ENGINE READY,0pågående jobb. RunnerAPI har allow_execute:true och autentiserad
health200, men nytt normalt jobb fortfarande403compute_not_granted. Extern
gateway-sessionfalse; officiell Edgeöppning avvisas local_origin_required,
"Open NLHE Solver from its desktop window." Ingen avsedd extern login-/grant-
eller deep-linkväg hittad i granskade konto/diagnostik/CLI/frontendytor.
Ingen autentisering ändrad eller cookie/grant kopierad. Ingen flopprovider
aktiverad. Strömprov på återupptagen3p gav vald ärvd handrad3,780s och första
observerade uppdaterade handrad6,752s; hela exporten25,118s. Detta är ingen
kall2–6-prestandagaranti eller2%-kvalitet. Skript och rådata sparade under
docs/evidence/holdem-stream-2026-11-08/, läs docs/holdem-stream-2026-11-08.md.
Säker diskrensning:167gamla Android-buildfiler i indexreglerings node_modules
NTFS-komprimerades, allaSHA256oförändrade; uppmätt+852025344byte fritt.
Två raderingsförsök avvisades automatiskt med blocked by policy; inget raderat,
tradingdata och pokerns beroenden orörda. Produktkod oförändrad i denna
fortsättning. Fullmålet är fortsatt INTE komplett.

**Senaste fortsättning2026-11-08 förmiddag:** ny gratis40BB cashreferens är
installerad och Windows-UI-verifierad. RangeConverter-PDF→35förenklade tabeller
för RFI, svar på öppning och öppnarens svar på3bet.30–50BB faktisk effektiv
stack använder40BB-källan, med modellskillnad synlig.2–6utdelade positioner
testade;2–5mappas till6max, inte separata jämvikter. Ingen2%-garanti. AA iCO,
40,5BB, sex utdelade gav synlig Raise0,04EUR100% i ett syntetiskt mottagarprov;
rådet doldes efter stoppat flöde. Ingen aktuell Edgehand verifierades här.
Holdem Solver: det gamla minnesstoppet kom från2048MBcheckpointreserv när
1118MBvar ledigt. Större officiellt UI-prov slutförde20000nya iterationer,
20202totalt,5,061sträning/19still färdig export, utan minnesstopp och med
100%rotcoverage. Fortsatt utkast, ej verifierad2%-kvalitet; ingen permanent
låg-RAM-fix. Autentiserad status-/combostrategiläsning fungerar; nya externa
jobb nekas403compute_not_granted. Ingen Holdem-flopprovider aktiverad.
56riktade tester + källimportprov och bygge passerar. Senaste fullsvit422pass/
20skip/0fel,226,26s. Tidigare421pass/20skip/1WASM-tidsgränsfel och isolerat
godkänt återprov bevaras i evidensen. Fulla gratisflop-
och kortstackmålet är fortfarande INTE klart. Läs
`docs/shortstack-and-holdem-2026-11-08.md`, rådata i
`docs/evidence/shortstack-2026-11-08/`.

**Historisk fortsättning 2026-11-08 natt:** flop-/kortstackuppdraget är inte klart.
Ingen ny provider aktiverad. Läs `docs/holdemsolver-qualification-2026-11-08.md`.
Efter användarens manuella rensning av den exakt godkända VSIX-cachemappen
hämtades och startades officiella Holdem Solver0.93. Användaren loggade in
själv; ENGINE READY verifierades. Ett fullrangeprov på3p flop JhQhKh,
40,5BB/4,5BB stoppades av leverantörens minneskontroll under initieringen.
Återupptagning med1tråd gav bara totalt2iterationer;1174/1176kombinationer
saknade samples. Check100% var initial policy och har inte importerats som råd.
Extern lokal API-klient fick401/login_required; fristående runtime fick
grant_missing. Inget autentiseringsskydd kringgicks, ingen färdig export
verifierades. Källans multiwaystabilitet är inte ett2%-Nashmått.
Provprocesserna är avslutade och Poker Advisor är återstartad i livevyn.
Mottagaren är redo men saknar färsk Edgeavläsning; pokerklienten visar
frånkoppling p.g.a. inaktivitet. Inget aktuellt livebeslut verifierat.
Färsk installerad regression:12pass,3filer,47,19s. Befintlig Monker3–6
turn/river gav2,28–4,35s tjänsttid i breda syntetiska modeller, fortsatt
okänd felgräns. HU-turn och pinnade preflopdata passerade också. Gratis
allgatustöd för2–6 och allmänna kortstack-cashranger saknas fortfarande.

## 1. Uppdraget och aktuell status

**Gällande styrning 2026-11-04:** bästa möjliga implementation med gratis källa,
med förberedelse för valfri billig betalsolver senare. Målet är 2–6 spelare på
alla gator. Flera motorer får kombineras, men fler egna solverexperiment är
stoppade. Äldre instruktioner om träning/native-forskning är historik.

**Ny preflopintegration 2026-11-07 kväll:** ART/GTO-data är importerade lokalt:
2606 filer→1930 beslutslägen. Källan är en100BB6-maxmodell. Appen använder den
uttryckligen som tabellreferens vid50–150BB effektiv startstack mot djupaste
kvarvarande motspelare (kortare säten får finnas, skillnader visas), med sena
positionsmappningar för2–6 utdelade spelare;2–5 är inte separat lösta modeller.
Position, stack och observerade tidigare höjningar/storlekar styr valet.
HoldemMath tillför riktig HU push/fold vid4–20BB, med närmaste av sju publicerade
djup, utan ante. Båda märks `chart-reference`, inte oberoende verifierad GTO.
Topp50 % används inte för preflopbeslut. Router och Windows-UI är inkopplade;
syntetiska preflopbeslut har visats med cirka1ms rent tabelluppslag.
Läs docs/preflop-2026-11-07.md. Flop och full stack-/linjetäckning kvarstår.
Färska riktiga Edgehänder når den omstartade appen; aktuell3BB-öppning saknade
källtäckning. Användarbildens43BB-stackblockerare är reproducerad och rättad.

**Aktuell implementation:** `src/decision/providers.ts` väljer fria motorer
först; betalda kräver explicit aktivering och ingen är registrerad. Fri
Postflop används för matchande HU turn/river. **Användaren valde uttryckligen
2 % felgräns för vanlig NLHE den 2026-11-05.** Turn kör nu en lokalt byggd,
fyrtrådad b-inary-adapter; river använder fortsatt UCSandman WASM. UI anger
”Solverstrategi · 2 % felgräns”. Läget från bilden klarade Windows-kedjan med
1,805 % och senast 2 725 ms från snapshot till synligt beslut (2 121 ms
beräkning), jämfört med tidigare 19 519 ms beräkning. Samma
offentliga träd och viktade ranger kontrolleras; oberoende bästa-svarsorakel
verifierar felnormaliseringen. Jobb avbryts vid sex sekunder. Läs
docs/nlhe-fast-2026-11-05.md. 6+ behåller separat 0,2 %-grind. Användaren har
förtydligat att användningen gäller träning med låtsaspengar.
Experimentmotorn startas inte
längre i liveflödet och dess opt-in är borttagen. TexasSolver v0.2.0 är nu
registrerad separat för **6+ Hold’em, två aktiva spelare på river**. Komplett
Windows-funktionstest går genom brygga, native-process, oberoende kvalitetskontroll
och råd i UI. Mätt total tid 4,26 s, varav kontroll 0,59 s; desktopprovet tog
5,36 s under samtidig belastning. Detta är syntetiska fall, inte ett verifierat
råd på användarens aktuella hand. Se docs/shortdeck-solver-2026-11-05.md.
Testutfall och aktuell leveransstatus finns i den senaste loggposten längst ned.

Läs [aktuell integrationsöverlämning](docs/solver-integration.md) och
[kandidatgranskningen](docs/solver-selection-2026-11-04.md).
Ingen granskad gratis kombination uppfyller hela målet. IkaSolver NLHE + Trainer
är billigaste granskade betalkandidat med annonserad önskad täckning, 199 USD
engångsvis. Exportparser, faktisk kvalitet och latens är inte verifierade.
Inga köp, externa kontakter eller betalda integrationer har gjorts.

Följande ursprungliga produktbeskrivning avser det tidigare 2–10-målet:
Bygg en fungerande Windows-tränare som läser pokerbord, följer hela handen och
visar verkligt beräknade Fold/Call/Raise-frekvenser och sizing för **2–10 spelare**,
från preflop till river. Användaren prioriterar verifierbar funktion och riktiga
strategier framför AI-gissningar. EGM är avböjt; fortsatt tekniskt arbete är
auktoriserat. Det fulla målet är **inte uppnått**.

**Det centrala felet är fortfarande strategitäckningen.** Den generella motorn
kan producera siffror men har inte klarat kvalitetskontrollen. Den är därför
bortkopplad från liveflödet. Kvalificerade källor för de saknade lägena återstår.

**Aktuell leverans 2026-11-07 eftermiddagen:** Monker Free10114 är nu en
installerad, aktiverad provider för **vanlig NLHE,3–6 aktiva på turn/river** i
matchande begränsat bettingträd. Din tomma Monker-range använder topp50 %;
tomma motståndarranger är fortsatt fulla och vikterna bevaras. Användaren
accepterade2,1 % och delegerade sedan valet mellan enbart oberoende verifierade
råd och källberäknade Monkerbeslut med tydligt okänd felgräns. **Jag valde
det senare under delegationen.** Breda resultat visas som `solver-unverified`
med ”Monker · felgräns ej verifierad”, inte verifierad GTO. Kända uppmätta
fel över2,1 % blockeras. Gamla egna MCCFR-approximationen är fortsatt blockerad.
Ingen generell2,1 %-kvalitet för breda ranger är bevisad.

Installerad riktig tjänst har klarat3/4/5/6 med olika stackar på både turn
och river: cirka2,3–4,5s. Tidigare checkar, observerad bet och cancel+nytt jobb
passerade också. I Windows-appen observerades ett brett syntetiskt6p-turnbeslut
med tjänsttid5425ms och ett6p-riverbeslut med2844ms, topp50 % och fulla
motståndarranger. Dessa är faktiska programkedjor men **inte aktuell Edgehand**.
Båda pokerflikarna visade frånkoppling p.g.a. inaktivitet. Användaren ombads
öppna träningsbordet igen; faktisk liveverifiering inväntar det.
Läs docs/monker-app-2026-11-07.md för aktiva begränsningar, kvalitetspolicy,
installationsväg och aktuella kontroller. Äldre negativa resultat nedan bevaras.

**Senare funktionstest samma dag:** användaren valde fortsatta syntetiska appprov.
Bakgrundstimers tillåts nu explicit med Electron `backgroundThrottling:false`;
appen normalt omstartad. Bakgrundsjobbet gav råd men kall sexspelarturn tog
9023ms. Varm sexspelarriver tog2689ms; ny trespelarriver efter snabbt handbyte
och byte av Java-process tog4514ms. Inaktuellt råd doldes efter stoppat flöde.
13 riktade hook-/service-regressioner passerar. Faktisk Edgehand och bred2,1 %
kvalitet kvarstår; tidigare fullsvits-WASM-timeout är inte löst. Windows AX-text
kunde visa äldre data trots att mottagare och worker var aktiva; tidigare
”frusen app”-observation är därför inte ensam bevisning om rotorsaken.

**Historisk första fortsättning 2026-11-07:** användaren delegerade valet av multiwaymått.
Valt: högst 2 % ensidig EV-förbättring för någon spelare, ε-Nash; summan
NashConv redovisas också. Ingen division med spelarantal används. Monkers
oförändrade numeriska kärna körs nu i en separat headless studiehost, utan GUI.
Varma små SPR2-parmodeller för 3/4/5 spelare klarade 0,355/1,156/1,932 % på
2,31–2,50 s inklusive avkodning och exakt kontroll, exklusive uppvärmning,
Node-start och app/UI. Dessa är smala check/all-in-kontroller, inte vanliga
breda ranger. Kall komplett trespelarkedja tog 6,012 s. Sex spelare missar
fortfarande 2 %: bästa nya sammanhängande entrådskontroll gav 2,099 %;
andra tidpunkter/trådar blev sämre. Topp50 % endast för hjälten har faktiskt
körts för 3–6, men exakt kontroll överskrider budgeten och kvaliteten är okänd.
Ingen motståndarrange har kapats och ingen Monker-provider aktiverats.
6300 kernelutbetalningar matchar oberoende evaluator exakt, 3→6→3-jobb fungerar
efter rättning av kvarvarande numeriskt träd. Hela sviten376pass/13skip,
bygge grönt. Inget nytt faktiskt livebeslut verifierat. Läs
docs/monker-turn-2026-11-07.md och docs/evidence/monker-turn-2026-11-07.json.

**Ny kvalificering 2026-11-06, 3–6 aktiva turn/river:** ingen fri motor har
styrkt hela täckningen med aktuell 2 %-kontroll och några sekunders automatisk
drift. Monker Free har nu faktiskt räknat och exporterat alla åtta kombinationer
av 3–6 aktiva på turn/river i små check/all-in-kontrollträd. Snabbproven tog
1,136–4,460 s till fil, utan uppmätt 2 %-mått. Sexvägs turn med iterationskvot
10 tog först 30,174 s. Efter 13 jämförbara prestandaprov gav Java17/åtta trådar
14,030 och 14,819 s med samma modell och arbetsbudget; dagens varma fyrtrådsprov
tog 21,778 s (33,8 % kortare tid). Se docs/monker-performance-2026-11-06.md.
Detta är tid till exportfil, inte till appbeslut eller verifierad 2 %.
**Senare samma dag:** versionsbunden policy-/bucketmappning och separat exakt
NashConv-kontroll är nu implementerade. Fjorton exporter från sexton försök
har granskats med både medelstrategi och aktuell regret-strategi. Små riverfall
för 3/4/5/6 spelare klarade 0,960/0,449/0,512/0,926 % med 1,26–1,70 s till
fil. De använder två kombinationer per spelare och ett check/all-in-träd;
de ersätter inte fullrangeprovet ovan. Samtliga undersökta turnfall missade
2 %: även trespelarturn med 33,8 miljoner iterationer och 7,02 s gav 21,38 %.
En separat avvikelseutvärdering styrker ett turnavslag. GUI-batchflödet
kastade dessutom ett fångat arrayfel vid river-till-turn-byte; ren process
slutförde samma prov. Stabil appanslutning och realistisk modellkvalitet
är inte verifierade. Se docs/monker-policy-audit-2026-11-06.md och dess
råa syntetiska MKR-/JSON-underlag under docs/evidence/monker-policy-audit/.
Zetas aktuella låsta källa avvisar fortfarande multiwayturn. Ingen ny provider
aktiverad och utökningen är inte levererad. Se docs/monker-free-test-2026-11-06.md
och docs/multiway-turn-river-2026-11-06.md.

| Del | Fungerar / verifierat | Begränsning / återstår |
| --- | --- | --- |
| Windows-app | Electron-app, lokala typsnitt, sessionslagring, träningsbord | Senaste portable är 1.4.0; senare källändringar finns inte automatiskt i den |
| DOM-avläsning | Aktuellt vanligt NLHE-bord verifierat: samma hand 12625047115, sex säten, färska data | Edge kör fortfarande äldre läsarkod utan variantmetadata trots version 1.1.0 på disk; senaste metadatauppdateringen är inte liveverifierad |
| Bord och potter | Domäntester för 2–10, korta all-in, återöppning, sidopotter och split | Synliga snapshots kan inte återskapa okänd tidigare historik/sidopott |
| Kvalitetskontrollerade råd | NLHE HU turn/river med vald 2 %-gräns; b-inary-turn klarar det rapporterade 5547-nodsfallet med 2725 ms till synligt beslut. 6+ HU river har separat 0,2 %-gräns | Valda ranger/begränsat träd, utan rake; tidsvariation finns och jobb stoppas efter 6 s. 6+ saknar action-EV |
| Generella råd | MCCFR-worker på alla gator, 2–10 spelare, avbrott och skydd mot gamla svar | **Underkänd**, bortkopplad från liveflödet; endast forskningskod |
| Ranger/historik | Uniform fullrange som standard; egna viktade ranger; synliga handlingar samlas | Strategibaserad rangeuppdatering genom hela handen saknas |
| Equity | Showdown-equity för flera spelare | Är inte en GTO-strategi eller handlingsfrekvens |
| Native forskning | 39 små oberoende policykontroller; versionsbunden checkpoint och sju nya regressioner | Senaste native-svit 164 pass/1 pruningfel; blueprintbindning, bred täckning och användbara modeller saknas; ej integrerad |

**Edge-kontroll 2026-11-06:** ny flik och automatisk överföring verifierades,
med färska handbyten till bland annat 12626626315. Användaren har därefter
rapporterat fungerande HU-river; inget sådant nytt beslut är självständigt
observerat. Bilden med hand 12626640668 visar tre aktiva och avslag på turn.

**Historisk Edge-kontroll 2026-11-05 efter snabbinstallationen:** pokerfliken visar
”Du har blivit frånkopplad på grund av inaktivitet”, inget aktivt bord. Appen
är omstartad med nya motorn (PID 59988, fönster 15664492) och väntar på data.
Tidigare hand 12625047115 verifierade överföringen, inte ett nytt råd efter
motorbytet. 2 725-ms-resultatet är en syntetisk återspelning genom riktiga UI:t.

## 2. Varför användaren kan se en tom rekommendationsruta

Diagnostisera i denna ordning och dokumentera vilken punkt som faktiskt faller:

1. **Anslutning:** visar panelen ”Väntar på Edge-anslutning” finns ingen aktuell
   bordsdata. En fungerande app innebär inte att observern är ansluten.
   Det installerade tillägget startar i nya pokerflikar och återförsöker efter
   appomstart. Utan handnummer (t.ex. ”Söker efter ett spel”) finns ingen giltig
   bordsström. Äldre manuellt injicerade läsare försvinner vid omladdning.
2. **Färskhet och egen tur:** mottagning måste vara inom 3 sekunder och capture
   inom 4. Ogiltiga kort/belopp, oklar tur eller ändrad hand släcker gamla råd.
3. **Verifierad täckning:** NLHE-provider gäller två aktiva händer på turn/river,
   även vid ett större bord. Checklinje eller första bet/all-in kan matchas.
   Redan höjda/ofullständiga linjer och andra gator får inte denna certifiering.
   6+ har separat provider endast på river. 52-korts equity är avstängd där.
4. **Täckning/kvalitet:** preflop har källmärkta tabellreferenser med begränsad
   stack-/linjetäckning. Flop saknas. Multiway turn/river använder Monker med
   explicit okänd kvalitetsstatus när oberoende kontroll saknas. En misslyckad
   eller underkänd exakt beräkning visar sin felkategori; ingen egen
   experimentmotor används som reserv.
5. **Beräkning:** bara den valda motorn körs. Handbyte, inaktuell avläsning,
   ändrade ranger och avstängd automatik avbryter och släcker gamla svar.
Se [liveanslutningen](docs/live.md) och [beslutsmotorns kvalitetsrapport](docs/decision-engine.md).
Ändra inte avläsningen på chans för att lösa ett verifierat strategiproblem.

## 3. Checkout, versioner och start

**Aktuell checkout 2026-11-04:** `C:\dev\poker`, branch `codex/free-solver-providers`,
HEAD vid granskningen `e87cbc275b72757db16c6e3decaaf996db594e11`.
Sökväg/branch i följande äldre anteckningar avser den tidigare datorn.

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
| `src/live/LivePanel.tsx` | Livepanel, faktisk täckning och felstatus |
| `src/decision/adapter.ts`, `context.ts` | Snapshot till beslutsmodell och historikkontext |
| `src/decision/providers.ts`, `use-decision.ts` | Leverantörsval, gratisstandard, kvalitetsgrind, avbrott och färskhet |
| `src/decision/client.ts`, `worker.ts` | Tidigare experimentflöde; används inte av livepanelen |
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
| 2026-11-02, native VR-regressioner | Först 0 pass/3 fel; efter enbart estimatorkorrektion 2 pass/1 fel; slutligen 3 pass/0 fel | Reproducerad lokal beräknings- och inlärningsrättning |
| 2026-11-02, bred svit efter VR-fix | **143 pass/1 fel**, AA-call 77,0 % i pruningtest, krav över 80 % | Bred strategi fortfarande inte godkänd; tidigare två fel varierar |
| 2026-11-02, upprepning med en tråd | Pruning- och fokustestet passerade två gånger vardera | Samma binär/trösklar men annan träningsordning; inte robusthetsintyg |
| 2026-11-02, aktuell sökgatas identitet | 0 pass/4 fel före; 4 pass/0 fel efter; alla 1176/1128/1081 lagliga privata par hålls isär | Kortrepresentation och exportskydd, inte kvalitet på en tränad strategi |
| 2026-11-02, bred svit med exakt aktuell gata | 147 pass/1 fel; trepersoners-nuts call 58,38 %, sedan 57,58 % efter skärpt fallback-test | Finare kortidentitet räcker inte med befintlig träning/sampling |
| 2026-11-02, gemensam viktad kortsampling | 4 röda regressioner före; 5 gröna efter; hela sviten **153 pass/0 fel** | Kortfördelning, fokus och viktens genomslag; inte generell strategikvalitet |
| 2026-11-02, tidigare trepersoners-nuts efter fokus | 99,9997 % call i riktat test; fyra upprepningar över 99,999 % | Samma budget/krav, foldande blueprint-fallback kvar; bara detta scenario |
| 2026-11-03, native export/seed | 4 röda → 4 gröna regressioner; hela sviten **157 pass** | Export, matchat publikt spel och effektivt slumpfrö; inget allmänt GTO-intyg |
| 2026-11-03, oberoende best-response | 30 fall för 2–10p, tre frön; nio längre fall för 3/10p | Exakt NashConv i små specificerade river-check/jam-spel |
| 2026-11-03, större träningsbudget | 1m uppdateringar: 3p 0,493–0,634 % och 10p 0,618–0,674 % NashConv | Lägre avvikelse än 100k i samma spel; fortfarande otränade 10p-rader och ingen bred certifiering |
| 2026-11-03, ordinarie appsvit | **305 pass, 4 opt-in överhoppade**, TypeScript exit 0 | Tre nya adaptertester och en ny opt-in-probe; ingen ändrad appkärna |
| 2026-11-03, parad policyjämförelse | Medelstrategi lägre NashConv i **38/39** fall; 57 024 medelrader oförändrade | Byte till aktuell regret-policy löser inte kvalitetsgapet i dessa små spel |
| 2026-11-03, senaste native-svit | **157 pass/1 fel**, pruningtest AA-call 74,1 %, krav över 80 % | Äldre stokastiskt fel återkom; fyra isolerade gröna upprepningar upphäver inte felet |
| 2026-11-03, senaste appsvit | **306 pass/4 opt-in överhoppade**, TypeScript exit 0 | Adapter separerar aktuell policy och medelpolicy; ingen produkt- eller liveändring |
| 2026-11-03, checkpoint | 4 röda → 4 gröna regressioner; utökning till **7 gröna** | Konfigurationsavvisning, beroende-/modeåterställning och exakt enkeltrådig fortsättning i ett litet spel |
| 2026-11-03, native-svit efter checkpoint | **164 pass/1 fel**, pruningtest AA-call 63,0 %, krav över 80 % | Checkpointförbättringen löser inte det kvarvarande pruningfelet |

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
- [Samplingaudit efter rättning](docs/evidence/noregrets-sampling-audit.json),
  [upprepning med en tråd](docs/evidence/noregrets-sampling-repeatability.json)
  och [ny IO-probe med båda patcharna](docs/evidence/noregrets-training-sampling-smoke.json).
- [Exakt aktuell sökgata](docs/evidence/noregrets-current-street-audit.json)
  och [dess fulla testkörning](docs/evidence/noregrets-current-street-full-test.log).
- [Aktuell gemensam sampling](docs/evidence/noregrets-joint-audit.json),
  [153-testkörningen](docs/evidence/noregrets-joint-full-test.log) och
  [upprepade trepersonerskontroller](docs/evidence/noregrets-joint-repeatability.json).
- [Ny oberoende native-policy-audit](docs/native-policy-audit.md),
  [sammanställning](docs/evidence/native-policy-quality-summary-2026-11-03.json)
  och [ny app-testlogg](docs/evidence/application-tests-2026-11-03.log).
- [Senaste policyjämförelse](docs/evidence/native-policy-view-summary-2026-11-03.json),
  [samlad evidens inklusive felet](docs/evidence/noregrets-policy-view-evidence.json)
  och [kontrollerad överlämning](docs/evidence/noregrets-policy-view-handoff.json).
- [Checkpointkontrakt](docs/native-checkpoint-format.md) och
  [faktisk CLI-återupptagning för 2–10](docs/evidence/noregrets-checkpoint-cli.json).
- [Checkpointens samlade evidens](docs/evidence/noregrets-checkpoint-evidence.json)
  och [kontrollerad överlämning](docs/evidence/noregrets-checkpoint-handoff.json).

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
Den aktuella kumulativa `advisor-checkpoint.patch` innehåller motor-, VR-,
aktuell-gata-, gemensam-kort-sampling-, export/seed-rättningarna, båda policyvyerna
och versionsbunden återupptagning av träning.
Den appliceras ensam mot ren upstream.
Tidigare patchar och evidens behålls som historik. Motorn utökar 6 till 10
spelare och rättar höjningsrätt efter kort all-in, höjning utan kvarvarande
motståndare med marker samt udda marker per pott.
Den är **isolerad forskning**, inte en installerad beslutsmotor.

Granskade fel/fynd och aktuell status:

1. `bot::tests::round_rooted_search_calls_the_nuts_three_way`: absoluta nuts på
   river foldades 10,64 %, call 89,36 %, mot testkravet över 90 % call.
   Hypotes: aktuell grov bucket blandar ihop handtyper. Det är inte bevisat att
   enbart fler buckets löser det; aktuell exakt hand måste särskiljas och testas.
   Exakt privat par används nu på aktuell sökgata, men testet fallerar
   fortfarande med 58,38 % respektive 57,58 % call i två nya körningar.
   Kortidentiteten är rättad; nästa hypotes är otillräcklig träning av just
   aktuell hand/linje. Frekvens/orsak ska mätas, inte antas.
   **Senare rättning:** viktad gemensam kortsampling med 50 % frågehand-fokus
   gav 99,9997 % call utan ändrad budget eller sänkt krav. Fyra upprepningar
   med 1/4 trådar passerade också. Denna regression är därmed avhjälpt i
   testmodellen; en generell multiway-strategi är fortfarande inte certifierad.
2. `cfr::tests::multiway_focus_keeps_the_fixed_point`: 72o call 27,4 %, krav under
  20 %. Detta test kör utan VR; det är **inte automatiskt samma fel som punkt 3**.
  Både detta fall och nutsfallet passerade i nästa breda körning utan en
  relevant kodändring i deras väg. Felen är inte robust avhjälpta; mätningarna
  varierar med parallell träning. I stället föll pruningfallet med AA-call 77 %.
3. `cfr.rs`, VR kombinerad med fokus/spinesampling: implementationen använder
   `Eσ[b] + (ratio * child - b_selected)`, men korrektionen ska vara
   `Eσ[b] + ratio * (child - b_selected)`. Oberoende tvåhandlingsfall med
   σ=(0,5;0,5), q=(0,25;0,75), b=child=(1;3) har väntevärde 2; aktuell formel
   ger 1,5. **Rättat i `advisor-sampling.patch`:** korrekt residual, fryst
   baseline före dragning samt oviktat inlärningsmål. Tre nya regressioner har
   verifierad röd/grön-körning. Den nya breda sviten är **143 pass, 1 fel**;
   ändringen certifierar inte generell strategikvalitet. Se
   [samplingauditen](docs/evidence/noregrets-sampling-audit.json).
4. **Checkpoint rättad:** hela spel-/träningskonfigurationen binds och mismatch
   avvisas. Blueprint-formatet är ännu obundet. Återanvänd inte exporterade
   policyfiler för andra stackar/blinds. Se [checkpointkontraktet](docs/native-checkpoint-format.md).
5. **Strategisk checkpoint rättad:** den faktiska tidigare policyn och dess
   rolloutinställning lagras och återställs. Blueprint-exporten kräver fortfarande
   separat beroendebindning innan en sådan modell får integreras.
6. Infosetnyckeln består av aktuell bucket + publika tokens och glömmer tidigare
   privat information. Det är inte perfekt minne eller exakt kortisomorfi.
   Den fasta aktuella sökgatan har nu exakta privata par i en separat ephemeral
   kontext; framtida gator och blueprint har fortfarande denna begränsning.

Trösklar i fallerade tester har inte sänkts. Endast syntetiska 20-traversals
IO-modeller och 40 + 20-traversals checkpointprober finns; inga
kvalitetsgodkända breda blueprints har tränats.
Anslut inte dessa filer till rekommendationsvyn.

Lokala kompilatorer är installerade endast under `.research/tools`: Rust GNU
1.99.1 och Zig 0.17.0. Rusts medföljande `rust-lld` länkar; Zig används för
C/ar/dlltool. Global PATH är oförändrad. Undvik att upprepa misslyckade försök
med Zig som Rust-länkare eller den instabila länkflaggformen `gnu-lld`.
Fungerande inställningar och återställning i en ny checkout finns i
[forskningsinstruktionen](research/noregrets/README.md).

## 8. Checklista till avsedd produkt

### Kontroll 2026-11-21

- [x] Lägg in källmärkta flopreferenser för check, satsning, syn, höjning och fold i Egen studie. Prova verkliga handrader för båda positionerna i Windows.
- [x] Pröva konservativ dominans för ett avslutande all-in-val med 2–6 utdelade i den automatiska beslutsvyn.

- [x] Jämför gjorda händer mot lagliga enskilda tvåkortskombinationer och visa rangeantaganden för equity.
- [x] Verifiera kort sexmax push/fold, handbyte, färskhet och åtskillnad mellan råd och lagliga val.
- [x] Återspela 2–6 spelare på alla fyra gator samt check till hjälten på flop, turn och river i Windows.
- [ ] Heltäckande kostnadsfri strategi för öppet flopspel, inklusive check mot bet.
- [x] Tillämpa gemensam tiosekunders tidsgräns från mottaget beslutsläge, inklusive vid upprepade avläsningar.
- [ ] Verifierad felgräns och beslut inom tio sekunder för varje kall postflopmodell med 3–6 aktiva.

### Aktiv leveranschecklista 2026-11-05

- [x] Registrera gratisstandard, valfritt framtida betalspår och stopp för egna experiment.
- [x] Inför providerkontrakt, ta bort experimentella livebeslut och visa faktisk täckning.
- [x] Dokumentera Ika CLI/pris och obesvarade export-/kvalitetskrav.
- [x] Granska aktuella primärkällor, kostnader och dokumenterade gränssnitt.
- [x] Dokumentera källor, beslutsskäl, täckningsluckor och AI-överlämning.
- [ ] Identifiera en gratis kandidat med verifierad täckning för hela kravet.
- [ ] Verifiera modell/licens, komplett export/API och realistisk latens.
- [x] Profilera och jämför Monker Free med bibehållet träd, fullrange och iterationsbudget: 13 prov; bästa upprepade tid 14,0–14,8 s.
- [x] Tolka Monker FREE10114-policy, runtime-nodeordning och kortbucketar samt skilj samplad EV från profil-EV; verifiera exakt NashConv för små 3–6-spelarmodeller.
- [x] Välj explicit multiwaymått med användarens delegation: max ensidig förbättring2 %, med separat redovisad NashConv-summa; regression mot falskt medelgodkännande.
- [x] Verifiera headless numerisk Monker-körning och exakt parsymmetri: små3–5-spelarturnfall godkända inom2,31–2,50s i varm testkedja.
- [x] Anslut riktig lokal Monker-provider för3–6 turn/river med breda ranger, full modellbindning, avbrott och användardelegerad tydlig okänd-kvalitetsmärkning. Windows-UI visar breda syntetiska6p-beslut.
- [x] Importera och anslut fria preflopreferenser: ART/GTO100BB6-max samt HoldemMath HU push/fold, med position/stack/höjningshistorik och tydlig modellmärkning.
- [ ] Utöka till separat lösta2–5-spelarmodeller och fler cash-stackdjup; referensmappning är inte full exakt täckning.
- [ ] Kvalificera bred Monkerstrategi till oberoende verifierad2,1 % inom några sekunder. Aktiverad träningsstrategi med okänd felgräns är inte samma sak som detta kvalitetsmål.
- [ ] Verifiera Monkerbeslut på användarens aktuella Edge-träningshand. Båda öppna pokerflikarna var frånkopplade; ny aktiv hand behövs.
- [x] Anslut separat fri TexasSolver för 6+ HU river med oberoende kvalitetskontroll.
- [x] Rätta exportbeloppens semantik och skilj NashConv från medelmått.
- [x] Mät native+audit och verifiera rekommendationen i Windows-appen.
- [x] Låt användaren ladda om extension 1.1.0 och pokerfliken.
- [x] Inför användarvald 2 %-gräns för NLHE i solve, router och UI.
- [x] Bygg/installera oförändrad Postflop-motor med native JSON-adapter och verifiera det rapporterade turnfallet.
- [ ] Verifiera ett nytt riktigt NLHE-beslut med 2 %-gränsen; senaste fliken visar lobby.
- [ ] Verifiera en aktuell riktig 6+-riverhand efter omladdning; klienten söker spel.
- [ ] Utöka till saknade gator och multiway med kvalificerad källa.

### Historisk produktchecklista

Forsknings- och träningspunkter nedan är bevarade för spårbarhet och ska
inte återupptas under den nuvarande beställningen.

Kryss betyder verifierad del, inte att hela målet är färdigt.

- [x] Körbar Windows-tränare med lokala scenarier och sessionslagring.
- [x] DOM-läsning demonstrerad mot riktig Edge-flik; 2–10 bordsmodell.
- [x] Bettingregler, gemensam kortlek och hand-/resultatidentitet testade.
- [x] Exakt, kvalitetskontrollerad HU-turn/river för matchade begränsade träd.
- [x] Oberoende river-/turn- och liten multiway-orakelkontroll.
- [x] Alla gator/2–10 kan köras tekniskt med experimentworker.
- [x] Reproducerbar projektlogg, testunderlag och AI-överlämning.
- [x] Rätta och regressionstesta native-kandidatens lokala VR/fokus-estimator.
- [x] Särskilj exakta privata par på aktuell sökgata och blockera export till
  ett format som inte beskriver den kontexten.
- [x] Inför gemensam rangerestriktion, viktat frågehand-fokus och genomslag
  av kortsamplingens vikt i både regret och medelstrategi, med oracle-fall.
- [x] Exportera faktisk native-policy och mät oberoende bästa ensidiga
  avvikelse i små, fullständigt enumererade spel för varje antal 2–10.
- [x] Jämför aktuell regret-policy med medelstrategin från samma tabell;
  behåll medelstrategin efter lägre fel i 38/39 små jämförelsefall.
- [x] Bind checkpoints till spel-/träningskonfiguration, modellrevision och
  låsta beroenden; återställ strategiskt beroende och inlärningslägen med regressioner.
- [ ] Ge blueprint-export/laddning samma verifierade spel-/beroendekontrakt
  och kontrollera faktisk konfigurationsmatchning före policyanvändning.
- [ ] Verifiera VPIP/PFR/handantal i det faktiska bordets HTML och utvärdera
  modellförslaget i [statsundersökningen](docs/opponent-stats-research.md).
- [ ] Rätta och granska native-kandidatens öppna estimator-/modellfel, eller
  förkasta den med tydliga mätningar om arkitekturen inte håller.
- [ ] Välj/träna faktisk strategi och fortsättningsmodell för preflop, flop,
  turn och river med flera spelare; bind modeller till spelkonfiguration,
  version, träningsdata, seed och beroenden.
- [ ] Genomför en pruning-fri träningspilot efter modellbindningen; det
  återkommande pruningtestfelet får inte döljas bakom enstaka gröna upprepningar.
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

### 2026-11-02 17:23 Europe/Stockholm — Codex, VR/fokus-estimator

- Arbetade vidare från `e3b14c5`. Appkod och avläsning är oförändrade.
  Sparad native-ändring: `research/noregrets/advisor-sampling.patch`, enbart
  `src/cfr.rs` ovanpå den tidigare separata motorpatchen.
- Testade exakt väntevärde över alla handlingar för 27 kombinationer av policy,
  sampling och baseline, perfekt baseline med noll varians samt en faktisk
  tvåpersoners fold/call-terminal med fokus-sampling över 128 frön.
- Kommando för de tre regressionerna:
  `node scripts/native-research-cargo.mjs test --manifest-path .research/noregrets/Cargo.toml --release --locked -j 4 advisor_vr -- --test-threads=1`.
  Först exit 101, **0 pass/3 fel**: `noregrets-vr-red.log`.
  Efter rättning av estimatorkorrektionen men före rättat inlärningsmål:
  exit 101, **2 pass/1 fel**: `noregrets-vr-target-red.log`.
  Slutligen exit 0, **3 pass/0 fel**: `noregrets-vr-green.log`.
  Alla tre loggar ligger i `docs/evidence/`.
- Rättningen multiplicerar hela residualen med `sigma/q`, fryser baselinen
  före handlingens dragning, håller ingen map-låsning över rekursion och lär
  av det oviktade barnvärdet. Den sista mellanregressionen visade att en redan
  perfekt baseline annars ändrades från 100 till 175 efter ett viktat utfall.
- Bred kontroll:
  `node scripts/native-research-cargo.mjs test --manifest-path .research/noregrets/Cargo.toml --release --locked -j 4 -- --test-threads=2`.
  Med fyra Rayon-trådar: exit 101, **143 pass/1 fel**, 109,59 sekunder.
  Pruningtestets AA-call var 77,0 %, krav över 80 %. Tidigare nuts-/fokusfel
  passerade nu men använder inte VR; de får inte anges som lösta av ändringen.
- Pruning- och fokustestet upprepades två gånger vardera med samma kompilerade
  testbinär, `RAYON_NUM_THREADS=1`, `--exact --test-threads=1`: samtliga exit 0.
  Exakta testnamn, argument och binärhash finns i
  `docs/evidence/noregrets-sampling-repeatability.json`. Detta styrker ett behov
  av kontrollerad träningsordning och flera körningar, inte bred strategikvalitet.
- `node scripts/probe-native-training.mjs`: exit 0. Proben bygger nu själv en
  aktuell release-binär efter källkontroll och binder båda patcharna. Nya
  20-traversals IO-modeller för 2–10 skapades/lästes; de är fortfarande inte råd.
  Äldre IO-underlag har behållits. Nytt resultat:
  `docs/evidence/noregrets-training-sampling-smoke.json`.
- Samlad evidens: `docs/evidence/noregrets-sampling-audit.json`. Varken en ny
  appversion eller en tränad, kvalitetsgodkänd strategi är levererad i detta steg.
- Nästa steg: exakt handrepresentation på aktuell gata i beslutssökningen,
  följt av oberoende kvalitetsmätning med kontrollerad träningsordning. Binda
  spelkonfiguration och beroendemodeller innan större blueprint-träning.

### 2026-11-02 19:05 Europe/Stockholm — Codex, exakt aktuell sökgata

- Föregående målvarv gav faktisk kod-/testevidens i `920517c`; detta steg
  fortsatte från den revisionen. Appkod, avläsning och portable är oförändrade.
- Införde en separat aktuell-brädeskontext i native `Trainer`. På det fasta
  rotbrädet används exakt privat par-ID; vanlig blueprint-träning och framtida
  gator behåller sina nycklar. Policyfrågan använder samma nyckel som träningen.
- Regressioner enumererar alla lagliga privata par på flop/turn/river och
  provar ordningsinvarians, oförändrad bas-/framtidsmodell och exportskydd.
  `to_blueprint` avvisar sökkontexten; checkpoint avvisas före filskrivning,
  med ett regressionstest som bevarar befintligt filinnehåll.
- Kommando:
  `node scripts/native-research-cargo.mjs test --manifest-path .research/noregrets/Cargo.toml --release --locked -j 4 advisor_current_street -- --test-threads=1`.
  Före implementation: exit 101, **0 pass/4 fel**. Efter: exit 0, **4 pass/0 fel**.
  Loggar: `docs/evidence/noregrets-current-street-red.log` och `-green.log`.
- Bred körning med `-- --test-threads=2`, fyra Rayon-trådar: **147 pass/1 fel**,
  exit 101. Trepersoners-nutsfallet gav 58,38 % call, under kravet över 90 %.
  Sparat i `docs/evidence/noregrets-current-street-before-strict-test.log`.
- Skärpte samma kvalitetstest med en avsiktligt foldande blueprint-fallback.
  En saknad sökstrategi kan därmed inte maskeras av standard-call. Ingen
  kvalitetströskel eller träningsbudget ändrades. Ny bred körning: **147 pass/
  1 fel**, exit 101, nuts call **57,58 %**. Logg:
  `docs/evidence/noregrets-current-street-full-test.log`.
  Den senare sviten rapporterade 5004,53 sekunder mot 114,14 för den första;
  orsaken till den långa väggtiden är inte fastställd. Ingen prestandacertifiering.
- `node scripts/probe-native-training.mjs`: exit 0, ombyggd native-binär och
  skapad/inläst 20-traversals IO-modell för vart och ett av 2–10 spelare. Det
  verifierar inte tränade råd. Resultat:
  `docs/evidence/noregrets-current-street-training-smoke.json`.
- Aktuell patch är **kumulativ**:
  `research/noregrets/advisor-current-street.patch`. Applicera den ensam mot
  ren låst upstream. Tidigare två patchar och resultatfiler behålls som historik.
  Samlad aktuell evidens: `docs/evidence/noregrets-current-street-audit.json`.
- Slutsats: korrekt kortidentitet är implementerad men löser inte den
  otillräckligt tränade strategin. Att fler infosets behövs får inte mötas med
  fabricerade frekvenser, sänkt testkrav eller fallback som döljer täckningsluckan.
- Nästa avgränsade steg: mät uppdateringar för frågans privata hand/linje och
  inför korrekt importance-viktad kortsampling. Native `RootSampler` returnerar
  nu inget viktvärde, medan `run_subgame` alltid använder `t` som rotvikt.
  `src/decision/sampler.ts:createDealSampler` har redan en mix av full prior och
  aktuell handklass, gemensam kollisionsrejection och korrektionsvikt som kan
  överföras med separata oracle-tester. Kontrollera även den native
  range-samplerns sekventiella normalisering mot avsedd gemensam rangefördelning.
- Ingen användbar bred blueprint eller ny liveversion har levererats i steget.

### 2026-11-02 19:27 Europe/Stockholm — Codex, gemensam sampling

- Fortsatte från `ca81d19`. Föregående steg var framsteg: exakt kortidentitet
  och mätningen 57,58 % nuts-call visade att rätt representation inte räckte.
- Införde native `JointSampler`: produktpriorer med publika kortblockerare,
  hel omdragning vid kollision, 50/50-mix mellan prior och frågehand. Samma
  motståndarmodell tränas med `p/q`; spelarens riktiga kort hålls inte alltid
  fasta i motståndarnas traverseringar. Foldade spelares viktade döda kort
  samplas också. Begränsade numeriska/omöjliga ranger ger uttryckligt fel.
- `RootSampler` returnerar nu en vikt eller fel. `run_subgame` applicerar
  vikten före regret-/medelstrategiuppdatering och avvisar ogiltiga vikter.
  Native Policy-omslaget stoppar fortfarande med `expect` vid samplingfel;
  strukturerad appfelhantering återstår före integration.
- Röda regressioner visade faktisk bias i legacy-samplern: tre lika viktade
  kompatibla profiler fick 10092/5010/4898 observationer i stället för 1:1:1.
  Viktens genomslag saknades också. Ingen tröskel sänktes.
- Kommando:
  `node scripts/native-research-cargo.mjs test --manifest-path .research/noregrets/Cargo.toml --release --locked -j 4 advisor_joint_sampler -- --test-threads=1`.
  Före: exit 101, **0 pass/4 fel** (`docs/evidence/noregrets-joint-red.log`).
  Efter: exit 0, **5 pass/0 fel** (`docs/evidence/noregrets-joint-green.log`).
  Ett ytterligare test täcker ojämna vikter med radskalor 1e300/1e-300,
  publika blockerare och foldade kort. De normaliserade profilvikterna är
  oberoende räknade 3:2:1; empiriska avvikelser ska vara under 2 procentenheter.
- Bred svit, samma cargo-kommando utan testfilter och med
  `-- --test-threads=2`: exit 0, **153 pass/0 fel**, 135,19 sekunder.
  Evidens: `docs/evidence/noregrets-joint-full-test.log`.
- Riktat tidigare fall:
  `... bot::tests::round_rooted_search_calls_the_nuts_three_way -- --exact --test-threads=1 --nocapture`:
  exit 0, call **0,999997006514**, samma 40 000 iterationer/60 s-gräns och
  foldande blueprint-fallback. Logg: `docs/evidence/noregrets-joint-nuts-test.log`.
- Upprepade samma kompilerade fall två gånger med `RAYON_NUM_THREADS=1`
  och två med `4`, en Rust-testtråd: alla exit 0. Call låg mellan
  0,999998695676 och 0,999999932189. Exakta argument, resultat och binärhash:
  `docs/evidence/noregrets-joint-repeatability.json`.
- `node scripts/probe-native-training.mjs`: exit 0, ombyggd native-binär och
  IO-modeller för varje antal 2–10. 20 traversaler per modell är bara IO-data.
  Aktuell kumulativ patch: `research/noregrets/advisor-joint-sampling.patch`,
  appliceras ensam mot ren upstream. Äldre patchar/resultat behålls.
- Samlad evidens: `docs/evidence/noregrets-joint-audit.json`. Appkoden,
  avläsningen och den paketerade versionen ändrades inte.
- Kvar: oberoende best-response-kontroll av den nya nativepolicyn, framtida
  gators abstraktion, modellkonfiguration/beroenden och användbara tränade
  blueprints. En hel grön svit är inte generell GTO-certifiering.

### 2026-11-02 — VPIP/PFR, undersökning på användarens begäran

- Användaren uppger att VPIP/PFR syns och att ett bord har öppnats. Försökte
  först läsa via anslutna DevTools, som bara visade `about:blank`.
- Computer Use rapporterade avstängd lokal browseråtkomst i Work och stoppade
  sedan Edge-läsningen eftersom aktuell URL inte kunde fastställas säkert.
  Inga försök att kringgå stoppet eller ändra inställningarna gjordes.
- **HTML-fälten är inte verifierade.** Ingen ny statsavläsning eller
  rangeheuristik har lagts in. Detta hindrar statsundersökningen, inte det
  oberoende solverarbetet.
- Sparade primärkällor, avgränsning av ±5–10 procentenheter, modellförslag och
  DOM-checklista i `docs/opponent-stats-research.md`. Fortsatt HTML-arbete
  kräver en fungerande tillåten anslutning till pokerfliken.

### 2026-11-03 — Codex, native-policy-export och oberoende audit

- Fortsatte från `0fa3403`. Föregående steg var framsteg: korrigerad sampling,
  153 gröna native-tester och avhjälpt avgränsat nuts-fel. Ingen bred
  strategiverifiering hade ännu genomförts.
- Nytt `advisor-audit --input ... --output ...` exporterar medelstrategin,
  hela publika trädet, lagliga belopp, egna privata rader och uttrycklig
  `trained`-status i ett avgränsat riverspel. Otränade rader får uniforma
  frekvenser som ingår i kontrollen. Det är inte en generell liveadapter.
- Fann och reproducerade att subgame-sökningen ignorerade konfigurerat seed.
  `TrainConfig.seed` deltar nu i dess RNG. Enkeltrådstest bekräftar samma
  dragningar för samma frö och olika för olika frön.
- Röd/grön-körning:
  `node scripts/native-research-cargo.mjs test --manifest-path .research/noregrets/Cargo.toml --release --locked -j 4 advisor_audit -- --test-threads=1`.
  Före exit 101, 0 pass/4 fel; efter exit 0, 4 pass/0 fel. Loggar:
  `docs/evidence/noregrets-policy-export-red.log` och `-green.log`.
- Separat TS-adapter jämför samtliga publika noder med orakelns eget spel,
  även off-policy-grenar. Kalibrering och negativa tester av saknade grenar,
  fel handlingar/stackar/bräde/privata rader gav 10 pass/2 opt-in överhoppade
  tillsammans med befintliga oracle-tester. Ingen native EV/CFV används som facit.
- Körde `POKER_NATIVE_POLICY_PROBE=1` med
  `npx vitest run tests/native-policy-quality.test.ts --maxWorkers=1`:
  exit 0, 30 fall, varje antal 2–10, frön 395/396/397, 100k uppdateringar.
  Viktade ranger ingår vid 3p. Alla publika spel matchade och EV var nollsumma.
- Ny körning med `POKER_NATIVE_POLICY_LONG=1`: exit 0, nio fall, 1m
  uppdateringar för 3/10p över samma frön. NashConv blev 0,493–0,634 % vid 3p
  och 0,618–0,674 % vid 10p. Det är summan av ensidiga förbättringar delad med
  startpotten. Det är inte HU-exploaterbarhet eller en generell felgräns.
- Långseriens 10p-profiler hade fortfarande 2211–3008 otränade efterfrågade
  infosets. De ingår i uppmätt profil som uniform policy; de räknas inte bort.
  Resultatet visar förbättring med budget, inte heltäckande konvergens.
- Källor, indata, mätdefinition och reproduktion finns i `docs/native-policy-audit.md`.
  Aggregatfilerna i `docs/evidence/native-policy-quality*-2026-11-03.json`
  anger kompletta/delvisa körningar, faktisk budget, binär- och källpatchhash.
  Fyra par av faktiska trepersonersindata och profiler sparas beständigt; större råprofiler
  ligger under ignorerade `artifacts/native-policy-quality/`.
- Hela native-sviten: exit 0, **157 pass**, 109,69 s. Ordinarie appsvit:
  `npm test -- --pool=threads --maxWorkers=1`, exit 0, **305 pass/4 opt-in
  överhoppade**, 29,89 s. `npx tsc --noEmit`: exit 0.
- `node scripts/probe-native-training.mjs`: exit 0, syntetisk modell-IO 2–10.
  Den aktuella patchen är `research/noregrets/advisor-policy-audit.patch`,
  kumulativ från ren låst upstream. Appkärna/avläsning och portable är oförändrade.
- Nästa kvalitetsspår: jämför medelstrategi/current-policy och härled korrekt
  multiway-averaging med oberoende samma-spel-kontroll. OpenSpiel beskriver
  flerpartscaveat för enkel averaging; det är en granskningsfråga, inte ännu
  bevisad orsak till detta felmått. Modellkonfiguration/beroenden, framtida
  gators modell och användbara breda blueprints återstår före appintegration.

### 2026-11-03 00:58 Europe/Stockholm — Codex, jämförelse av två policyvyer

- Hypotes: sista regret-policyn kunde ge bättre råd än den ackumulerade
  medelstrategin. Exporten läser nu båda ur samma färdigtränade tabell utan
  extra träning. Standardval och appkod är oförändrade.
- Native-regressionen `advisor_current_policy_is_regret_matching_not_time_average`
  gav först 0 pass/1 fel och sedan 1 pass/0 fel. Kommando:
  `node scripts/native-research-cargo.mjs test --manifest-path .research/noregrets/Cargo.toml --release --locked -j 4 advisor_current_policy -- --test-threads=1`.
  Evidens: `docs/evidence/noregrets-current-policy-{red,green}.log`.
- `npx vitest run tests/native-audit-profile.test.ts --maxWorkers=1`:
  först 3 pass/1 fel, sedan 4 pass/0 fel. En kalibreringsprofil har NashConv
  1,5 marker i medelvyn och 0 i aktuell vy och avslöjar förväxling av vyerna.
  Evidens: `docs/evidence/native-current-policy-adapter-{red,green}.log`.
- Samma `POKER_NATIVE_POLICY_PROBE=1`-kommando som föregående steg, och sedan
  med `POKER_NATIVE_POLICY_LONG=1`, gav 30 respektive 9 kompletta fall.
  Samma spel, frön och budgetar; båda vyer värderas av separat best-response.
  Rapporter: `docs/evidence/native-policy-view-quality*-2026-11-03.json`.
- Medelstrategin vann 38/39 jämförelser. Vid en miljon uppdateringar blev
  aktuell policy 3,176–7,080 % NashConv för 3p och 1,780–4,265 % för 10p;
  medelstrategin var 0,493–0,634 % respektive 0,618–0,674 %.
  Alla 57 024 medelrader matchar tidigare profiler inom 1e-12 och deras
  NashConv inom 1e-10. Sammandrag:
  `docs/evidence/native-policy-view-summary-2026-11-03.json`.
- `trained` betyder positiv medelmassa; `currentVisited` betyder en befintlig
  regret-nod. Den senare är inte ett konvergensbevis. Otränade rader ingår i
  båda kontrollerna som uttrycklig uniform policy.
- Full native-svit med `-- --test-threads=2`: exit 101, **157 pass/1 fel**,
  128,12 s. `cfr::tests::pluribus_prune_keeps_the_fixed_point` gav AA-call
  74,1 %, krav över 80 %. Logg: `docs/evidence/noregrets-policy-view-full-test.log`.
  Fyra isolerade upprepningar med en/fyra Rayon-trådar passerade, oförändrad
  tröskel: `docs/evidence/noregrets-policy-view-pruning-repeatability.json`.
  Detta är diagnostik, inte ett grönt slutresultat för den breda sviten.
- `npm test -- --pool=threads --maxWorkers=1`: exit 0, **306 pass/4 opt-in
  överhoppade**, 31,01 s; `npx tsc --noEmit`: exit 0.
  `node scripts/probe-native-training.mjs`: exit 0, ombyggd binär och enbart
  syntetisk 20-traversals modell-IO för varje antal 2–10.
- Aktuell kumulativ patch: `research/noregrets/advisor-policy-comparison.patch`,
  appliceras ensam mot ren låst upstream. Reproduktion och begränsningar:
  `docs/native-policy-audit.md` och `research/noregrets/README.md`.
- Beslut: behåll medelstrategin. Prioritera modell-/beroendebindning och en
  pruning-fri träningspilot före större blueprintjobb. Ingen ny portable,
  appintegration eller liveverifiering har genomförts. VPIP/PFR-HTML är ännu
  inte verifierad; browseråtkomsten var blockerad enligt föregående post.

### 2026-11-03 01:08 Europe/Stockholm — Codex, versionsbunden checkpoint

- Föregående steg gav framsteg: 39 parade jämförelser och bevarad medelpolicy.
  Nästa hinder för användbar förträning var checkpointens saknade spelidentitet
  och tappade strategiberoenden. Ingen aktuell liveanslutning verifierades.
- Fyra nya regressioner reproducerade accepterat fel spelarantal, tappade
  inlärningslägen, tappat strategiskt beroende och accepterad orphan-export.
  Exakt kommando:
  `node scripts/native-research-cargo.mjs test --manifest-path .research/noregrets/Cargo.toml --release --locked -j 4 advisor_checkpoint -- --test-threads=1`.
  Före: exit 101, 0 pass/4 fel. Efter: exit 0, 4 pass/0 fel. Evidens:
  `docs/evidence/noregrets-checkpoint-red.log` och `-green.log`.
- Nytt `PGTOCP01`-format lagrar hela TrainConfig, modellrevision, Cargo.lock,
  abstraktion/centroids, föregående strategiska policy, CFR+/QRE/VR/RNR,
  VR-baselines, iterationsräknare och regrets/medelvikter. Gamla obundna
  checkpointar avvisas. Validering sker före skrivning till separat temporär fil.
- Utökad kontroll: exit 0, 7 pass/0 fel. Täcker även fel schema/dependencies,
  korrupta/extra bytes, ephemeral sökkontext och exakt enkeltrådig fortsättning
  efter 500 + 500 traversaler. Alla regrets/medelvikter och baselines matchade.
  Logg: `docs/evidence/noregrets-checkpoint-green-extended.log`.
- Full native-svit, samma kommando utan filter och med `-- --test-threads=2`:
  exit 101, **164 pass/1 fel**, 127,26 s. Det äldre pruningtestet fick AA-call
  63,0 %, krav över 80 %. Felet bevaras i
  `docs/evidence/noregrets-checkpoint-full-test.log`; ingen tröskel sänktes.
- Aktuell kumulativ patch är `research/noregrets/advisor-checkpoint.patch`,
  appliceras ensam mot ren låst upstream. Format, officiella referenser och
  reproduktion finns i `docs/native-checkpoint-format.md`.
- Kvar: blueprint-export/laddning är fortfarande obunden. Ingen appintegration
  eller bred strategicertifiering följer av säkrare återupptagning. Förträning
  ska köras utan pruning tills den vägen har egen kvalitetsverifiering.
- `node scripts/probe-native-training.mjs`: exit 0, ny källkontrollerad binär
  och syntetisk 20-traversals IO per antal 2–10.
  `node scripts/probe-native-checkpoint.mjs`: exit 0, nio faktiska CLI-
  återupptagningar från 40 till 60 traversaler med VR bevarat; 36 felanrop
  avvisades och befintliga checkpoint-/målbytes bevarades.
  Rapporter: `docs/evidence/noregrets-checkpoint-{training-smoke,cli}.json`.
- Ny pruning-fri oberoende policykontroll:
  `POKER_NATIVE_POLICY_PROBE=1 npx vitest run tests/native-policy-quality.test.ts --maxWorkers=1`
  (miljövariabel sätts separat i PowerShell enligt reproduktionsavsnittet).
  Exit 0, 30 kompletta fall, 100k uppdateringar, 2–10p och tre frön, viktad 3p.
  Rapport: `docs/evidence/native-policy-checkpoint-quality-2026-11-03.json`.
  `npx tsc --noEmit` och `node --check scripts/probe-native-checkpoint.mjs`: exit 0.
- Alla **36 912 exporterade policyrader** i den nya 30-fallsserien, både aktuell
  och medelstrategi, matchar föregående profil exakt. Oberoende kvalitetsrapporter
  matchar också. Detta avgränsar checkpointändringen från strategiberäkningen;
  det är inte ett nytt strategigodkännande. Sammandrag:
  `docs/evidence/native-policy-checkpoint-quality-summary-2026-11-03.json`.
- Samlad käll-/binär-/loggbindning och överlämning:
  `docs/evidence/noregrets-checkpoint-evidence.json` och
  `docs/evidence/noregrets-checkpoint-handoff.json`. Appkärna, avläsning och
  portable är oförändrade. Nästa steg är blueprintens spel-/beroendekontrakt,
  därefter pruning-fri träningspilot med verklig kvalitetsmätning.

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

### 2026-11-04 — gratis extern solver, granskning och överlämning

- Användaren stoppade ytterligare solverexperiment och krävde därefter gratis.
  Arbetet avgränsades till läsning, leverantörsgranskning och dokumentation.
- Ny evidensrapport: `docs/solver-selection-2026-11-04.md` med primärkällor,
  täckning/pris, tydliga kunskapsluckor, adapterkrav och överlämningsprompt.
- MonkerSolver full kostar enligt produktsidan 499 EUR och är bortvald.
  Gratisversionen täcker bara turn/river. Ingen publik all-street-API verifierad.
- Aktuell NoRegrets-README anger 2–6 spelare och enbart kommersiell leverans
  av förtränade modeller. Zeta anger HU-postflop och högst 7p multiway river.
  TexasSolver/b-inary styrker inte komplett 2–10/all-street-täckning.
- Resultat: ingen gratis integrationsklar kandidat kvalificerad. Ingen ny
  solver, modell, licens, produktkod, träning eller testkörning tillagd.
  Tidigare negativa testresultat bevaras. Detta är inte färdig GTO-leverans.
- Lokal read-only-inventering med Get-CimInstance Win32_ComputerSystem och
  Win32_Processor: 15,7 GiB RAM, i5-11300H, 4 kärnor/8 logiska processorer.
- Dokumentkontroll: `git diff --check` samt kontroll av rapportens existens,
  interna dokumentlänkar och ändringsomfång. Se även kopia i chattens outputs.
- Nästa steg kräver en ny konkret källa som klarar rapportens inträdeskrav.
  Gamla uppgifter om blueprintbindning/träningspilot är inte aktiv beställning.

### 2026-11-04 — reviderat krav 2–6 och kombination av solvers

- Användaren accepterar nu 2–6 spelare och flera kombinerade motorer. Gratis
  och tidigare stopp för egna experiment kvarstår.
- Uppdaterade granskningsrapporten med täckningsmatris och ett tekniskt
  överlämningskontrakt mellan motorer. Ingen produktkod ändrad.
- Ny primärkällkontroll: GTOpen har approximativ preflopfortsättning och endast
  HU-postflop. CFR-NLHE-6max v0.6.0 levererar 3p/100bb-modeller med uttryckliga
  kvalitets- och licensluckor. NoRegrets releases-sida saknar releaser.
- Slutsats: kombination möjlig i princip, men ingen komplett kvalificerad
  gratis kombination hittad. Preflop och flop med 3–6 kvar är centrala luckor;
  Monker Free turn/river saknar här verifierad automatisk integrationsväg.
- Kontroll: git diff --check, kontroll av logglänk och identisk rapportkopia
  till chattens outputs. Inga solver-/modell-/träningsexperiment kördes.
- Nästa AI använder 2–6-kravet och hybridmatrisen, inte de äldre tiopelarplanerna.

### 2026-11-04 — Gratis providerflöde, stopp för experimentella liveråd och betalspår

**Senaste beställning:** bästa möjliga gratisimplementation nu, valfri billig
betalmotor senare. Användarens ”fortsätt” bekräftade fortsatt implementation och
kontroll. Full 2–6/all-street-strategi är fortfarande inte levererad.

**Ändring:** `src/decision/providers.ts` inför ett gemensamt kontrakt och routing
med gratis först, betalda avstängda som standard, identitets-/kvalitetskontroll
samt avbrott utan sena reservjobb. `use-decision.ts` använder bara fria
Postflop-adaptern i standardfabriken. Experimentworker och dess UI-opt-in är
borttagna ur liveflödet. Forskningskod och historisk negativ evidens bevaras.
Livepanelen visar faktisk täckning, källa och modellantaganden; beslutsvyn
skiljer otillgänglig strategi, underkänd lösning och beräkningsfel.

**Täckning:** oförändrad HU turn/river i matchande träd, utan rake och med
angivna ranger. Preflop/flop/multiway får inga fabricerade rekommendationer.
Ny providerregistrering kräver full modell- och resultatvalidering. Routerns
rotkontroll ensam är inte ett matematiskt kvalitetsintyg för externa motorer.

**Validering (Windows, Node 22.20.0, Electron 45.1.0):**

- `npm test -- tests/decision-hook.test.ts` före fix: 4 av 5 röda, reproducerade
  onödig experimentberäkning, dolt solverfel och otillräckligt täckningsbesked.
- `npm test -- tests/decision-hook.test.ts tests/decision-providers.test.ts tests/decision-river.test.ts tests/postflop-wasm.test.ts`:
  49 pass och 1 timeout i befintligt oberoende turn/BR-test (5000 ms).
- `npm test -- --maxWorkers=1`: 330 pass, 4 överhoppade opt-in-forskningstester,
  0 fel, 163,72 s. Samma turntest passerade utan höjd timeout eller sänkt krav.
- Efter fem extra tester av freshness/disable/invalid/turn:
  `npm test -- tests/decision-hook.test.ts tests/decision-providers.test.ts --maxWorkers=1`:
  32 pass, 0 fel, 13,67 s.
- `npm run build`: godkänt, inklusive TypeScript och Vite. Senaste bygge
  innehåller källangivelse och generell EV-referens för framtida providers.
- `npm run smoke:desktop`, med `POKER_SMOKE_OUTPUT=C:\dev\poker\artifacts\free-solver-2026-11-04`:
  godkänt även efter slutlig stale-regression. 20 täckningsfall för 2–6 på fyra
  gator, verklig turn-/river-WASM, multiway-equity 3/4/5/6, inga experimentval,
  synliga råd släcks efter turbyte, ogiltig och därefter gammal avläsning.
  Ingen oväntad renderer-error, sessionslagring och layouter godkända.
- `git diff --check`: godkänt. Inget pushat eller publicerat.

**Ytterligare fri kandidat:** officiella TexasSolver v0.2.0 Windows hämtades
separat till chattens `work`. Oförändrade leverantörsprovet kördes med
`console_solver.exe -i resources/text/commandline_sample_input.txt` och en
30-sekunders väggtidsbudget. Avbrutet efter 30,85 s utan komplett export;
sista utskrift iteration 41 / 1,4131937 %. Detta kvalificerar inte kandidaten
för liveråd men utesluter inte användbar offlinekörning. Ingen egen
solveralgoritm/träningsmodell skapades och ingen Texas-provider aktiverades.

**Betalspår:** IkaSolver NLHE + Trainer anges till 199 USD engångsvis och upp
till nio spelare; billigaste granskade kandidat med annonserad önskad täckning.
CLI är dokumenterad, men komplett parser/API för .iks, integrationsrättigheter,
faktisk kvalitet och latens är inte fastställda. Ingen licens/betalmotor köpt.
Konkreta krav och primärkällor finns i `docs/solver-integration.md`.

**Faktisk app:** den äldre appinstansen stängdes och senaste lokala bygget
startades med `electron . --live`. PID 71284 / fönster 1705910 vid kontroll.
Gränssnittet visar fri Postflop, faktisk HU-turn/river-täckning och inget
experimentval. Appen väntar på Edge; den befintliga pokerfliken visade lobbyn.
Detta är verifierad appstart, inte en verifierad aktuell handanslutning.
Ingen pokerhandling, ny inloggning eller bordsanslutning genomfördes.

**Evidens:**
`docs/evidence/free-solver-verification-2026-11-04.json`,
`docs/evidence/free-solver-desktop-2026-11-04.json`,
`docs/evidence/texassolver-v020-vendor-sample-2026-11-04.log`.
Skärmbilder finns lokalt under `artifacts/free-solver-2026-11-04/`.

**Nästa steg:** kvalificera nya strategikällor innan täckningen utökas.
TexasSolver behöver export-/trädgranskning och latens för relevant modell;
preflop och flerpartspotter kräver andra källor. Ika-spåret börjar med
format/rättigheter/kvalitetsmått, inte ett köp. Behåll gratisstandard och
återstarta inte de gamla underkända forskningsförsöken.

### 2026-11-05 — Anslut nytt bord, återanslutning och korrekt sittöverstatus

**Beställning:** användaren ville att ett nyöppnat bord skulle kopplas och
upptäckas automatiskt. Därefter visade bilder två olika skäl till tomma råd.
Ny flik saknade den gamla dokumentbundna läsaren; en separat bild blockerades
av en sittöver-spelare och den sista visade HU-flop utan ansluten strategi.

**Observerat live före rättning:** nya Edge-fliken 97290035 anslöts med den
befintliga läsande DOM-sensorn. Kvitterade snapshots och aktuella belopp syntes
i appen. CDP-kontroll visade synliga .player-sit-out-markörer på säte 6, inga
kort och bet 0; spelaren skickades ändå som inHand=false/folded=false och
blockerade oklar-deltagandekontrollen. Ingen pokerhandling utfördes.

**Ändring:** valfri sittingOut-flagga, endast vid explicit synlig markör,
helt frånvarande kort och ingen insats. Sätet är fortfarande upptaget men
räknas inte som deltagare eller fold. Kort eller bet förhindrar exkludering;
frånvaro av kort ensam klassas fortfarande som okänd. Positioner, beslut,
equity, cacheidentitet och bryggvalidering följer samma semantik.

Gemensam startTableObserver återansluter med begränsad backoff efter även
fler än 30 transportfel; skickar färsk capture och överlappar inte överföringar.
Ett MV3-tillägg återanvänder samma DOM-läsare i isolerat content script och
skickar via service worker till en fast autentiserad loopback-adress. Endast
Svenska Spels pokerklientsökväg matchas. Parningskod lagras lokalt, åtkomst
begränsas till trusted extension contexts och lämnas inte till content script.
Nya dokument får läsaren genom manifestet. En ström åt gången bevaras.

**Validering:**
- Tre nya readerregressioner var röda före sittöverändringen.
- Tidiga nya observer-/relaytester saknade implementation; efter implementation
  upptäcktes en ofullständig testfixture (players saknades), som rättades till
  ett komplett LiveSnapshot. Detta var testuppsättning, inte produktkvalitet.
- npm test -- tests/live-reader.test.ts tests/live-observer.test.ts tests/extension-relay.test.ts tests/live-bridge.test.ts tests/decision-providers.test.ts tests/live-analysis.test.ts --maxWorkers=1:
  45 pass, 0 fel.
- npm test -- --maxWorkers=1: 350 pass, 4 opt-in-forskningstester överhoppade,
  0 fel, 114,74 s. Logg sparad som evidens nedan.
- npm run build och node scripts/build-extension.mjs: godkända.
- Electron smoke kompletterad med ett upptaget sittöver-säte i verkliga
  HU-fixtures. Separat utfall dokumenteras i evidensrapporten.

**Drift:** appen omstartad till senaste bygge, PID 63892/fönster 2231258 vid
kontroll. Edge visade nu Identifiering, ingen pokerklient/bordflik fanns kvar.
Därför ingen ny aktuell hand verifierad efter rättningen. Ingen inloggning
eller spelhandling utförd. Extensionen är ännu INTE installerad och riktig
nyflik/omladdningsautomatik i Edge är inte verifierad. Användaren har fått en
konkret fråga om installation och InPrivate-åtkomst enligt datorstyrningens
krav på godkännande för ny varaktig åtkomst; inget svar ännu.

**Leverans:** docs/edge-live-reader.md, byggbar källkod och
release/edge-live-reader. Installerbara filer även i chattens outputs/edge-live-reader.zip.
Nästa steg är godkänd installation, lokal engångsparning och riktig Edge-
verifiering på en öppnad pokerklient. Flop/preflop/multiway-strategi saknas
fortfarande och ska inte sammanblandas med anslutningsrättningen.

Slutlig Electron smoke 2026-11-05: godkänd, 20 täckningsfall, inklusive
sittöver-säte genom riktig loopback-brygga och HU-turn/river-WASM.
Evidens: docs/evidence/auto-reader-desktop-2026-11-05.json och
      docs/evidence/auto-reader-tests-2026-11-05.log.
350 godkända tester verifierar funktion; strategitäckningen är oförändrad.

### 2026-11-05 — Installation godkänd men blockerad av datorstyrningen

Användaren godkände uttryckligen installation och InPrivate-åtkomst för det
färdiga tillägget. Försök att öppna edge://extensions/ genom den dokumenterade
Edge-anslutningen avvisades av automatisk webbläsarpolicy: endast http/https
är tillåtna. Verktyget förbjöd uttryckligen alternativa ytor, CDP eller andra
omvägar för samma åtgärd. Ingen sådan omväg försöktes.

Status: tillägget är byggt och godkänt för installation av användaren men
INTE installerat/parat. InPrivate-åtkomst och automatisk upptäckt i riktig Edge
är därmed ännu inte verifierade. Användaren behöver installera manuellt enligt
docs/edge-live-reader.md. Detta är ett verktygspolicyhinder, inte avsaknad av
användarens tillstånd. Be inte om samma tillstånd igen.

### 2026-11-05 — Användaren installerade tillägget manuellt

Read-only-kontroll av Edges lokala inställningar bekräftar registrering av
C:\dev\poker\release\edge-live-reader, ID ddobhopkagmjfcbadadggbadbdlpnjed.
InPrivate-flaggan är inte true och lokal tilläggslagring/parningsnyckel saknas.
Installation är därmed bekräftad, men parning, InPrivate och automatisk riktig
bordsavläsning återstår. Ingen webbläsarinställning eller lagring skrevs direkt.
Interna Edge-sidor är fortsatt blockerade för datorstyrning; användaren behöver
utföra dessa två inställningar. Inga tokens skrivna till logg.

### 2026-11-05 — InPrivate och kod sparade; nytt dokument söker fortfarande spel

Read-only-kontroll bekräftar installerat tillägg, incognito=true och förekomst
av pairToken i lokal tilläggslagring. Värdet lästes/skrevs inte till logg.
Ny pokerflik 97290083 upptäcktes utan att någon sensor injicerades manuellt.
Klienten visade fortfarande ”Söker efter ett spel … FL Hold'em — 6Max”.
Ingen pågående hand fanns; appen hade ingen snapshot. Automatisk fullständig
bordsöverföring är därför ännu inte verifierad. Bara dokumentets existens,
installationen och sparad konfiguration är bekräftade. FL är fixed-limit;
aktuell strategimotor är NLHE och stödjer inte FL-regler. Ingen spelhandling
eller bords-/insatsändring utfördes.

### 2026-11-05 — Automatisk anslutning verifierad i ny riktig pokerflik

Användaren öppnade en ny flik, 97290090. Ingen DOM-sensor injicerades manuellt
i denna flik. Appen visade ”Live · uppdateras automatiskt”, samma handnummer
12624934249 som pokerklienten, två aktiva/ockuperade på sex säten och cirka
486 ms sedan mottagning. Automatisk fångst och transport från det installerade,
parade InPrivate-tillägget är därmed verifierad för detta nya dokument.

Klientens rootClass lästes separat via read-only CDP:
POKER_GAME_TYPE_SIX_PLUS_HOLDEM. Detta är 6+ Hold’em, varför den befintliga
variationskontrollen avvisade strategiråd med ”Endast Texas Hold’em stöds”.
Detta var inte ett anslutningsfel. Ingen spelhandling, omladdning, kodinjektion
eller ändring av variantspärren gjordes. Vanlig NLHE och faktisk solverrespons
på ett aktuellt sådant bord har inte verifierats i denna kontroll.

### 2026-11-05 — Begäran om gratis 6+-solver: regel- och nativeprov

Läs docs/shortdeck-solver-2026-11-05.md för primärkällor, reproducibla filer och
återstående integrationskrav. TexasSolver v0.2.0 shortdeck matchade alla
376 992 femkortshänder i en oberoende kontroll, inklusive Svenska Spels
triss/stege- och färg/kåk-ordning. Två syntetiska native HU-riverfall kördes;
fullrange tog 2,37 s och rapporterade 0,16784862 % i motorns eget medelmått.
Oberoende exportkontroll gav NashConv 0,3862574464 % eller medel 0,1931287232 %
av rotpotten och tog cirka 36–40 s. Måtten är inte likvärdiga utan dokumenterad
normalisering; dessutom skiljer sig solverutskriften från exportkontrollen.
Skillnadens orsak är inte fastställd. Ingen provider registrerad eller gate
sänkt. Alla prover är syntetiska; inga spelhandlingar genomfördes.

Nya offline-verifieringsskript och evidens ligger i scripts och docs/evidence.
Oraklet fick valfri separat kortvärderare; standardvärderaren förblir förvald.
Försök till cacheoptimering återtogs när det inte gav förbättring.
Kommando npm test -- tests/postflop-wasm.test.ts --maxWorkers=1: 17 pass,
40,36 s. Initialt kontrollskript hittade inte referenshänder på grund av
olika ordning på kort i råtabellen; kanonisering rättade testläsningen.

MÅLET INTE UPPNÅTT: fungerande 6+-liveråd är inte levererade. Regelmatchning och
en snabb solve är verifierade delresultat, men range-/helträdsmatchning,
processintegration, kvalitetsmåttsgranskning och praktisk total latens saknas.
Nästa AI ska fortsätta från evidensen, inte presentera standard-NLHE-råd på
6+-bord eller omdöpa denna granskning till färdig integration.

### 2026-11-05 — 6+ HU-river integrerad; felmått rättade och audit accelererad

Tidigare post om ej registrerad provider är ersatt för HU-river. Fullmålet
2–6 aktiva på alla gator är fortfarande INTE uppnått.

Rotorsak: TexasSolvers BET/RAISE-belopp är ytterligare insats, inte ny total.
Rättad import gör native-medelmåttet och oberoende kontrollen samstämmiga.
Native visar halva BR-summan; 6+-UI visar explicit NashConv / rotpott, hela
summan. Den gamla exporten är med rätt import 0,33569724 % NashConv och
underkänns. Tidigare 0,3862574464 % och skillnadsförklaring är ersatt historik.
Ingen gate sänkt. Native-mål 0,05 % medel, oberoende gate 0,2 % NashConv.

Implementerat: variantmetadata genom extension/brygga/nycklar/provider,
separat TexasSolver-process med hashkontroll, fast argv/shell:false,
18 s native+audit-budget, cancellation och separat audit-worker. Importen
kontrollerar rangeuniversum/vikter, kortblockering, fulla grenar och lagliga
heltalsbelopp. Uniforma kombinationer inom handklasser krävs av native-CLI.
Sena svar blockeras; inga MCCFR-reservråd. 52-korts-equity körs inte för 6+.

Vectoriserad counterfactual audit minskar skalär kontroll från 36–51 s till
cirka 0,2–0,6 s i detta fullrangeprov utan att ge BR tillgång till dolda kort.
Viktade delmängder jämförs mot separat skalärt orakel. Oberoende NashConv
0,0976582425 %, native-medel 0,048821066 %, oberoende medel 0,0488291213 %.
Serviceprov 4259 ms inklusive 595 ms audit. Senare omkontroll av installerad
kopia 1891 ms inklusive 204 ms audit. Det är mätningar, ingen latensgaranti.

EXE och resources installerade separat i:
C:\Users\ryd\AppData\Roaming\Poker GTO Advisor\solvers\texassolver-v0.2.0.
Officiell binär v0.2.0, ingen leverantörskällkod införlivad, inga binärer Git.
Hash/licens/proveniens i docs/solver-provenance.json och THIRD_PARTY_NOTICES.md.

Exakta slutkontroller:
- npm test -- --maxWorkers=1 --testTimeout=15000: 358 pass, 4 opt-in skip,
  373,07 s. Första körningen med standard 5 s gav två wall-clock-timeouts i
  befintliga turn/bridgeprov; ingen produkttidsgräns eller kvalitet ändrades.
- npm run build: godkänt. Initiala saknade typdeklarationer rättade.
- npm run smoke:desktop, med POKER_TEXAS_SOLVER_DIR och POKER_SMOKE_OUTPUT:
  godkänt inklusive verifiedSixplusRiver=true. Riktig native-process och
  oberoende kontroll leder till UI-råd för syntetisk riverhand. Uppmätt 5360 ms
  under belastning. Första skärmbilden hann visa föregående compositorbild;
  smoke väntar nu två renderframes före bildfångst. Slutbilden visar rådet.
- node scripts/verify-shortdeck-service.mjs: samma kvalitetsresultat, 1891 ms.
- node scripts/verify-shortdeck-service.mjs --cancel: cancelled=true,
  activeJob=null, remainingJobFolders=0. Ingen console_solver.exe kvar vid
  efterföljande processkontroll.
- git diff --check: inga diffel; en extra tom EOF-rad i smoke togs bort.

Evidens under docs/evidence/: sixplus-tests-2026-11-05.log,
sixplus-build-2026-11-05.log, sixplus-desktop-2026-11-05.json,
sixplus-native-ui-2026-11-05.png, shortdeck-live-service-2026-11-05.json,
sixplus-service-recheck-2026-11-05.json. UI-bilden togs före sista etikettbytet;
dess 0,098 % är redan NashConv. Full överlämning: docs/shortdeck-solver-2026-11-05.md.

Faktisk drift: appen omstartad med senaste källa, PID 68816 vid kontroll.
Användaren bekräftade omladdning av extension 1.1.0 och pokerflik. Nya fliken
97290115 visar ”Söker efter ett spel …”, inget handnummer och ingen speltypsklass.
Appen väntar därför fortfarande på giltig snapshot. Ingen manuell sensor
injicerad, ingen spelhandling utförd. Riktig överföring efter denna uppdatering
och faktiskt riverbeslut är INTE verifierade; syntetiskt Windows-test är separat.
Nästa steg: observera aktiv hand, kontrollera explicit sixplus och rätt handnummer,
sedan matchande HU-river och kvalitetsresultat. Interna Edge-sidor får inte
kringgås av datorstyrningen. Ingen commit/push eller betald anslutning gjord.

Slutlig omkontroll efter dokumentationsändringar: npm test --
tests/shortdeck-audit.test.ts tests/shortdeck-service.test.ts
tests/live-reader.test.ts tests/decision-providers.test.ts --maxWorkers=1
--testTimeout=15000 gav 37 pass (4 filer), 21,13 s. npm run build gav exit 0.

### 2026-11-05 — Riktigt vanligt 6-max NLHE-bord verifierat efter användarens svar

Användaren klargjorde att det nya bordet är vanlig NL Hold'em, inte shortdeck.
Read-only DOM visade POKER_GAME_TYPE_HOLDEM. Appen saknade först snapshot.
Tilläggets content-world fanns i nya fliken 97290160; den inlästa content.js
saknade variantmetadata och matchade inte det aktuella diskbygget. En bekräftad
omladdning är därför inte bevis för faktisk 1.1.0-runtime. Vanlig NLHE använder
befintlig bakåtkompatibilitet; nya 6+-metadata förblir ej liveverifierad.

Mottagaren lyssnade på 127.0.0.1:47832, PID 68816. Lokal parningsnyckel
matchade tilläggets lagring utan att värdet publicerades. Första filläsningen
på låst LevelDB misslyckades; korrekt delad read-only-läsning bekräftade match.
En ren DOM-probe körde läsarfunktionen utan observer eller överföring av handen;
den gav en giltig vanlig Hold'em-snapshot. En avsiktligt ogiltig diagnosmessage
utan handdata genom befintlig runtime gav 422, som förväntat. Därefter sågs
återkommande automatiska överföringar och flera handbyten. Initiala fördröjningens
orsak är INTE fastställd och ingen permanent återanslutningsfix påstås.

Slutlig visuell kontroll och separat DOM-kontroll matchade hand 12625047115.
Appen visade Live · uppdateras automatiskt, 6/6/6, preflop, färska data
(81 ms i bilden, 595 ms i närliggande AX). Sex aktiva preflop gav korrekt
Strategi saknas för detta läge / saknad kontrollerad multiway-strategi.
Ingen verklig stödd HU-turn/river-solve observerades. Tidvis stod hero över
eller hade foldat, men slutbilden avser en ny aktiv preflophand.

Inga pokerknappar, köp, inloggningar eller bordsinställningar användes.
Ingen extra läsare anslöts och inga färdiga riktiga snapshots injicerades.
Debugger användes läsande på den tillåtna pokerfliken och stängdes av efter
källjämförelsen. Interna Edge-inställningar öppnades eller ändrades inte.
Ingen produktkod ändrad denna kontroll; inga nya tester behövs för dokumentation.
Evidens: docs/evidence/nlhe-live-2026-11-05.json och matchande PNG.
Nästa tekniska steg är faktisk stödd HU-turn/riverrespons och separat verifiering
av ny extension-runtime; full multiway/preflop-täckning saknas fortfarande.

### 2026-11-05 — Rapporterat HU-turnfel och uttryckligt val av 2 %

Användarens bild visar två aktiva på turn, Td/8s/Ts/7c, Qd/4h, pott0,14,
effektiv stack1,86. Tidigare gynnsamma fullrangeprov hade lägre SPR och täckte
inte detta fall. Preflight reproducerade 5547 noder, 1128 kombinationer per
range och 44650752 bytes. 5000-nodsgrinden gav det avbildade felet trots mindre
än64MiB. Isolerad högre nodbudget räckte inte: WASM passerade inte gamla0,2%
innan25s. Smalare tillfälliga actionträd löste inte detta och återanvändes inte.
En tidig bråkdel-av-öre-hypotes avfärdades: leverantören avrundar redan0,01.
Nodeprovet behövde korrigeras från Windows C:/-ESM-import till file:///.

Oförändrad officiell Postflop CLI byggdes från samma granskade revision
5fc7ee3d92b823b6c58e4f58cbee7d50d5e9e6de. Native4trådar nådde1,924277%
efter125iterationer men inte0,2% inom25s. Därefter instruerade användaren
uttryckligen: sätt inte för hårda krav, teta på2%. Denna instruktion ersätter
0,2%-kravet för vanlig NLHE; det är inte ett ovillkorligt kvalitetsundantag.
6+ och leverantörer utan egen kvalificerad policy behåller0,2%.

Implementerat: src/decision/quality.ts är gemensam NLHE-målgräns2% för
prepareLiveSolve och provider. Router kontrollerar providerns uttryckliga
felgräns, med2% som tak;2,01% underkänns fortfarande. UI anger Solverstrategi
·2% felgräns och faktisk exploaterbarhet. Inga rangepåhitt, inga borttagna
regel-/kort-/tur-/färskhetskontroller och ingen experimentell reservmotor.

Native JSON-adapter i native/postflop-bridge använder den oförändrade MIT-
motorn med fyra rayontrådar. Ingen CFR/BR/evaluator/bettingalgoritm omskriven.
Den exporterar komplett offentlig graf och vald beslutsnod till befintlig
helträds-/heltalskontroll. Native har separat 10000-nods exportbudget men
samma64MiB CFR/chance-gräns,25s total jobbbudget och begränsad logg/JSON.
Huvudprocessen startar fast argv/shell:false, kontrollerar binärhash, isolerar
jobb och stoppar gamla processer. Cancel före solve-start minns sitt ID;
gammal cancel får inte stoppa ett nytt jobb. Nativefel/över2% visas inte sområd.

Rust1.99.1/MSVC release/LTO,target-cpu=native. Källrevision,beroendelås,
compiler/hash i docs/solver-provenance.json och native/postflop-bridge/Cargo.lock.
Native EXE SHA256:972bff3d194bf64be6fdcb551935b8394683a02e15951ccd94c63d66e1c9ce17.
Separat installerad i AppData/Roaming/Poker GTO Advisor/solvers/postflop-native.
Ingen nativebinär tillagd i Git eller gamla portablepaketet. Byggrecept:
scripts/build-native-postflop.ps1 -Install; syntaxkontroll godkänd. Detta bygge
kördes via motsvarande explicita cargo build --release -j4 med manifestpath,
RUSTFLAGS=-C target-cpu=native. Beroenden är nu låsta. CPU-specifik binär måste
byggas/verifieras på annan maskin. Licens/API-kostnad0kr.

Validering:
- Nya testet1,92%accepted/2,01%rejected var rött före policyändringen.
- npm test -- tests/postflop-native.test.ts tests/decision-providers.test.ts
  tests/decision-hook.test.ts --maxWorkers=1 --testTimeout=15000 med installerad
  native:36pass. Inkluderar rapporterat djupfullrangeturn genom riktigprocess,
  helträdslegality och router tillready, plus frekvens/EV/bound-paritet mellan
  native och låstWASM vid samma iteration på ett mindre turnträd.
- npm run build:exit0. Senare tsc -b:exit0.
- npm test -- --maxWorkers=1 --testTimeout=15000 med POKER_POSTFLOP_SOLVER_DIR:
  361pass,4opt-inskip,159,28s. Därefter2snabba cancelregressioner:2pass.
- npm run smoke:desktop med båda native-mappar angivna:exit0,
  verifiedNativeTurnAt2Pct=true och verifiedSixplusRiver=true. Det rapporterade
  syntetiska läget visar ett råd,1,924%,125iterationer,19519ms. Direkt native-
  körning tog23065ms. Ranger och ordinarie50%-bet/raise-träd är oförändrade.
- node scripts/verify-native-postflop.mjs --cancel:cancelled=true,activeJob=null.
- git diff --check:inga diffel, endast befintliga CRLF-konverteringsnotiser.

Drift: den gamla appen stängdes genomCUA. Ny appPID67884/fönster1117178
startad från senastebygget och dess livepanel visar vald2%-gräns. Pokerfliken
visade lobbyn utan bord när återanslutningen kontrollerades. Därför är ett
aktuellt riktigt2%-liveråd INTE verifierat. Ingen pokerhandling eller manuell
extra sensor gjordes. Windowsprovet är en separat syntetisk återspelning.
19,5–23s kan fortfarande missa en kort beslutstimer; gamla svar ska inte visas.
Preflop/flop/multiway saknas oförändrat. Fullmålet inte uppnått.

Evidens: docs/evidence/nlhe-2pct-desktop-2026-11-05.json,
nlhe-2pct-tests-2026-11-05.log, nlhe-2pct-smoke-2026-11-05.log,
nlhe-turn-2pct-2026-11-05.png. Överlämning docs/nlhe-native-2pct-2026-11-05.md.

Tillfällig Rusttoolchain lades endast i chattenswork/postflop-native,
utan globalPATH-installation. Färdiga binärer bevarade i built-artifacts.
Rensning av de egna temporära rustup/cargo/target-mapparna avvisades av
automatisk godkännandekontroll med blocked by policy, även efter explicit
verifiering av exakta workspace-sökvägar. Ingen omväg användes efter det säkrare
försöket. Mapparna ligger kvar; cirka1,1GiB ledigt observerades efter bygget.

## 2026-11-05 — Snabbare fri NLHE-turn, samma 2 %-mått

Användaren kräver några sekunder och har förtydligat träning med låtsaspengar.
Checklistans aktuella delresultat:
- [x] Orsaken profilerad: CFR tog ca 21,15 av 22,45 s, export endast 0,45 s.
- [x] b-inary DCFR från låst källa 9d1509fe5077d019825f833eed04b16d342dfda1
  ersätter långsam native-turn. River-WASM och 6+ hålls separata.
- [x] Oförändrat offentligt bettingträd, viktade kombinationer och laglighet.
- [x] Kanonisk NashConv-summa/rotpott <=2 %, inklusive korrekt faktor två mot
  b-inarys medelvärde. Oberoende skalärt orakel på små fullständiga modeller.
- [x] Hela Windowskedjan: 2724,585 ms till synligt beslut, 2121 ms beräkning,
  1,805 % uppmätt fel, 120 iterationer, bildens 5547-nodsträd/fullrange.
- [x] Full svit 371 pass/4 skip; bygge och desktopprov passerar.
- [x] Verkligt bygg-/installationsrecept kört, samma binärhash återbildad.
- [x] Vanliga appen omstartad till källans senaste version, PID59988/fönster15664492.
- [ ] Ny stödd hand från Edge efter motorbyte: klienten är frånkopplad på grund
  av inaktivitet. Inget råd på ny hand verifierat, ingen spelhandling utförd.
- [ ] Full preflop/flop/3–6-aktiv-täckning, härledda ranger och ny portable återstår.

Metod: b-inary AGPL-3.0-or-later, separat lokal wrapper/process. Endast tre
explicita Rustreferenser patchar leverantörskällan; inga solveralgoritmer
ändrades. Standard-donk på nästa gata visade sig först skilja sig; explicit
tom donktabell ger exakt samma offentliga graf som tidigare låsta WASM-modell.
Tidigare bredare donkprototyp och 14s regret-floor-prov är inte produktion.
NativeRequest expanderar ranger före process och svarsranger valideras exakt.
Decimalvikter med 0/1 fastnade i gammal alfabetkontroll; verklig rangegrammatik
valideras fortfarande av parsern. Tester visade felet före rättningen.

Sexsekundersbudget ersätter gamla 25s; gamla svar och underkänd kvalitet ska
fortsatt aldrig visas. Fullrangeprov varierade mellan ca2 och6 s. Ett första
AKQ2-prov överskred diagnostikens7s; bevarat som negativt resultat, separat
omkörning4,74s och helsvit4,61s. Ansluten/lastad app är inte en generell garanti
för råd inom tidsfristen. Inga smalare ranger/sizings eller högre felgräns användes.

Exakta kontroller:
- npm run build: exit0, även efter slutändringar.
- POKER_POSTFLOP_SOLVER_DIR=.../postflop-fast npm test -- tests/postflop-native.test.ts
  tests/postflop-service.test.ts tests/decision-providers.test.ts tests/native-config.test.ts
  --maxWorkers=1 --testTimeout=15000:29pass.
- POKER_POSTFLOP_SOLVER_DIR=.../postflop-fast och POKER_BINARY_SOLVER=.../poker-postflop-bridge.exe,
  npm test -- --maxWorkers=1 --testTimeout=25000:371pass,4skip,151,93s.
- Båda nativekatalogerna angivna, npm run smoke:desktop:exit0 två gånger;
  sista provet loggar även snapshot-till-UI och kontrollerar gamla/ogiltiga svar.
- scripts/build-binary-postflop.ps1 -Install:exit0, hash0d826be3bf09ea453b0747b90d17d51eb117673babe6a36402a65b4f9ac37bb3.
- git diff --check:exit0; endast befintliga radslutsvarningar.

Evidens: docs/evidence/nlhe-fast-native-2026-11-05.json, nlhe-fast-repeat-2026-11-05.json,
nlhe-fast-desktop-2026-11-05.json, nlhe-fast-ui-timing-2026-11-05.json,
nlhe-fast-ui-2026-11-05.png och nlhe-fast-{tests,smoke,build}-2026-11-05.log.
Överlämning: docs/nlhe-fast-2026-11-05.md. Gamla 19,5s-dokumentet märkt historiskt.
Licens, sourcepatch, låsta beroenden och recept finns med; ingen ny binär i Git,
ingen commit/push eller kostnad. Nästa steg är separat handverifiering när
träningsklienten åter är aktiv, därefter eventuell uttryckligt beställd paketering.

## 2026-11-06 — Gratis multiwayturn/river efter uttrycklig ny beställning

Användaren kräver 3–6 aktiva även på turn/river för träning med låtsaspengar.
2 %-kravet och några sekunders budget är inte återkallade. Ingen ny provider
är aktiverad: utökningen är INTE levererad. Ingen egen träning återstartad.

- [x] Nya primärkällor kontrollerade: Zeta, Monker Free, NoRegrets, donksolver,
  Holdem Solver beta och Prism. Underlag i docs/multiway-turn-river-2026-11-06.md.
- [x] Zeta-källan hämtad separat och låst till aktuell HEAD acd8f042b1271cd16ecdff3c4fbd5f11105450e5,
  status ren. solve_cli.h:2562 avvisar N != 2 för multi-street; rad1537 har även
  compile-time HU-krav. Multiwayriver ger regret, exploitability_available=false.
  Äldre bredare sökindextext är inte stöd för multiwayturn i hämtad kod.
- [x] Monkers officiella gratisprodukt/download och guider kontrollerade.
  HTTP HEAD:31729454byte,serverLastModified2020-06-06; detta är inte releasebevis.
  Automatisk komplett policyexport, mätbart2%-gap och latens fortfarande okända.
- [x] Nya alternativa gratispaket granskade: Donksolver saknar NLHE BR;
  NoRegrets publicerar inte fria blueprints; Holdem beta visar stabilitet för
  multiway och gratisperioden är begränsad till beta. Prism Free är en viewer.
- [ ] Kvalificerad gratis3–6turn/river med policyexport, faktisk kvalitetskontroll
  och latens på denna dator återstår. En API-adapter ensam fyller inte luckan.

Exakta read-only-källkommandon: git ls-remote https://github.com/lewismj/zeta.git HEAD;
git clone --depth 1 https://github.com/lewismj/zeta.git .research/zeta-multiway-review;
git -C ... rev-parse HEAD;git -C ... status --short; riktade rg/Get-Content på
solve_cli.h och doc/holdem/cli_usage.md. Källfilerna är oförändrade och inte
byggda; tidigare småmodellexperiment återstartades inte. Officiella guide-/FAQ-
sidor och licens-/kvalitetsbeskrivningar kontrollerades över webben. Ingen
installation, GUI-automation, leverantörskontakt, konto, kostnad eller produktkod
ändrad. Dokumentationskontroll: git diff --check. Inga nya solver-/funktionstester
påstås ha körts. Evidens: docs/evidence/multiway-candidates-2026-11-06.json.

Tidigare tur samma datum verifierade automatiska nya Edge-fliken97290173 och
färska handbyten i appen, bland annat12626626315. Inget nytt solverråd hann
observeras innan datorstyrningen stoppades av webbadresskontrollen. Användaren
har därefter rapporterat att HU-river fungerade. Turnbild12626640668 visar3aktiva
med korrekt avslag. Detta är användarrapport/bild, inte nytt oberoendeGUI-test.
Nästa meningsfulla tekniska steg är ett verkligt Monker-export-/anrops-/kvalitets-
underlag eller annan fri kvalificerad motor; inte borttagning av kvalitetsgrinden.

## 2026-11-06 — Monker Free faktiskt hämtat och startat, testuppsättning väntar

Explicit beställning: testa export/felmått/tid för3–6 påturn/river och anslut
om det fungerar. Officiell installerare hämtad, SHA256
5d2062483fa0e9f82bbc0e1bfbeffe0223c5a112c8dea0e2d5be927d9a0ad425.
NSIS-3-arkivet packades upp med projektets befintliga7z, utan installerarkörning
eller registerändring. Totalt48,8MB uppackat. Applikationshash
f66d7f2b5d8b35393577a39abfc0325215f26dd5102355e1ae49be477318e652.
FaktisktGUI visar MonkerSolver FREE Version10114. Runtime ligger under chattens
work/monker-free/runtime. Ingen applikations-/skydds-/licenskod ändrad.

Tre spelare påturn valdes faktiskt i New tree, och nästa dialog visarBTN/SB/BB.
Datorstyrningen blockerades där: huvudfönstret syns som disabled och dialogens
OK/Cancel/keyboard kan inte bekräftas pålitligt. MedföljandeJava11.0.7 och
befintligaAdoptium17.0.16 testades. Thread dumps visar att AWT väntar på
JOptionPane, inte på en solverberäkning. Inga uppmätta solvertider finns.
Extra tomma testprocesser avslutades via exakt verifierad processidentitet;
aktuellMonker ärPID43656/fönster6948024. Pokerappen och pokerklienten rördes inte.

Interoperabilitetskontroll: jar-manifest och javap av main-klassen visar att
c.R.main inte läser kommandoradsargument, utan startar AWT-GUI. Det bevisar inte
att inget annat integrationsgränssnitt kan finnas. Ingen obfuskering eller
åtkomstkontroll har ändrats. Råmetadata och planerade8fall finns i work/monker-free.

Användaren ombads asynkront att ta fram Monker via aktivitetsfältet och klicka
OK i New tree; svar är väntande. Detta är en datorstyrningsbegränsning, inte
ett underkänt solverprov. Export/felmått/latens och hela3–6-matrisen är ännu
INTE verifierade. Ingen provider aktiverad. Återuppta verkliga tester efter det
manuella klicket; avsluta inte med ett obelagt påstående att Monker fungerar
eller inte fungerar. Evidens: docs/evidence/monker-free-preflight-2026-11-06.json.

## 2026-11-06 — Monker Free verkligen kört: åtta modeller och tio arkivexporter

Användarens manuella OK löste tidigare New tree-hindret. Full testrapport finns i
docs/monker-free-test-2026-11-06.md. Det är leverantörens solver som körts; inga egna
solver-/träningsalgoritmer återstartade och ingen produktprovider tillagd.

- [x] Faktisk FREE10114 på Adoptium17, fyra trådar,2GB heap. Avg/EV streets2.
- [x] Alla åtta3–6 × turn/river körda via inbyggda Scripting. Pot4, stack200,
  fullranger, check/fold/call/all-in-kontrollträd. Inga vanliga betstorlekar.
  Ratio1: turn2948/1629/2124/4460ms, river1159/1136/1568/1456ms för3/4/5/6aktiva.
- [x] Sexvägs ratio10 kompletterat: turn30174ms och7774208iterationer,
  river1885ms och548864iterationer. Tiden är Start→färdig arkivfil i varm JVM,
  inte tid till kvalitetsgräns eller synligt råd i Poker Advisor.
- [x] TioMKR-arkiv lästa med fristående Java-läsare. Korrekta N/street/boards,
  pot4000 och stack200000 internt, version10114; ändliga numeriska arrayer.
  Exporterat träd byteidentiskt med input i alla10. GUI-exportens3pturnträd och
  versionbundna rena inputgeneratorns fil är också byteidentiska.
- [ ] 2%-felmått inte uppmätt. Iterationskvot är inte NashConv. Råavg/cf/EV-data
  är inte färdigt mappade och verifierade som appens kombinationspolicy/action-EV.
  Ingen oberoende multiwayBR-kontroll körd. Ingen automatisk appintegration klar.
- [x] Misslyckanden bevarade: första scriptstack200 gav0,2 iGUI; ratio10000 för
  lång och stoppad. Ursprunglig pot100/50%-plan aldrig körd. Ytterligare3pturnratio10
  skapade ingen export; tråddump visar ingen aktiv solver/blockerad AWT, orsak okänd.
  Detta sista försök räknas inte som solvertid eller godkänt test.
- [x] Monker stängd via normal dialog, processen borta; AdvisorPID59988 igång.
  Inga pokerhandlingar, nya browseranslutningar, köp, konton, commit eller push.
- [ ] Gratis multiway med verifierad2% och några sekunder är fortfarande inte
  levererat. Ingen reservgissning eller ändrad kvalitetsgrind har aktiverats.

Exakta kontrollkommandon (JDK-sökväg C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot\bin):
`javac -d work/monker-free/helpers work/monker-free/MonkerArchiveInspect.java`;
`java -Xmx768m -cp work/monker-free/helpers MonkerArchiveInspect <alla tio faktiska mkr-sökvägar>`;
`work/monker-free/Summarize-Monker.ps1`; SHA256 med Get-FileHash samt jämförelse
med exporterad tree-entry; `jstack 43656` före normal avslutning; `git diff --check`.
GUI-körningarna gjordes med datorstyrning, inte CLI. Fulla tidsstämplar, filhashar,
former och kontroller finns i docs/evidence/monker-free-benchmark-2026-11-06.json
och docs/evidence/monker-free/. Återanvändbar läsare/generator i scripts/monker-audit/.
Förändringarna i denna tur är provverktyg och evidens/dokumentation; appens tidigare
371-pass-resultat är historik och har inte körts om för dessa fristående verktyg.
Nästa steg kräver verkligt verifierat policy-/felkontrakt och anropskontrakt;
upprepa inte de åtta små proven som om de ännu vore blockerade av New tree.

## 2026-11-06 — Monker profilerat: 13 prov och upprepad tidsvinst

Hypotes: CPU-beräkning och trådval är flaskhalsen. JFR gav 5 217 exekveringsprov
och 102,59 ms GC-pauser under 158 s. Heta vendorframes: c.aE.i/c och c.v.a.
Samma sexvägs turn/check-all-in/fullrange, ratio10, avg/EV2 i 13 verkliga GUI-jobb.
Dagens fyrtrådsbaslinje 21 778 ms; Java17/åtta trådar 14 030 och 14 819 ms,
medel 14 424,5 ms: 33,8 % kortare tid. Mot historiska 30 174 ms är tiden 52,2 %
kortare, men olika sessioner gör att hela vinsten inte kan tillskrivas trådantalet.
GraalVM, Java11, inlining700/djup2 och isolerad inlining512/djup1 gav ingen
ytterligare vinst. Båda inliningprofilerna förkastades som långsammare.

- [x] Alla 13 arkiv verifierade för samma vendorbinär, träd, board, pot/stackar,
  ranger, avg/EV, ändliga data och minsta arbetsbudget. Ratio1-negativprov avvisat.
- [x] Nytt hashkontrollerat PS7-startverktyg och återanvändbar mätare tillagda.
- [x] Vendor Load visade korrekt metadata men återupptog beräkningen automatiskt;
  normalt stopp vid 69 967 872 iterationer. Extrajobbet är inte med i tidsproven.
- [x] Bästa standard-Java återstartad genom startverktyget; Settings8/2/2 verifierade.
  PID21244/fönster3411048 är overksamt med nytt standardträd. Övriga test-JVM:er
  stängda; AdvisorPID59988 lämnad igång.
- [ ] Oberoende 2 %, komplett policy-/EV-mappning och några sekunder till godkänt
  appbeslut återstår. Ratio10 är inte ett felmått. Ingen Monker-provider aktiverad.

Kommandon: `jcmd 61784 JFR.start name=monkerBaseline settings=profile maxsize=64m`;
`jcmd 61784 JFR.dump name=monkerBaseline filename=<work>/monker-perf/baseline.jfr`;
`jcmd 61784 JFR.stop name=monkerBaseline`; `jfr print --json --events jdk.ExecutionSample,jdk.GarbageCollection,jdk.JavaMonitorEnter,jdk.ObjectAllocationSample,jdk.FileWrite <work>/monker-perf/baseline.jfr`;
`jcmd 28696 VM.flags -all`;
`scripts/monker-audit/Measure-MonkerExports.ps1 -RunDirectory <work>/monker-perf -InspectorClassPath <work>/monker-free/helpers -JavaPath <JDK17>/bin/java.exe -ReferenceTree <work>/monker-free/generated-inputs/monker-6p-turn-control.tree`;
`scripts/monker-audit/Start-MonkerStudy.ps1 -MonkerDirectory <work>/monker-free/runtime -JavaPath <JDK17>/bin/javaw.exe`;
`git diff --check`. JDK17 är `C:/Program Files/Eclipse Adoptium/jdk-17.0.16.8-hotspot`.
Alla solverjobb startades via GUI; profileringsanropen styr bara diagnostik.

Rapport: docs/monker-performance-2026-11-06.md. Evidens:
docs/evidence/monker-performance-2026-11-06.json och monker-performance/.
Outputs-paketet innehåller två bästa råexporter, metadata för alla 13, kontrollträd
och källverktyg. Nästa steg är versionsbundet policy-/EV-kontrakt och oberoende
bästa-svarsmått, sedan tid till 2 %-godkänt resultat. Ingen appkod, kvalitetsgrind,
betaltjänst, commit eller push ändrades. Multiway-liveintegrationen är inte färdig.
Slutkontroll: båda PowerShell-verktygen parserkontrollerade utan fel;
`git diff --check` godkänd. Paketet innehåller 23 filer och är 28 338 326 byte.
CRC och varje SHA-256 i manifestet verifierade; pakethash
c38959ca7b35316eb79e56a1e482fdcaf6fc70d123ef536e1bf0b23d19c66ce7.
Se docs/evidence/monker-performance/package-check.json och powershell-parse.json.
Processinventeringen bekräftade PID21244 och Advisor59988, inga kvarvarande gamla
testprocesser. Tidigare apptester kördes inte om; dessa kontroller gäller studieverktygen.

## 2026-11-06 — Monkerexport tolkad och exakt 2 %-kontroll genomförd

Ändring/hypotes: löste runtime-nodeordning, hand-/runoutbucketar, normalisering
av medelstrategi och EV-slotsemantik i FREE10114. Implementerade ett oberoende
exakt profil-/bästa-svarsorakel, ingen ny träningsalgoritm. Den aktuella
regret-matching-strategin kontrolleras separat från samma arkiv; den hjälpte
inte i något av de fjorton slutförda proven. Alla råa syntetiska modeller är
bevarade; två försök saknade export och finns kvar som misslyckanden.

Observerat: river 3/4/5/6 spelare passerade med NashConv
0,960/0,449/0,512/0,926 % av rotpotten och 1,26–1,70 s till fil. Detta gäller
två kombinationer per spelare, pott4000/stack200000, check/fold/call/all-in,
ingen rake. Det är inte fullrange, komplett NLHE eller tid till appbeslut.
Turn 3/4/5/6 missade med 43,50/70,98/56,92/146,78 %. En 33,8-miljoners
trespelarreferens tog 7,02 s och missade med 21,38 %. Lägre stackdjup missade
också. Oberoende enumeration av ett fast avvikelsecertifikat bekräftar
36,08 % möjlig förbättring för en spelare i den kortare trespelarturnen.
Riverkontrollen korsgranskades mot 256 rena strategier per spelare.

Orsakskontroller: Monkers reset0 aktiverar faktiskt återställning; prov utan
återställning använder kvotgränsen1e9. GUI-tabellen kan vara gammal efter stopp
och kräver en gren-/Back-uppdatering. Riverfortsättningen på As jämfördes mot
exporten efter uppdatering. Ett river-till-turn-byte kastade i batchtråden
`ArrayIndexOutOfBoundsException: Index 4 out of bounds for length 4`, c.A.run;
ren process slutförde fyrspelarturnen. Det första uteblivna turnprovet hade
ingen fångad felorsak. Leverantörsbinären har inte modifierats.

Prestanda: payoffcache i granskaren gav samma EV/BR inom1e-8 och minskade varm
sexspelar-turnkontroll från cirka720 till546–575ms. Det är cirka20–24 % av
kontrolltiden, ingen ny visad Monker-träningsvinst. Bred fullrange överskrider
granskarens förhandsbudget4096 gemensamma givningar och får okänd kvalitet.

Exakta kontrollkommandon, från C:\dev\poker om inget annat anges:

* `npx vitest run tests/monker-audit.test.ts`: först observerat rött för
  saknad aktuell-strategiavkodning, sedan8pass.
* `npx tsc -b`: saknad mjs-deklaration och en testtyp fångades och rättades;
  det fulla bygget nedan passerade därefter.
* `npm test -- --reporter=dot`: tidigare parallellt2fel/366pass/13skip;
  decision-mccfr nådde inte traversal inom budget och postflop-wasm fick
  femsekunderstimeout i river-chanskontrollen. Bevarad logg npm-tests.log.
* `npx vitest run tests/monker-audit.test.ts tests/decision-mccfr.test.ts tests/postflop-wasm.test.ts --maxWorkers=1`:
  tidigare riktad seriell återkörning77pass.
* `npm test -- --maxWorkers=1 --reporter=dot`: full slutkörning370pass/13skip,
  31passade/4överhoppade filer, exit0,121,11s. Inga timeoutgränser höjdes.
* `npm run build`: exit0.
* `node scripts/monker-audit/crosscheck-river.mjs tests/fixtures/monker-3p-river-10114.json`:
  alla profilvärden/bästa svar matchar inom1e-8, NashConv0,959603847 %.
* `node scripts/monker-audit/crosscheck-turn.mjs docs/evidence/monker-policy-audit/decoded/audit3turn10000nrRetryKs7d2c8h200000.json docs/evidence/monker-policy-audit/turn-br-certificate.json`:
  fast avvikelse ger36,080351655 % förbättring, utan dolda kort i besluten.
* Java17: `javac -cp <officiell EXE> -d <klasser> scripts/monker-audit/MonkerPolicyExport.java`;
  `java '-Djava.awt.headless=true' -cp '<klasser>;<officiell EXE>' c.MonkerPolicyExport <MKR> <officiell EXE>`.
  Alla14exporter avkodades; var och en granskades med audit-file.mjs i båda
  lägena `average` och `current-regret-matching`.

Rapport: docs/monker-policy-audit-2026-11-06.md. Maskinläsbar matris:
docs/evidence/monker-policy-audit-2026-11-06.json. Råexporter, normaliserade
modeller, kontroller, indata, skärmbilder och testloggar ligger i
docs/evidence/monker-policy-audit/. Källverktyg och verklig regressionfixture
ligger i scripts/monker-audit/ och tests/fixtures/.

Nästa steg är representativ modellkvalificering och skalbar felkontroll samt
stabil styrning innan en provider ansluts. Bara trädhash räcker inte för
matchning; rng-entryn binder ranger separat. Ingen app-provider aktiverad,
ingen kvalitetsgrind sänkt, inget nytt livebeslut verifierat, inget köp,
ingen commit eller push. Användarens fulla2–6-spelarmål är inte uppnått.

## 2026-11-07 — Headless Monkerkärna, exakt symmetri och vald ε-Nash-gräns

Styrning: användaren bad om fortsatt verkligt arbete, topp50 % för sin egen
range och delegerade val av 2 %-mått. Valde **maximal enskild avvikelsevinst
≤2 % av rotpotten**, inte summan och inte summan/spelarantal. Historiska
NashConv-prov finns kvar oförändrade. CLI default är fortsatt nashconv för
reproduktion; nya körverktyget begär explicit max-unilateral. Ingen loosening
till avrundat2,1 % eller godtycklig högre gräns har smugit sig in.

Ändring/hypotes: numerisk headless interop kör oförändrad FREE10114-kärna
v.a(aE), originalkorttabell och originalregret-/medeluppdateringar. Ingen
GUI/controller, bytekodändring, egen träningsalgoritm eller licensändring.
Hashbunden binär, begränsade jobbtider och avvisning vid fel. Återanvänd
korttabell/JVM minskar init. Stoppa per-world-villkoret för att undvika grov
145000-batchöverskjutning. Statiska träd måste tömmas mellan jobb: röd3→6→3-
regression kraschade vid andra jobbet; rättning ger tre gröna jobb.

Exakt oberoende kontroll kan slå ihop kompletta likaviktade parklasser på
fyrfärgad turn när spelarna äger åtskilda valörer och policybucketarna är
suitinvarianta. Chansen grupperas samtidigt efter rivervalör med exakt
återstående kortantal. Naiv konkret suitrepresentant gav fel bästa svar och
är bevarad som negativt försök. Validerad reduktion ger samma EV/BR som full
enumeration inom1e-8. Cache delar bara identiska terminalutbetalningar, inte
policies/informationsmängder. 6300 vendorutbetalningar över84 kortfall matchar
separat evaluator exakt. Det äldre höga turnfelet involverar den samverkande
turn-/riverfortsättningen; att ändra bara en gata reproducerar inte hela
bästa-svarsökningen. En ensam algoritmisk grundorsak är inte bevisad.

Observerat: varm, färsk tvåsekundersberäkning för3/4/5 spelare klarade
0,355/1,156/1,932 % med solve+decode+audit2,446/2,310/2,503s. Separat
uppvärmning5,206s, exkluderad Node-start, ingen app/UI. Detta gäller smala
parranger, SPR2 och endast check/fold/call/all-in. Kall komplett kedja för3p
tog6,012s efter kompilering/hashcheck och klarade0,310 %. Sexspelarfelen
ligger över2 % även efter kontrollerad1/2/4/8-trådjämförelse och kontinuerliga
checkpointar. Bästa nya entrådspunkt efter cirka2s gav2,099 %, fortfarande
underkänd; längre körning blev sämre. Aktuell regret-policy hjälpte inte.

Topp50 %-modellen (viktad massa663/1326,672 positiva kombinationer) kördes
faktiskt för3–6 spelare med bara hjälten begränsad. Motståndare förblev fulla.
Alla exporter gick, men granskningen överskrider4096-joint-deal-budgeten:
kvalitet okänd, inga råd. Första breda4–6-loggarna saknar tillförlitlig tid
efter relativ Tee-väg som påverkades av Push-Location; R2 är separat mätt.
Ett första shellprov maskerade även Javas felkod med Pop-Location; synlig
uncaught exception och observation sparas, följande kommandon bevarar felkoden.

Exakta huvudkontroller från C:\dev\poker, arbetsrot
W=C:\Users\ryd\Documents\Codex\2026-11-04\i-x20\work\monker-turn-cause,
runtime R=...\work\monker-free\runtime, klasser C=...\work\monker-export\classes:

* `npx vitest run tests/monker-pair-symmetry.test.ts`: rött för saknat nytt
  mått; därefter `npx vitest run tests/monker-pair-symmetry.test.ts tests/monker-audit.test.ts --maxWorkers=1`:
  14pass. Regressionsfixture6p underkänner falskt medelgodkännande.
* `npm test -- --maxWorkers=1 --reporter=dot`: **376pass/13skip**,32passade och
 4överhoppade filer, exit0,171,10s. Logg full-tests.log. Inga timeoutkrav höjda.
* `npm run build`: exit0, logg build.log. `git diff --check`: exit0 med
  befintliga CRLF-varningar. PowerShell Parser.ParseFile(run-kernel.ps1): inga fel.
* Java17 `javac -cp 'C;R\MonkerSolverFree.exe' -d C scripts/monker-audit/MonkerPolicyExport.java scripts/monker-audit/MonkerCoreProbe.java scripts/monker-audit/MonkerCoreCheck.java scripts/monker-audit/MonkerKernelBench.java scripts/monker-audit/MonkerCheckpointProbe.java`.
  Generiska unchecked-varningar finns, inga kompileringsfel.
* Från R: `java '-Djava.awt.headless=true' -cp 'C;R\MonkerSolverFree.exe' c.MonkerCoreCheck W\spr2-pairs3-input.mkr W\spr2-pairs6-input.mkr R\MonkerSolverFree.exe W\repeated-final`:
  3→6→3pass, exit0. Nollträning i detta funktionstest, inget kvalitetsintyg.
* Från R: `java '-Djava.awt.headless=true' -cp 'C;R\MonkerSolverFree.exe' c.MonkerKernelBench W R\MonkerSolverFree.exe W\warm-matrix` och samma med
  `W\thread-matrix thread-sweep`: verkliga nya policies, separata .mkr/run/timing.
* Från R: `java '-Djava.awt.headless=true' -cp 'C;R\MonkerSolverFree.exe' c.MonkerCheckpointProbe W\spr2-pairs6-input.mkr R\MonkerSolverFree.exe W\checkpoints6`;
  samma med `W\checkpoints6-one-thread 1`. Samma policy/PRNG fortlöper mellan faser.
* `node scripts/monker-audit/audit-file.mjs <decoded.json> <quality.json> average max-unilateral`:
  samtliga mätpunkter oberoende kontrollerade; aktuella policyn prövad med
  `current-regret-matching max-unilateral`, också underkänd.
* `node scripts/monker-audit/crosscheck-payoffs.mjs W\payoff-model.json W\core-payoff.mkr.payoffs.json W\payoff-crosscheck.json`:
  84fall,6300utbetalningar,maxdiff0,exit0.
* `.\scripts\monker-audit\run-kernel.ps1 -InputArchive W\spr2-pairs3-input.mkr -VendorDirectory R -OutputDirectory W\cold-pipeline -JavaDirectory 'C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot\bin'`:
  faktisk kall kedja6,012s, godkänd0,310 %, inga UI-led medräknade.

Rapport docs/monker-turn-2026-11-07.md, matris
docs/evidence/monker-turn-2026-11-07.json, rådata/negativa försök/testloggar i
docs/evidence/monker-turn-2026-11-07/. Store avkodningar kan återskapas från
sparade MKR; source-artifacts.json innehåller hash och storlek. Originalbinär,
JDK, rankcache och externa sourcecheckouts följer inte med överlämningspaketet.

Nästa blocker: skalbar oberoende kvalitetskontroll för breda ranger, stabil
sexspelarkvalitet i relevanta betträd, därefter annulleringsbar service och
komplett modellbindning till hand/snapshot. Smala fixtures får inte ersätta
användarens motståndarranger. Ingen Monker-provider, ingen appomstart eller
verifiering av ny aktuell livehand, ingen betalintegration, commit eller push.
Fulla användarmålet är fortfarande inte uppnått.

Tillägg efter fortsatt sexspelarkontroll: `crosscheck-payoffs.mjs` på
payoff6-model.json/payoff6.mkr.payoffs.json gav72kortfall och166320 numeriska
utbetalningar mot oberoende evaluator, maxdiff0, exit0. Dessa tillkommer de
tidigare6300 trevägsutbetalningarna; ingen allmän kvalitetstäckning följer av det.

### 2026-11-07 eftermiddag — Monker installerad och synliga breda appbeslut

Användaren accepterade 2,1 % och delegerade kvalitetsvalet. Jag valde att visa
versionsbundna Monkerbeslut för träning med explicit okänd felgräns när oberoende
kontroll saknas. Detta är inte verifierad GTO och inte ett påstående att breda
modeller klarat 2,1 %. Kända uppmätta underkännanden blockeras. Den egna gamla
MCCFR-approximationen är fortsatt blockerad. Inga motståndarranger beskars.

Installerad originalkärna, persistent annulleringsbar Java-service, hashbundet
binärkontrakt, full range-/public-tree-validering, provider och UI är nu anslutna.
Topp 50 % är hjälteprior; fulla motståndarranger är standard. För att begränsa
det offentliga trädet används 50 % pott vid aktuellt beslut och senare
check/effektiv all-in/fold/call utan ytterligare höjningar. Ingen rake.
Oklar tidigare raise-/all-in-historik avvisas. Alla 3/4/5/6 turn/river-fall med
olika stackar passerade verkliga installerade tjänsten, 2,291–4,456 s.

Röd/grön felsökning rättade effektiv stackkodning: bettor med stack 300 som
betar 160 mot tak 160 behåller 140 osyningsbara marker, men prefix måste ändå
kodas som effektiv all-in. Samma effektiva stackberäkning används nu i prefix
och träd. Riktig kernel och klient gav lagliga fold/call i regressionsfallet.
Läsande kodgranskare fann detta P2; inga ytterligare konkreta P0/P1 rapporterades.

Kommandon och observerade resultat, körda från `C:\dev\poker`:

* `node scripts/install-monker.mjs 'C:\Users\ryd\Documents\Codex\2026-11-04\i-x20\work\monker-free\runtime' 'C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot\bin' 'C:\Users\ryd\AppData\Roaming\Poker GTO Advisor\solvers\monker-free'`:
  installerat manifest och kompilerade bryggklasser, originalhashar kontrollerade.
* `npm run build`: exit 0, TypeScript och slutligt bygge passerade;
  evidens `monker-app-final-build.log`.
* `npx vitest run tests/monker-config.test.ts tests/monker-plan.test.ts tests/decision-providers.test.ts tests/monker-ui.test.ts --maxWorkers=1`:
  36 pass, `monker-app-review-regression.log`.
* Med `POKER_MONKER_SERVICE_TEST_DIR=C:\Users\ryd\AppData\Roaming\Poker GTO Advisor\solvers\monker-free`:
  `npx vitest run tests/monker-service.integration.test.ts --maxWorkers=1`:
  dåvarande 2 test pass (åtta breda modeller, check/bet-prefix, cancel+nästa jobb),
  `monker-app-service-tests.log` och `service-matrix.json`.
  Efter tillagt effektiv-all-in-test:
  `npx vitest run tests/monker-service.integration.test.ts -t 'effective all-in' --maxWorkers=1`:
  1 pass/2 filtrerade, `monker-review-native-regression.log`.
* `npm test -- --maxWorkers=1 --reporter=dot`: före sista rättningen
  391 pass/19 skip. Efter rättningen två körningar med 391 pass/1 fail/20 skip,
  båda timeout 5000 ms i befintligt WASM-turnorakel på postflop-wasm.test.ts:87.
  Andra körningen utan samtidigt bygge; orsak till tidskillnaden är inte fastställd.
  `monker-app-full-tests.log`, `monker-app-final-tests.log`,
  `monker-app-clean-final-tests.log`. Senaste fullsviten är inte helt grön.
* `npx vitest run tests/postflop-wasm.test.ts --maxWorkers=1 --reporter=verbose`:
  17 pass, orakeltest 3821 ms, `monker-app-wasm-final-isolated.log`.
  Föregående separat omkörning också 17 pass. Inga timeoutkrav höjda.
* `git diff --check`: exit 0, befintliga CRLF-varningar.

CUA visade faktiska frekvenser i riktiga Windows-appen för breda syntetiska
sexspelarmodeller. Turn: 5425 ms tjänsttid, 458752 iterationer; river: 2844 ms,
598016 iterationer. Slutlig riverskärmbild är återvisning av samma modell ur
klientcachen, inte ny tidsmätning. Råinput och screenshot sparade; det syntetiska
flödet avslutat. Appen omladdad efter sista rättningen och döljer inaktuella råd.

Faktisk aktuell Edgehand är fortfarande inte verifierad: båda pokerflikarna
visar frånkoppling p.g.a. inaktivitet. Användaren har ombetts öppna träningsbordet
igen. Ingen inloggning, pokerhandling, bordsanmälan, insats eller betalning gjord.
Nästa konkreta steg är färsk bordavläsning och synligt Monkerbeslut på den handen;
separat återstår skalbar oberoende kvalitet för breda ranger och timeoutdiagnos
för fullsvitens WASM-orakel. Inga commits eller pushar; äldre portabla filen ej ombyggd.

Aktuell överlämning `docs/monker-app-2026-11-07.md`, maskinrapport
`docs/evidence/monker-app-2026-11-07.json`, råevidens i
`docs/evidence/monker-app-2026-11-07/`. Installation och observerade testresultat
är genomförda; hela ursprungliga täcknings-/kvalitetsmålet är ännu inte uppnått.

### 2026-11-07 fortsatt funktionstest — bakgrund, gatbyte, handbyte och färskhet

Användaren svarade uttryckligen ”Fortsätt med appens funktionstest så länge”.
Inga återinloggnings- eller spelåtgärder gjordes. Ändring i Electron-main:
`backgroundThrottling:false` så att webbtimers inte avsiktligt stryps när Edge
täcker appen. Befintlig app stängdes normalt och startades normalt igen med
`node_modules/electron/dist/electron.exe C:\dev\poker --live`, PID69560.

Första Windows AX-avläsningen såg frusen ut tills appen aktiverades. Senare
kontroll visade att AX-text kan ligga kvar trots att HTTP-mottagaren kvitterar
och Java-worker startar i bakgrunden. Exakt orsak till skillnaden är alltså
inte fastställd; ingen bevisad generell ”mottagaren frös”-rotorsak hävdas.
Officiell dokumentation om bakgrundstimers finns länkad i integrationsöverlämningen.

Kommando `node W\monker-ui-transitions.mjs` kördes mot egen apps lokala ingest-
testgränssnitt, med parningstoken läst lokalt men aldrig kopierat till evidens.
W=`C:\Users\ryd\Documents\Codex\2026-11-04\i-x20\work`. Kontrollfilen växlade
sexspelarturn→river och sedan en ny sexspelarturn med bet→ny trespelarriver.
Faktiska snapshot-/ACK-tider finns i events.jsonl. Första ACK tog cirka50ms.

Observerade riktiga appresultat med breda syntetiska ranger:

* Kall sexspelarturn räknades i bakgrunden; efter återgång syntes rådet med
  **9023ms**,98304iterationer. Kallstart är fortfarande för långsam.
* Samma hand på sexspelarriver gav nytt råd med **2689ms**,696320iterationer.
* Efter snabbt handbyte syntes nytt råd för hand#990000000000203, tre spelare,
  med **4514ms**,2269184iterationer. Java PID71368 ersattes av23760. Inget gammalt
  råd observerades på den nya handen; ingen exakt pixel-/cancel-latens mättes.
* Flödet stoppades, testprocessen avslutades. Vid cirka15s gammal avläsning var
  rådet dolt med ”Inväntar färsk avläsning”. Exakt gränsövergångstid ej mätt.

`npx vitest run tests/decision-hook.test.ts tests/monker-service.test.ts --maxWorkers=1 --reporter=verbose`:
13pass, exit0,11,08s, logg monker-background-regression.log.
`node --check electron/main.cjs`: exit0. `git diff --check`: exit0, befintliga
CRLF-varningar. Inga tidsgränser ändrade, ingen ny fullsvit. Tidigare WASM-
fullsvitstimeout kvarstår. Ingen ny dist/portabel release byggd för main-ändringen.

Evidens `docs/evidence/monker-background-2026-11-07.json` samt tillhörande mapp
med testkälla, ACK-/snapshotlogg, AX-observationer och skärmbilder. Aktuell
överlämning docs/monker-app-2026-11-07.md är uppdaterad. Appen är igång och
testinmatningen avslutad. Nästa steg: förbättra kallstart, verifiera bred
strategikvalitet och verklig hand när träningsbordet är återöppnat. Okänd
felgräns märks fortsatt tydligt; inga nya köp, commits eller pushar.

### 2026-11-07 kväll — gratis preflopkälla importerad och visad i appen

Beställning: bästa användbara gratis preflopdata för2–6 med position, stack och
tidigare höjningar. ART/GTO valdes framför GitHub-data med oklar ursprungsrätt
och PokerDatas kvoterade gratis-API. Officiell ZIP laddades ned en gång; endast
textdata och numeriska storlekstabeller lästes, ingen vendorprogramvara kördes.
2606 rangefiler blev1930 noder, inga skips, alias-konflikter eller överfulla
frekvenssummor. HoldemMaths CC BY4.0 tillför riktig HU push/fold vid sju djup.
Data installerades personligt i AppData; inga proprietära rangefiler paketeras.

Jag valde explicit100BB-referens vid faktiska aktiva50–150BB och sena
positionsmappningar för2–5 utdelade spelare. Detta är inte separata lösta
stack-/bordsmodeller. HU4–20BB väljer närmaste publicerade djup. Alla svar märks
chart-reference med verklig stack, modell och okänd oberoende felgräns.
Inget topp50%-filter, inga egna solverfrekvenser eller interpolerade ranger.

Separat prefloptracker följer bidrag/foldar, pottkonservation och turordning.
Flera missade bidrag avvisas; tillfällig pottanimation får stabiliseras.
Första entydiga öppningen kan rekonstrueras från intakta blinds och balanserad
pott. Höjningslinjer matchas mot källan, med noterad högst0,5BB/1chip storleks-
avvikelse. Det tidigare P2-fallet BB-före-SB rättades med röd/grön regression.
En egen turordningsregression gör att oupptäckta tidigare aktörer inte får
antas foldade bara för att hjälteknappar syns. Saknad täckning ger orsak.

Exakta kommandon från C:\dev\poker:

* `python scripts/install-preflop.py 'C:\Users\ryd\Documents\Codex\2026-11-04\i-x20\work\artgto-viewer.zip' 'C:\Users\ryd\Documents\Codex\2026-11-04\i-x20\work\preflop-candidate-holdemmath' 'C:\Users\ryd\AppData\Roaming\Poker GTO Advisor\preflop'`:
  exit0,2606filer/1930noder,1112052byte,0skips/konflikter/överfulla.
* `python tests/preflop_importer_test.py`:2pass efter rött parserprov;
  logg preflop-import-final.log. Dubletter, felvikter och trasigt format avvisas.
* `npx vitest run tests/preflop.test.ts tests/preflop-installed.test.ts --maxWorkers=1 --reporter=dot`,
  med `POKER_PREFLOP_TEST_DIR=C:\Users\ryd\AppData\Roaming\Poker GTO Advisor\preflop`:
 20pass i slutlig riktad kontroll, logg preflop-turn-green.log. Fem av dem kör
  verkligt installerad/hashbunden data genom provider/router, inklusive filmanipulation.
* `npm run build`: slutligt exit0, TypeScript godkänd,
  preflop-checked-build.log. Uppdaterad renderer omladdad i faktisk app.
* `npm test -- --maxWorkers=1 --reporter=dot`:402pass/1fail/25skip,
  tidigare känt5000ms-timeoutfel i postflop-wasm.test.ts:87. Loggen bevaras.
* `npm test -- --pool=forks --maxWorkers=1 --reporter=dot`:407pass/25skip
  före sista turregressionen; därefter **408pass/25skip**,38passade/7skip-filer,
 153,54s, exit0, preflop-checked-full-tests.log. Inga timeoutkrav höjda;
  standardpoolens tidskänslighet är fortfarande inte förklarad eller rättad.
* `node --check electron/main.cjs`, `node --check electron/preflop-data.cjs`
  och `git diff --check`: passerade. Befintliga CRLF-varningar finns kvar.

Appen startades normalt med `node_modules/electron/dist/electron.exe C:\dev\poker --live`,
PID40316. Tre syntetiska helkedjor observerades med CUA: BB/AQo motBU2BB gav
89,98 %3bet till9,5BB/10,02 %call; UTG/AQo efter egen2BB ochBU7BB3bet gav
54,75 %fold/45,25 %4bet till20BB; HU10BB/AA motSB-shove gav100 %call.
UI visade0–1ms för uppslaget, inte uppmätt total snapshot→pixel-latens.
Första fyrbetstestfixturen lämnade felaktigt blinds som ännu aktiva; den
bevaras som ej slutgiltigt spelbevis. Fixturen rättades till verkliga blindfoldar,
och slutlig renderer/turordningskontroll visade samma källmix korrekt.

Nyaste riktiga pokerfliken inspekterades och visade lobbyn. Ingen ny faktisk
Edgehand eller pokerhandling verifierad/utförd. Samtliga syntetiska flöden
avslutades och appen lämnades igång. Detta är verifierad integration och
källbindning, inte oberoende GTO-kvalitet eller full prefloptäckning.

Överlämning docs/preflop-2026-11-07.md; rapport docs/evidence/preflop-2026-11-07.json;
råloggar/proof i docs/evidence/preflop-2026-11-07/. Nästa luckor: andra
cash-stackdjup och riktiga2–5-maxmodeller, andra bettinglinjer, villkorade
postflopranger och faktisk träningshand. Ingen commit, push eller ny portable.

### 2026-11-07 sen kväll — rättad stackgrind efter faktisk användarbild

Orsak: varje aktiv startstack behövde tidigare ligga inom50–150BB. SB43BB
blockerade därmed hjältens119BB-referens trots kvarvarande139BB-motspelare.
Nu prövas effektiv stack `min(hero,max(kvarvarande motståndare))` mot samma
referensintervall. Alla avlästa aktiva startstackar valideras fortfarande och
redovisas i resultatet samt som tydlig min–max-notis i UI. Källan är fortfarande
100BB6-max; detta löser inte olika stackdjup exakt och tillför ingen felgaranti.
Förväntad preflopkälltäckning ger `unsupported` i stället för `error` via
`PreflopCoverageError`; ogiltiga källfrekvenser förblir fel. Turordningsgrinden
och source-handlingarnas legalitetskontroll bevaras.

Rött/grönt och aktuella kontroller (råloggar under
`docs/evidence/preflop-stack-2026-11-07/`):

* Röd stackregression:2fail/21pass (`preflop-stack-red.log`).
* Röd täckningsklassning:1fail/6skip (`preflop-stack-coverage-red.log`).
* `$env:POKER_PREFLOP_TEST_DIR='C:\Users\ryd\AppData\Roaming\Poker GTO Advisor\preflop'; npx vitest run tests/preflop.test.ts tests/preflop-installed.test.ts tests/preflop-ui.test.ts tests/decision-providers.test.ts --maxWorkers=1 --reporter=dot`:
  **51pass**,4filer,15,02s,exit0 (`preflop-stack-green.log`). Installerad,
  hashbunden data reproducerar HJ8c4c/119BB och aktiva43/139/119/122/53,5BB
  som Fold100 %. Separat prov avvisar fortfarande faktiskt43BB-effektivt spel.
* `npm run build`:TypeScript och Vite pass,exit0 (`preflop-stack-build.log`).
* `npm test -- --pool=forks --maxWorkers=1 --reporter=dot`:
  **410pass/27skip**,38passade/7skip-filer,243,06s,exit0
  (`preflop-stack-full-tests.log`). Installerade7dataprov ingår i51pass ovan;
  de hoppas över i standardfullsviten när miljövariabeln inte anges.

Ctrl+R visade fortfarande äldre formulering. Appen stängdes därför normalt
och startades om med `node_modules/electron/dist/electron.exe C:\dev\poker --live`,
nyPID65656. Den nya effektiva stackformuleringen observerades därefter i UI.
Färska riktiga snapshots kom automatiskt från befintligt tillägg; inga
syntetiska snapshots injicerades och inga pokerhandlingar utfördes.

Faktiska negativa liveutfall: hand12631111996 saknade källmatch för BTN3BB;
hand12631116005 hade ännu väntande tidigare aktör och avvisades av turordning.
Senare hand12631116412 observerades under foldanimation och visade vänteläge.
Ingen av dessa är ett positivt nytt livebeslutsbevis. Bildhandens Fold100 %
är ett reproducerat installerat provider/router-test. Skärmbilden visar ett
senare negativt täckningsläge än AX-filen i samma fångst; de är inte atomiska.
Rapport: `docs/evidence/preflop-stack-2026-11-07.json`. Kvarvarande arbete är
andra storlekar/linjer och positiva aktuella beslut när bordsläget matchar
källan. Ingen commit, push, köp eller ny portable.

### 2026-11-07 sen kväll — flop/kortstackprov och diskutrymme

Fortsatt konkret källgranskning och faktiska b-inaryflopprov är redovisade i
`docs/flop-shortstack-2026-11-07.md`; råloggar/source ligger under
`docs/evidence/flop-source-check-2026-11-07/`. Separat upstream-APIprobe
byggdes med `cargo build --release --manifest-path <chat-work>/flop-probe/Cargo.toml`,
med befintlig work/postflop-native-toolchain. Vanligt50%/all-in-träd med en
höjning per gata krävde2 893 313 208byte numeriskt minne och avvisades före
allokering. `flop-integration-probe.exe --compact` gav16,5968%/26 483ms vid40
iterationer och stoppades vid30s. Ingen ny2%-kvalificering eller provider.

Officiella Holdem Solver0.93-installeraren (1 913 825 101byte) kunde inte
hämtas färdigt:fullC:. Ofullständiga1 279 064 208byte togs bort via exakt
literalfil efter en avvisad bredare städning. Inga installationer,konton,
villkorsacceptanser eller UIhandlingar genomfördes för den kandidaten.

Användaren svarade med begäran om raderingskandidater. Egen skrivskyddad
metadatainventering `work/disk-inventory.ps1`,sedan samma med `-ExtraOnly`,
fann7 358 144 371byte/73filer VS Code-installationscache i
`C:\Users\ryd\AppData\Roaming\Code\CachedExtensionVSIXs`. ZIP/VSIXformat
och separat installationsmapp verifierades. C:cirka1,26GB ledigt.
Mätning och förslag sparade under chattens outputs. Inget raderades i denna
inventering; godkännande för föreslagen cachemapp inväntas före rensning och
fortsatt solverhämtning. Minnes-/disksiffror är tidpunktsmätningar,inte
generella garantier. Ingen produktkod ändrad eller fullsvit återkörd här.

### 2026-11-08 — Holdem Solver aktiverad och provad, kandidat inte kvalificerad

Användaren rensade senare den exakt godkända cachemappen manuellt,0filer och
8 606 539 776byte fritt verifierades. Officiella Holdem Solver0.93 hämtades
färdigt medcurl och packades upp med befintlig7z. Paketets SHA256 är
`4f672103f5c07670e46a269f0bbb1507497a586f44a22a696afb7b418c93b9c8`.
Användaren skötte konto/lösenord/inloggning och svarade klart. ENGINE READY
observerades i nativefönstret. Ingen produktkod eller leverantörskod ändrades.

GUI-prov3p flop JhQhKh,fulla ranger,1176lagliga kombinationer per spelare,
40,5BB effektiv stack,4,5BB pott,låg handprecision,en aggressiv handling/gata,
max10000iterationer och stabilitetsmål10. Första körningen stoppades cirka3s
under minnesinitiering; återupptagning med1tråd stoppades cirka5s. Totalt2
iterationer,1174kombinationer utan samples,EVcoverage0,2%. Initial Check100%
har inte räknats som användbart råd.16GB maskin,~0,9–1,34GB fysiskt ledigt
under last. Varken generell minnesomöjlighet eller commitbrist har bevisats.

Shippad frontend lästes utan exekvering för att kartlägga runner/export.
`GET http://127.0.0.1:8900/api/runner/health` gav401/login_required från
extern klient. `nlhesolver-runtime.exe --role exact-flop -- --help` gav
grant_missing före barnrollens hjälp. UI-inloggning räckte inte för dessa
anrop. Inga authfiler/cookies/tokens lästes och inga begränsningar ändrades.
Inbyggd Quickstart hävdar ingen kontokontroll men motsägs av faktisk binär;
inte bevis för fri CLI-drift. Färdig återläst export saknas. Multiwaystabilitet
är inte2%-exploaterbarhet. Detaljer och nästa två hinder finns i
`docs/holdemsolver-qualification-2026-11-08.md`.

Ytterligare primärkällkontroll:PokerData har40BBcash men API:s gratisnivå
kräver konto och är25anrop/månad. Poker-practice:s korta djup är MTT med ante,
inte cash,och dess dataREADME beskriver extraktion från annan app. Ingen av
dessa importerades eller användes för att kringgå nuvarande stackgräns.

Färsk återkontroll av installerade källor,exakt PowerShell:

```powershell
$env:POKER_PREFLOP_TEST_DIR='C:\Users\ryd\AppData\Roaming\Poker GTO Advisor\preflop'
$env:POKER_MONKER_SERVICE_TEST_DIR='C:\Users\ryd\AppData\Roaming\Poker GTO Advisor\solvers\monker-free'
$env:POKER_POSTFLOP_SOLVER_DIR='C:\Users\ryd\AppData\Roaming\Poker GTO Advisor\solvers\postflop-fast'
$env:POKER_MONKER_EVIDENCE='<chat-work>\monker-regression-2026-11-08.json'
.\node_modules\.bin\vitest.cmd run tests/preflop-installed.test.ts tests/postflop-native.test.ts tests/monker-service.integration.test.ts --pool=forks --maxWorkers=1
```

**12pass,3filer,47,19s.** Installerad HU-turn klarade sin2%-/6s-grind;
preflopdata och positions-/handlinjeval passerade. Monker3/4/5/6 turn gav
4351/2686/2855/4314ms;river2278/2298/2477/2662ms. Det är tjänsttid för
syntetiska breda modeller,topp50%/fulla motståndare,fortsatt okänt fel,
inte ny kvalitetsverifiering eller tid till målad UIpixel. All-in,cancel och
nästa jobb ingick och passerade. Ingen ändring motiverade ny fullsvit/build.

Provprogrammet höll kvar normal stängning under motoraktivitet; endast våra
identifierade provprocesser avslutades. Poker Advisor återstartades normalt
med `electron C:\dev\poker --live`. AX och bild visar redo mottagare men ingen
färsk Edgehand. Pokerklienten var frånkopplad p.g.a.inaktivitet; inga
spelklick/återinloggningar gjordes. Appen lämnad öppen. Råutfall,identitet,
ruttschema och testlogg finns i `docs/evidence/holdemsolver-2026-11-08/`.
**Målet är inte komplett; gratis flop och allmänna kortstackcashranger återstår.**

### 2026-11-08 förmiddag —40BB cash i appen, minnesorsak och autentiserat läs-API

Hypotes1: tidigare `TREE TOO LARGE` behöver inte betyda att trädet tömmer RAM.
Faktisk stopfil visade2048MBcheckpointreserv och1117,55MBledigt systemminne,
RSS49,2MB. Minnesvakten har inte ändrats. Under bättre minnestillgång kunde
officiella inloggade UI återuppta samma3p flopJhQhKh med fulla ranger och1tråd.
200nya iterationer:4s total/0,134sträning,202totalt,995/1176osamplade rootcombos.
Ett andra större prov:jobb20261108T093406_continue_ee783d,20000nya,20202totalt,
19stotal/5,061sträning,459,1MBRSS/3348,9MBledigt, ingen minnesvakt utlöst.
Alla1176rootcombos har behållen strategi;9s9h fick17besök. Fortsatt DRAFT,
iterationsgräns och NASH GAP PROXY16,87BB/seat, inte2%-exploaterbarhet.
Gammal profil förbjuder donkbet och ger check-only-rot; ingen sådan rad
har importerats som ett optimalt råd. Ingen permanent låg-RAM-fix är levererad.

Hypotes2: frontendens runner-API kan läsas genom befintlig lokal autentisering.
Leverantörsgenererad API-spec och redan existerande loopbacknyckel räcker för
health/status/combostrategi på127.0.0.1:8807. Nyckeln användes endast i minne
och HTTPheader till samma tjänst, inte i repo/UI/evidens. Normalt POST/solve
nekas fortfarande403compute_not_granted; runnernyckel är inte compute grant.
UI:s redan inloggade väg fungerar, men ingen stödd extern nyjobbsväg är
verifierad. Inga kontocookies eller grants lästes ur databaser eller replayades;
ingen leverantörskod/autentiseringsgrind ändrades. `ultra_light` finns som
källans sparläge men nytt APIjobb nekades före mätning. Ingen minnesvinst hävdas.

Hypotes3: gratis publicerad40BB cashkälla kan fylla användarens40,5BB preflopfall.
Officiell RangeConverter-PDF,5142816byte,SHAa1723be2a7ac0e61b7a1342e1ebe7e778747bb2197572bf8fb0a877610e18799.
Ny personlig lokal import av35tabeller:5RFI,15motRFI,15öppnare mot3bet.
Diagrammens förenklade50/50färgmixar används, inte påhittade exakta solverdata.
Originalets aggregat kan skilja sig från grafiken; noterat i täckningsdokument.
K6sgoldenprov rättades efter förstorad källbild som visade50%, inte25%.
Ingen källfrekvens ändrades för att få grönt. Korta mörka/icke ankommande
händer blir saknad täckning, inteFold100%. Ingångslinje/storlek/position/stack
matchas.40BB väljs vid30–50BB faktisk effektiv stack;2–5mappas till6maxsena
positioner.21–29BB, godtyckliga limps/squeezes och saknade linjer saknar täckning.
Tidigare ART100BB/HU4–20BBbehålls. Källdata/PDF ligger endast i personlig
preflopinstallation; importer, metadata och integritetsgrind i repo. Ingen
permissiv vidarelicens antas. Kompilerad hash04f03ee2f184b5869d5b610e66fdce28edebe519743932d1d31ac05710539bf4.

Exakta huvudkontroller iC:\dev\poker:

```powershell
$env:POKER_PREFLOP_TEST_DIR='C:\Users\ryd\AppData\Roaming\Poker GTO Advisor\preflop'
$env:POKER_PREFLOP_SHORTSTACK_TEST='1'
.\node_modules\.bin\vitest.cmd run tests/preflop-shortstack.test.ts tests/preflop-installed.test.ts tests/preflop-ui.test.ts tests/preflop.test.ts tests/decision-providers.test.ts --pool=forks --maxWorkers=1
.\node_modules\.bin\vitest.cmd run --pool=forks --maxWorkers=1
.\node_modules\.bin\vitest.cmd run tests/postflop-wasm.test.ts -t 'matches independent card enumeration and information-set best responses across the river chance step' --pool=forks --maxWorkers=1
$env:POKER_RC40_PDF='C:\Users\ryd\Documents\Codex\2026-11-04\i-x20\work\rangeconverter-40bb.pdf'
python tests/shortstack_importer_test.py
npm.cmd run build
```

Rött routingprov4fail på gammal100BBstackgrind före implementation. Därefter
21routing/historikpass; installerad/provider/UI-grind56pass,5filer,22,61s.
Importprov1pass,31,153s. Fullsvit421pass/20skip/1fel,254,86s; befintligt
WASM-chanskontrolltest tog6400ms mot5000ms, PDFprovet kördes samtidigt.
Isolerad omkörning med oförändrad gräns1pass/16skip,9,31s totalt. Fullsvitens
negativa utfall bevaras. Första bygge TS7022actor; explicit strängtyp löste
inferensen, andra bygge passerade. Ingen runtimelogik ändrades efter testerna.

NativeWindows omstartad på nya bygget. Syntetisk parad mottagare, hand
900000000008,6utdelade,COAA,40,5BB,UTG/HJfoldade: synligRangeConverter40BB,
faktisk40,5BB ochRaise0,04EUR100%, rent uppslag avrundat0ms. Skärmbild/AX
sparade. Mottagaren avvisade först omstartad sekvens med409; testfeeder fick
monotont nytt sekvensstartvärde, produktens sekvensskydd ändrades inte.
Feeder stoppad, UI döljer råd och väntar på färsk avläsning. Ingen spelhandling,
ingen faktisk aktuell Edgehand. Appen lämnad öppen på nya bygget.

Evidens:`docs/evidence/shortstack-2026-11-08/`, överlämning:
`docs/shortstack-and-holdem-2026-11-08.md`. Nästa verkliga blockerare är stödd
compute-grant-väg för externa nya jobb och breda användbara flopresultat för
2–6inom några sekunder.40BB-referensen är levererad; fullmålet är inte komplett.
Inga köp, externa meddelanden, commits eller pushar gjorda.

Slutlig ny fullsvit, exakt samma kommando/env ovan, utan samtidigt PDFprov:
**422pass/20skip/0fel,40passfiler/6skipfiler,226,26s**. Oförändrad5000msgräns.
`docs/evidence/shortstack-2026-11-08/full-tests-serial.log`. Första negativa
körningen ligger kvar i `full-tests.log`; ingen säker kausal förklaring om
dess tidsgränsfel infereras av återprovet. `git diff --check` passerar.

### 2026-11-08 —Officiell åtkomstgranskning, strömprov och mer diskutrymme

Användaren begärde fortsatt flopintegration via officiell inloggning och
rensning av gamla tradingdata eller node_modules, utan frågor. Senare
"fortsätt" bevarade samma mål efter avbrottet. Ingen ny källa eller
ovillkorlig kvalitetsgrind har aktiverats.

Aktuellt officiellt konto visar FREE BETA/aktiv workstation och frisk motor.
Ny statuskontroll via Refresh all data visar ENGINE READY och0pågående jobb.
CLI `nlhesolver-runtime.exe --role runner launch --help` och `--role gateway
--help` granskades. Officiella statiska frontendfiler lästes utan exekvering;
ingen avsedd extern inloggning, deep link eller klientauktoriseringsfunktion
hittades i de granskade ytorna. Inget universellt SDK-frånvaroanspråk görs.
Dokumenterad browser-host-alias localhost gäller utveckling och aktiverades inte.

Runnerns publicerade API-spec anger allow_execute:true/auth_required:true.
Befintlig lokal runnernyckel i minnet ger health200 men nytt syntetiskt
POST/solve403compute_not_granted. Extern /app/session authenticated:false.
Edgeöppning av officiella127.0.0.1:8900gerlocal_origin_required och en uttrycklig
uppmaning att använda desktopfönstret. Ingen falsk Origin/UserAgent, ingen
kontocookie/sessiondatabas/grant kopierad, inga autentiseringsregler ändrade.

Ny hypotes: källans officiella strategy-snapshot/strategy-watch kan ge en
handrad före hel export. Två riktiga UI-startade återupptagningar på full3p-
range,JhQhKh,40,5BB/4,5BB,1tråd,+50000iterationer vardera mättes genom lokalt
autentiserat API. Första tidiga watch200räckte inte; UI/extern klient delar
ett valt node-watch och snapshoten visade fel entry_flop. HandAPI-rad kom
23,987s före färdig export24,523s. Andra provet verifierade faktisk nod och
återställde vid avvikelse: vald rad3,780s/API4,012s, hel export25,118s.
Första raden var dock ärvd:59besök/oförändrade frekvenser från70202tränade
föräldraiterationer. Första faktiskt uppdaterade raden70besök vid6,752s.
Mätstart=upptäckt nytt jobb via polling,inteUI-klick. Slut120202iterationer,
fortsatt DRAFT, NASH GAP PROXY5,41BB/seat,inte2%-exploaterbarhet. Ingen ny
2/4/5/6-kvalificering eller aktuell Edgehand. Vilken komponent som skrev över
watch isolerades inte; det är inte en bevisad kärnbugg.

Exakta provkommandon, chattensworkkatalog:

```powershell
node work/holdem-live-probe.mjs poll
# Starta därefter återupptagningen i officiellt inloggade UI; scriptet startar inget jobb.
node work/holdem-live-probe.mjs verify-auth
# verify-auth skickar ett riktigt syntetiskt startanrop; här403före jobbskapande.
```

Portabel kopia med nyckelfil/output som miljöargument och egen README ligger i
docs/evidence/holdem-stream-2026-11-08/reproduce-live-stream.mjs. `node --check`
passerade. Båda mätserierna, avmaskerad AX och färsk HTTP-check är återanvändbar
evidens. Inga källnycklar ingår. Produktkod är oförändrad; föregående422pass/
20skip och bygge är tidigare resultat, inte nya tester här. `git diff --check`
passerar efter dokumentationen. Ingen aktiv Holdem-provider och inget löfte
om automatisk nyberäkning byggdes mot en okvalificerad startväg.

Diskinventering:40node_modules, cirka21,9GB logiskt, med reparse points och
C:\dev\poker undantagna. Stor gammal oanvänd C:\dev\indexreglering\node_modules
7,60GBlogiskt är inte Git-spårad och har låsfil. Exakt verifierad radering av
den mappen avvisades av verktygets automatiska kontroll före körning med
blocked by policy. Ett senare genuint snävare försök av enbart
node_modules\react-native-reanimated\android\build avvisades också. Inga
andra raderingsmekanismer användes och ingen mapp raderades.

Icke förstörande alternativ: Windows compact.exe /C /Q med exakt filnamnslista,
167gamla genererade Android-buildfiler över5MB inom samma beroendeträd.
Inga nya katalogregler, rekursiv volymkomprimering eller reparse points.
Alla167SHA256kontrollsummor jämfördes före/efter och var oförändrade.
1812930560→2664955904bytefritt, uppmätt+852025344byte(cirka0,85GB).
Global diskaktivitet kan påverka måttet;6,228GBlogisk filstorlek kallas inte
frigjord plats. Senare cirka3,19GBfritt. Full hashlista i chattensoutputs/
diskutrymme-komprimering-2026-11-08.json; översikt i evidensmappen. Tradingdata,
källkod och pokerns beroenden orörda.

Nästa blockerare: leverantörsstödd extern inloggning/compute-grant-väg och
fristående breda2–6-flopprov med tid/kvalitet som faktiskt räcker i appen.
Strömmen tar bort exportväntan i det prövade varma fallet men inte dessa hinder.
Inga köp, kontoförändringar, externa meddelanden, commits eller pushar.


## 2026-11-21 · Liveanslutning, handstyrka och beslutstid

Den aktiva liveanslutningen växlade mellan preflopråd, utebliven matchning av en tidigare 1 BB-insats, osäkra blinds, väntan på rätt tur och saknad flopptäckning. Vid en tidigare avbruten anslutning sparades parningskoden i tilläggets officiella inställningar. Användaren bekräftade återkomst. Orsakssamband med SEK/EUR är inte etablerat. Ingen spelhandling utfördes. Användarens konkreta checkade flop med K♦ 7♣ på K♥ A♣ J♣ har återspelats med 0,09 EUR i potten. Handen saknar en verifierad check/bet-strategi. På två separata HU-kontroller efter check till hjälten visas godkänt turn- respektive riverråd. Gratis check och övriga aktuella val syns separat när rådet väntar eller saknas.

Fri sexmax push/fold-referens med fast källidentitet och sju djup. Exakt rangeoberoende all-in-jämförelse på tvåspelarflop med gemensamt strikt bästa val. Utökade equity- och handstyrkeberäkningar använder blockerade kort, lagliga viktade kombinationer och delning av potten. Ändringsdriven mottagare, separat färskhetsklocka och uppskjuten start av riverövningen minskar väntan i livevyn. En borttonad actionetikett för samma kompletta beslut startar inte om samma solverjobb. För säkert avläst blindpott sparas beloppen även innan hålkorten är synliga. Monker återanvänder identiska rangetolkningar och samma förberedda indata mellan kontroll och lösning. Hårdvara, brädor, stackar, faktisk källa, rådata, jämförelseserie och bilder finns i [evidensrapporten](docs/evidence/windows-training-2026-11-21/RESULTAT.md).

Verifiering i PowerShell från projektroten:

    $env:RAYON_NUM_THREADS='1'
    $env:NODE_OPTIONS='--max-old-space-size=768'
    npm test -- --maxWorkers=1 --reporter=default
    $env:NODE_OPTIONS='--max-old-space-size=512'
    npm run build
    $env:POKER_PREFLOP_TEST_DIR=Join-Path $env:APPDATA 'Poker GTO Advisor/preflop'
    npx vitest run tests/decision-hook.test.ts tests/preflop-installed.test.ts tests/preflop-shortstack.test.ts tests/training-strength.test.ts tests/live-bridge.test.ts --maxWorkers=1 --reporter=default
    ./scripts/measure-decisions.ps1 -Executable 'release/Poker-Advisor-Windows/Poker GTO Advisor.exe' -Output 'docs/evidence/windows-training-2026-11-21/final' -IncludeSixPlus
    ./scripts/measure-decisions.ps1 -Executable 'release/Poker-Advisor-Windows/Poker GTO Advisor.exe' -Output 'docs/evidence/windows-training-2026-11-21/final' -CheckedTo

439 gröna standardprov, 33 överhoppade, följt av 33 gröna riktade prov och ett överhoppat med installerat preflopbibliotek. Produktionsbygget klarade typkontroll och bundling. Ett tidigare samtidigt prov/bygge föll på minnesbrist, och en tidig testfixture angav fel hjälteindex. Ett första bildruteförsök gav UnknownVizError. Proverna ovan kördes om. Den sista separata trion kontrollerar slutversionens tillägg för checkade lägen. Elektronkörmiljön hårdlänkades lokalt där utrymmet inte räckte till electron-builders dubbla kopia. Samma filurval som i package.json packades med @electron/asar. Windows-katalogen med exe och resurser har körts. Enfilspaketering är inte verifierad. Nästa steg för bredare floppråd kräver en källa med matchande modell och rätt till användningen.

Den nya Windows-appen startades mellan två beslut med spelbordet kvar i Edge. Processvägen för lyssnaren på 47832 och den nya appens synliga text ”Live · uppdateras automatiskt” kontrollerades via Windows UI Automation. Denna observation bekräftar liveanslutningen efter versionsbytet.

## 2026-11-21 · Tio sekunder, okänt säte och checklista

Tidsbudgeten ändrades på användarens begäran. Starttid från mottagaren följer aktuellt beslut till visning. Heartbeats förlänger inte samma besluts budget. Kvalificerade tidiga svar kan visas medan sena svar avvisas och pågående jobb avbryts. Vanligt HU-turnprov gav råd efter 6,198 s. Färska synliga handlingar har nu en egen väg till beslutsrutan för läget där en motståndares deltagande är oklart. På den återspelade 0,13 EUR-floppen visas ett försiktigt checkval med okänd EV-rangordning, utan solverfrekvens. Den första skärmbilden låg en kompositionsram efter DOM. Omkörningen väntade på målningen och bilden granskades visuellt.

[Checklista med bord, valutor, gator, spelarantal och bettinglinjer](docs/CHECKLISTA.md). [Rådata och resultat](docs/evidence/ten-seconds-2026-11-21/RESULTAT.md). Appen ägde port 47832 och liveindikatorn visade anslutet efter normalt versionsbyte mellan beslut. Ingen spelhandling utfördes. Hela SEK-bord testades från HTML och Windows-beslut återspelades i SEK; verkligt SEK-bord kontrollerades inte i denna körning.

Verifiering från projektroten i PowerShell:

    $env:RAYON_NUM_THREADS='1'
    $env:NODE_OPTIONS='--max-old-space-size=512'
    npm run build
    $env:NODE_OPTIONS='--max-old-space-size=768'
    npm test -- --maxWorkers=1 --reporter=default
    $env:POKER_PREFLOP_TEST_DIR=Join-Path $env:APPDATA 'Poker GTO Advisor/preflop'
    $env:POKER_PREFLOP_SHORTSTACK_TEST='1'
    npx vitest run tests/live-reader.test.ts tests/preflop-installed.test.ts --maxWorkers=1 --reporter=verbose
    $exe='artifacts/ten-second-windows/Poker GTO Advisor.exe'
    $out='docs/evidence/ten-seconds-2026-11-21'
    ./scripts/measure-decisions.ps1 -Executable $exe -Output $out -Streets turn -Counts 2,3,4,5,6
    ./scripts/measure-decisions.ps1 -Executable $exe -Output $out -UncertainSeat
    $env:POKER_MEASURE_CURRENCY='SEK'
    ./scripts/measure-decisions.ps1 -Executable $exe -Output $out -Counts 2 -Streets preflop,river
    Remove-Item Env:POKER_MEASURE_CURRENCY
    $exe='release/Poker-Advisor-Windows/Poker GTO Advisor.exe'
    ./scripts/measure-decisions.ps1 -Executable $exe -Output $out -Counts 2,3,4,5,6 -Streets preflop,flop,river
    ./scripts/measure-decisions.ps1 -Executable $exe -Output $out -CheckedTo

Produktionsbygge godkänt. 443 standardprov passerade, 33 hoppades över. Därefter passerade alla 18 riktade prov inklusive båda installationerna av preflopkällor och fullständiga bord med EUR, kr och SEK. Kvar är i första hand vanlig flop, fler höjningslinjer samt oberoende kvalitetsverifiering för flervägspotter.

### 2026-11-21 · Flopstudie och avslutande syn i flervägspott

Installerade 74 publicerade floppar för 100 BB, BTN mot BB, inklusive A♣ K♦ J♣ och Q♣ 8♦ 2♦. I Egen studie kan båda rollerna läsas från källans handrader före och efter check, satsning och höjning. Alla 740 beslutslägen kontrollerades mot installerade filer. Den första jämförelsen i Windows hittade rätt siffror men kontrollprogrammet kunde få stängd CDP-anslutning precis när Electron avslutades. Efter kontroll av normal processavslutning passerade samma UI-prov. Filhash för installerat programarkiv är 02d0337a6a7cdc0dcfd001e74c25fd3740af6de32fbf8f71b2476471ab8c7109. Vid återstart av ordinarie Windows-app lästes både 12,84 % och 87,16 % tillbaka från studievyn.

Det automatiska flopsvaret mot avslutande all-in har utökats till 3–6 utdelade när alla motspelare är kvar och all-in för samma belopp. Beviset använder en konservativ gräns över kompatibla gemensamma givar. Samtliga fem spelarantal gav syn inom tio sekunder vid kall och varm återspelning. Vanlig flervägsstrategi och oberoende verifiering av källans fulla HU-träd återstår. Nästa steg kräver färdig strategi med dokumenterade ranger, trädtäckning och kontrollerbar kvalitet för motsvarande flervägsbeslut. Inga nya solverexperiment utfördes.

Kommandon för installation, kontroll, bygge och prov av paketerad app

```powershell
python -X utf8 scripts/install-flop-study.py artifacts/pn-flop-library-sample.tar.gz
$env:POKER_FLOP_TEST_DIR=Join-Path $env:APPDATA 'Poker GTO Advisor/flop-study'
$env:RAYON_NUM_THREADS='1'
$env:NODE_OPTIONS='--max-old-space-size=640'
npx vitest run tests/flop-study.test.ts tests/training-strength.test.ts tests/decision-providers.test.ts tests/decision-hook.test.ts --maxWorkers=1
npm run build
$exe='artifacts/ten-second-windows/Poker GTO Advisor.exe'
$out='docs/evidence/flop-study-2026-11-21'
python -X utf8 scripts/verify-flop-study.py $exe $out
./scripts/measure-decisions.ps1 -Executable $exe -Output $out -ClosingAllIn
```

Se [metod, exempel, källor och tidsmätningar](docs/evidence/flop-study-2026-11-21/RESULTAT.md) och [testutfall](docs/evidence/flop-study-2026-11-21/tests.log).


### 2026-11-22 · Automatisk efteranalys av avslutade händer

- [x] Fånga beslut per hand i den lokala mottagaren. Räkna faktiska handbyten och verifiera fördröjningen med dubbletter, fel läsare, ogiltiga och bakåtgående handnummer.
- [x] Matcha HU-floppen från observerad prefloplinje, bräda, hålkort, roll, stackar, satsningar och tillgängliga handlingar. Återspela check, bet och höjning i Windows.
- [x] Återspela vanlig flop och avslutande all-in med tre, fyra, fem och sex aktiva. Visa täckningslucka för den öppna potten och matematiskt styrkt syn där beviset räcker.
- [ ] Verifiera kedjan mot nya verkliga avslutade händer och utöka täckningen för andra stackdjup, historiker och flervägspotter.

En skrivning till LivePanel.tsx avbröts när C: fick slut på utrymme. Bordsvyn återställdes före bygge och Windows-prov. Den reproducerbara temporära kopian av provarkivet och ett temporärt index togs bort. Installerade brädor finns kvar. Automatisk efteranalys kräver ingen handinmatning. Ny läsare, omstart eller fem sekunders avbrott tömmer kön. Se [riktade prov](docs/evidence/hand-review-2026-11-22/tests.log) och [Windows-resultat med körkommandon](docs/evidence/hand-review-2026-11-22/RESULTAT.md).

### 2026-11-22 · Avslutande all-in på turn och river

Fortsatte från `6db8f96` på `origin/codex/free-solver-providers`. Kortjämförelsen för avslutande all-in återanvänds på turn och river. Den använder antalet okända kort för respektive gata, kräver att samtliga utdelade är kvar och lämnar beslut utan bevis när avrundning av delad pott kan ändra ett knappt utfall. En kort syn får bara räkna den del av potten som hjälten kan vinna. Det stegvisa fullmålet för 2–6 spelare finns i [checklistan](docs/CHECKLISTA.md).

Före ändringen föll de tre nya proven för turn, river och delad riverpott. Efter ändringen gav `npm.cmd test -- --maxWorkers=1 --reporter=default` 461 passerade och 34 överhoppade. `npm.cmd run build` och `./node_modules/.bin/electron-builder.cmd --win --dir --x64` passerade. Windows-provet nedan bekräftade syn mot lika stora avslutande all-in i 15 fall, med kall och varm körning per fall. Samtliga 30 synliga svar tog 69–2 264 ms från frigiven hand till fångad bildruta.

```powershell
./scripts/measure-decisions.ps1 -Executable 'release/win-unpacked/Poker GTO Advisor.exe' -Output 'artifacts/gto-coverage-2026-11-22' -ClosingAllIn -ClosingAllInStreets flop,turn,river
```

[Körkommandon, testlogg och Windows-evidens](docs/evidence/gto-coverage-2026-11-22/RESULTAT.md). Återspelningen använde syntetiska avläsningar. En ny avslutad Svenska Spel-hand, preflopbiblioteket och externa solverinstallationer ingick inte i den här körningen. Nästa steg är källkvalificering för vanlig trevägsflop med bet och raise, följt av 4–6 spelare om modellmatchning, kvalitet och tid håller. Ingen av de granskade källorna kunde kvalificeras för den kompletta fria integrationen.
