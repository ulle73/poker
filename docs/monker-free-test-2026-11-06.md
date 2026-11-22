# Monker Free: faktiskt prov av 3–6 spelare på turn och river

2026-11-06, Windows. Beställning: gratis källa för träningshänder med låtsaspengar,
några sekunders svar och uppmätt 2 % felgräns. **Multiway är inte aktiverat i appen.**

Fortsatt mätning: [13 prestandaprov och snabbare profil](monker-performance-2026-11-06.md)
gav samma sexvägs turnarbete på 14,030/14,819 s. Tiden 30,174 s nedan är det
historiska första provet, inte längre bästa observerade tid. Kvalitetsluckorna kvarstår.

## Vad provet visar

MonkerSolver FREE 10114 har faktiskt räknat och exporterat alla åtta kombinationer
av 3–6 spelare och turn/river. Detta ersätter tidigare status där New tree-dialogen
blockerade testerna. Användarens manuella OK löste den delen.

Det är inte en kvalificerad lösning på hela beställningen: ingen uppmätt NashConv
eller annan bevisad 2 %-övre gräns har identifierats i de körda vyerna, inställningarna
eller arkivexporterna. Fullständig mappning från exporterad bucket/nod till appens
kortkombinationer och action-EV är inte verifierad. Den större iterationsbudgeten
tog dessutom 30,174 s för sexvägs turn, redan i det lilla kontrollträdet.

## Faktiska tider

Tiden är från `Date.now()` omedelbart före GUI-knappen Start till filens sista
skrivtid på samma dator. Den inkluderar start, beräkning och arkivskrivning.
Det är ett enda prov per rad, i en redan startad JVM med uppbyggd handdatacache.
Det är **inte** tid till ett synligt beslut i Poker Advisor, och inte tid till 2 %.

| Aktiva | Turn, ratio 1 | River, ratio 1 | Turn, ratio 10 | River, ratio 10 |
| --- | ---: | ---: | ---: | ---: |
| 3 | 2,948 s | 1,159 s | Ej slutfört, se startfelet nedan | Ej kört |
| 4 | 1,629 s | 1,136 s | Ej kört | Ej kört |
| 5 | 2,124 s | 1,568 s | Ej kört | Ej kört |
| 6 | 4,460 s | 1,456 s | 30,174 s | 1,885 s |

`Run to (iterations/nodes)` är Monkers iterationskvot, **inte procentfel**.
Noderna i nämnaren är informationslägen; de är inte de 25–769 offentliga
träffnoderna i tabellen nedan. Antalet faktiska iterationer finns per fil i
`evidence/monker-free-benchmark-2026-11-06.json`. Programmets trådar kör i block,
så den angivna kvoten kan överskridas vid stopp.

[Utgivarens startguide](https://www.monkerware.com/guide.html) anger kvoten 10
som en tumregel för när lösningen börjar bli rimlig. Guiden definierar ingen
2 %-garanti. Därför används ratio 1 endast som ett funktions- och exportprov.
Inte heller ratio 10 är en kvalitetscertifiering.

## Exakt modell och begränsningar

- Vanlig 52-korts NL Hold'em, 3/4/5/6 aktiva. Första aktör index 1, samma ordning
  som vendor-GUI:ts BTN/SB/BB-kontroll. Samtliga ranger är fulla, vikten 1 på 1326
  startkombinationer per spelare; boardblockering hanteras av Monker.
- Pott 4, återstående stack 200 per spelare, lika stackar, rake 0.
  Skriptfältet använder **interna tusendelar**: `200000`, inte `200`.
- Turn `Ks7d2c8h`, river `Ks7d2c8h9s`.
- Avsiktligt litet kontrollträd: check, fold, call och all-in; inga vanliga
  halvpottssatsningar. **Inget fullständigt NLHE-träd, inga olika stackar eller
  sidopottstester.** Tiderna får inte generaliseras till dessa fall.
- Keep average strategy 2 streets, Keep EV 2 streets, 4 trådar; JVM `-Xmx2g`.
  Exporten anger `isoLevel=0`. Abstraktionsinställningarna har inte omvandlats
  till ett fullspelsfelmått. Ingen vendoralgoritm eller skyddskod ändrades.

| Spelare | Turnnoder | Rivernoder |
| --- | ---: | ---: |
| 3 | 49 | 25 |
| 4 | 129 | 65 |
| 5 | 321 | 161 |
| 6 | 769 | 385 |

## Export och anropsväg

Officiell installerare hämtades från
`https://www.monkerware.com/downloads/monkersolverfree-setup.exe` och packades
upp med befintliga 7z. Ingen installerare, kontoregistrering eller betalning
behövdes. Kostnaden för testet var 0 kr.

- Installerarens SHA-256:
  `5d2062483fa0e9f82bbc0e1bfbeffe0223c5a112c8dea0e2d5be927d9a0ad425`.
- `MonkerSolverFree.exe`, SHA-256:
  `f66d7f2b5d8b35393577a39abfc0325215f26dd5102355e1ae49be477318e652`.
- Medföljande Java 11 hade tidigare dialogproblem. De faktiska körningarna använde
  befintliga Adoptium 17.0.16.8, 2 GB heap, Java2D D3D av och UI scale 1.
- Solve-flikens **Scripting** har verklig batchfunktion: tree-fil, lista av boards,
  stackstorlekar, iterationskvot, filnamn och destinationsmapp. Alla lyckade prov
  använde **Save for further calculation** och skapade `.mkr` automatiskt.
- `c.R.main(String[])` läser inga argument och startar GUI. Det är inte en fungerande
  CLI. Det utesluter inte att andra gränssnitt finns; något dokumenterat stabilt
  automatiskt anropskontrakt för appen har inte verifierats här.

En `.mkr` är ett ZIP-arkiv med UTF-16-kodade entrynamn. `tree` innehåller
binära träddata; flera andra entries innehåller vanlig Java-serialisering av
primitiva arrayer/scalarer. Exempel: `board`, `cf*`, `avg`, `evs`, `eviters`,
`iterations`, `iscount`, `avgstreets`, `evstreets`, `rng*`, `version`.
`avg` är rådata och kan **inte direkt visas som normaliserade handfrekvenser**.
`cf*` får inte utan vidare tolkas som en kvalitetsgaranti eller direkt action-EV.

Den fristående läsaren `scripts/monker-audit/MonkerArchiveInspect.java` använder
JDK:s ZIP-läsare och tillåter endast primitiva arrayer, nödvändiga Java-containrar
och scalarer i ObjectInputFilter. Den läser inga vendorobjekt och startar ingen
solver. Samtliga tio batcharkiv lästes; headers/boards/stackar/versioner stämde,
numeriska arrayer var ändliga. **Detta är formatkontroll, inte strategibevis.**

`MonkerProbeInputs.java` använder vendorversionens rena spelövergångar för att
skriva testträden. Det manuella trevägsturnträdet från GUI och generatorns
trevägsträd är byteidentiska: SHA-256
`4b062d2d3e21e19ee0f97bfed684c1ebcfb7c724151e72ee84abad0b4fc3ca0b`.
Samtliga tio exporterade träd matchar respektive inputfil byte för byte.
Hjälparen är en versionsbunden testgenerator; den är ingen egen solver och
inget produktions-API. Originalprogrammet distribueras inte i evidenspaketet.

## Felmåttet och integrationsbeslutet

För att styrka samma slags krav som appens nuvarande HU-grind krävs för N spelare
en bestämd strategi för alla spelare, korrekta range-/kortkollisioner, utbetalningar
och ensidiga bästa-svarsvinster. Ett möjligt uttryckligt kontrakt är
`100 * sum_i(BR_i(sigma_-i) - u_i(sigma)) / startpott <= 2`.
Ett ensidigt maxmått, ett medelvärde och summan är olika mått och måste skiljas åt.
Ingen sådan kontroll beräknades av dessa Monkerprov; `qualityPct` är därför `null`.

Iterationer, normala frekvenser, samplingfel för equity, stabil EV eller genomsnittlig
regret räcker inte för detta påstående. Vendor-FAQ:n om svårmätt fullstrategikvalitet
gäller främst preflopranger och används inte som bevis att varje postflopsolve är
fel. Det aktuella hindret är det saknade verifierade måttet för **dessa** exporter.
Se [FAQ](https://www.monkerware.com/faq.html) och
[abstraktionsbeskrivningen](https://www.monkerware.com/compare.html).

**Ingen Monker-provider är registrerad eller aktiverad.** Att ansluta GUI:t och
visa resultaten som ”2 % GTO” skulle felmärka resultaten. Befintlig HU-provider
har inte ändrats. Monker är användbar för manuella multiwaystudier; kravet på
kvalitetskontrollerade beslut inom några sekunder är inte verifierat uppfyllt.

## Bevarade misslyckanden och efterlämnat läge

1. Den ursprungliga pot100/stack100/50%-planen i `planned-cases.json` kördes aldrig.
   De små kontrollmodellerna ovan ersatte den som första interoperabilitetsprov.
2. Tree Save misslyckades först tyst därför att den uppackade runtime saknade den
   tomma katalogen `trees`. Efter att katalogen skapats skrev GUI:t en riktig fil.
3. Första skriptförsöket använde stack `200` och ratio `10000`. GUI:t visade stack
   0,2 och en lång körning. Försöket stoppades och används inte som latensprov.
4. Före batchmatrisen sparades också ett manuellt 3p-turnprov med 150175744
   iterationer. Observationerna gjordes sent; dess tid är inte ett giltigt prov av
   svarstid. Då var average/EV streets 1, senare ändrat till 2 för batchmatrisen.
5. Ett ytterligare 3p-turn/ratio10-startförsök efter sexvägstesterna skapade ingen
   export. Fönstret stod kvar på föregående resultat trots stoppstatus och startikon
   i stoppläge. Thread dump visade inga solverarbetare eller blockerad AWT-tråd;
   orsaken är inte fastställd. Det är ett misslyckat batchstartförsök, inte en
   uppmätt solvertid. Starttid och dump är bevarade separat.

Monker stängdes därefter via sin normala avslutningsdialog; processen är borta.
Poker Advisor PID59988 är fortfarande igång. Inga pokerhandlingar eller nya
webbläsaranslutningar gjordes under dessa tester. Ingen ny livehand eller något
multiwayråd i appen påstås verifierat. Ingen commit eller push utförd.

## Överlämning och återstående konkret arbete

Råexporter, åtta inputträd, starttider, arkivinventering och läsarkod finns i
chattens `outputs/monker-testpaket-2026-11-06.zip`. Återanvändbar sammanfattning,
inputträd och ett komprimerat exportexempel ligger i `docs/evidence/monker-free/`.
Det återstår ett verifierat policy-/kombinationskontrakt, ett oberoende felmått
eller bevisat övre bound, därefter ett uthålligt anrops-/avbrottskontrakt och
verkligt UI-prov under samma deadline. Bara att öka iterationerna eller automatisera
fler musklick löser inte dessa krav. Ingen ny egen solverträning ska startas.
