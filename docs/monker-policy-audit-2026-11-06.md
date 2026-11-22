# Monker Free: export, oberoende felmått och latens

Datum: 2026-11-06, Europe/Stockholm. Kostnad för arbetets solver: **0 kr**.

**Status: exporttolkningen fungerar för de kontrollerade modellerna, men
generell multiway-liveintegration är inte kvalificerad.** Fjorton faktiska
MKR-exporter från sexton försök är sparade. Samtliga fyra små riverfall för
3–6 spelare klarar 2 %-kontrollen. Inget undersökt turnfall gör det.
Ingen Monker-provider har aktiverats i appen, och inget nytt livebeslut har
verifierats. Befintliga HU-motorer och deras kvalitetsgrind är oförändrade.

## Vad provet faktiskt omfattar

Oförändrad officiell MonkerSolver Free 10114, SHA-256
`f66d7f2b5d8b35393577a39abfc0325215f26dd5102355e1ae49be477318e652`.
Java 17, åtta trådar, två gator med medelstrategi och EV, ingen rake eller ICM.
52-korts NLHE; turn `Ks7d2c8h`, river `Ks7d2c8h9s`.
Pott 4000 interna enheter, stack 200000 per spelare, om inget annat anges.
Trädet innehåller check/fold/call/all-in, **inte alla NLHE-betstorlekar**.

Exakt två kombinationer med vikt 1 per spelare:

| Säte | Kombinationer |
| --- | --- |
| 0 | AhAd, QhQd |
| 1 | KcKd, JhJd |
| 2 | TcTd, 9c9d |
| 3 | 8c8d, 6c6d |
| 4 | 5c5d, 4c4d |
| 5 | 3c3d, 2h2d |

Dessa är syntetiska kontrollranger. Appens fullrange har **inte** ersatts med
dem. De snabba tiderna nedan kan därför inte jämföras som en tidsvinst mot
det tidigare fullrangeprovet på 14 sekunder.

## Felmåttet

För varje spelare beräknas hela profilens EV och ett bästa ensidigt svar som
bara använder egen hand, offentliga kort och handlingshistorik. Alla tillåtna
kortutfall räknas, inklusive blockerade kort från foldade spelares händer.

`NashConv % = 100 × sum_i(BR_i − profilens EV_i) / rotpotten`.

Acceptans kräver högst 2 %. Det innebär även att ingen enskild spelare kan
förbättra sitt EV med mer än 2 % av rotpotten inom denna modell. Det är inte
”2 % fel på handlingsfrekvenserna”, inte equityns Monte Carlo-fel och inte
en garanti för trädet utanför de angivna rangerna/betstorlekarna.
Multiwaymåttet delas inte med spelarantalet för att få ett lägre tal.
Definitionen följer [OpenSpiels NashConv-definition](https://raw.githubusercontent.com/google-deepmind/open_spiel/master/open_spiel/python/algorithms/exploitability.py).

Kontrollen är oberoende av Monkers träning och kortevaluator. Den söker inga
nya tränade strategier. En separat normalformsräkning av 256 rena strategier
per spelare bekräftar trespelarriverns EV och bästa svar. En annan evaluator
för ett fast avvikelsecertifikat bekräftar att trespelarturnen kan förbättras
med **36,08035 % av potten för en enda spelare**. Turnavslaget är därmed
inte enbart ett tal från samma dynamiska bästa-svarsrutin.

## Resultat från faktiska exporter

Tid avser klick på Start till färdig exportfils tidsstämpel. JVM-start,
dialoginmatning, avkodning, kvalitetskontroll och appvisning ingår inte.
En körning per rad; slumpmässig sampling och stoppintervall varierar.

| Fall | Iterationskvot | Tid till fil | Medelstrategins NashConv | Godkänd |
| --- | ---: | ---: | ---: | --- |
| 3p river, utan återställning | 10000 | 1,26 s | 0,960 % | Ja, endast modellen |
| 4p river, utan återställning | 10000 | 1,46 s | 0,449 % | Ja, endast modellen |
| 5p river, utan återställning | 10000 | 1,63 s | 0,512 % | Ja, endast modellen |
| 6p river, utan återställning | 1000 | 1,70 s | 0,926 % | Ja, endast modellen |
| 3p turn, utan återställning | 10000 | 2,46 s | 43,499 % | Nej |
| 4p turn, utan återställning | 1000 | 1,88 s | 70,976 % | Nej |
| 5p turn, utan återställning | 1000 | 2,15 s | 56,917 % | Nej |
| 6p turn, utan återställning | 1000 | 3,80 s | 146,780 % | Nej |
| 3p turn, tiofaldig budget | 100000 | 7,02 s | 21,383 % | Nej |
| 3p turn, stack 16000 / SPR 4 | 10000 | 2,23 s | 8,491 % | Nej |

Även tidigare misslyckanden finns kvar i JSON-underlaget: tre riverprov med
återställning och ett sexspelar-turnprov med kvot 100. Den aktuella
regret-matching-strategin från **samma fjorton arkiv** kontrollerades också;
ingen av dem klarade 2 %. Byte från medelstrategi löser alltså inte problemet.
Fler iterationer eller lägre stackdjup gav bättre utfall i dessa enskilda
turnprov, men inget isolerat, upprepat konvergens- eller kausalitetsbevis.

## Exportsemantik och observerade fel

* FREE10114 laddar barnen i omvänd ordning mot den serialiserade trädfilen.
  Decodern återskapar runtimeordningen och dess enbaserade DFS-node-ID.
  Annars kan Check och All-in byta plats. Roten och riverfortsättningen
  efter tre checkar har jämförts med den uppdaterade Monker-vyn.
* Handindex är kanoniska kortnycklar, inte position i listan över 1326 händer.
  Den versionsbundna läsaren använder leverantörens rena kort-/statetransformer
  för exakt samma bucketmappning på aktuell gata och riverutfall.
* `avg` är ackumulerade medelstrategivikter. `cf` har separata grupper per
  spelare/gata och block med antal handlingar + två EV-platser. Aktuell
  strategi normaliserar positiva regrets; negativa värden får ingen massa.
  Icke-finita värden/okända layouter avvisas. Låsta strategier är inte kvalificerade.
* EV i Monker-vyn är samplade träningsvärden: `(actionSlot + baseline) /
  sampleWeight`. De är inte exakt EV för den exporterade medelstrategin.
  Auditens `rootActions` beräknas separat under den exporterade profilen.
* ”Reset avg after 0” betyder inte avstängd återställning. En återställning
  kan inträffa efter start. Proven utan återställning använde 1000000000,
  större än respektive körnings kvot. Detta härleddes ur den låsta binären.
* GUI-tabellen kan vara gammal efter batchstopp. Grenval och Back uppdaterar
  den. Den första skärmbilden efter stopp är inte i sig exportbevis.
* Ett första turnförsök gav ingen export efter navigering i en äldre modell;
  felorsaken fångades inte. Ett senare byte från river till turn fångades:
  `ArrayIndexOutOfBoundsException: Index 4 out of bounds for length 4`, i
  `c.A.run`. Ny process slutförde samma fyrspelarturnprov. Det visar ett
  konkret tillståndsfel i batchflödet; binären har inte modifierats.
* Trädhash ensam räcker inte som modellidentitet. Rangerna sparas separat i
  `rng0...`; samma trädhash kan avse helt olika ranger.

Avkodning tog ungefär 0,26–0,35 s i flera små prov, exklusive JVM-start.
Auditens payoffcache minskade den varma sexspelar-turnkontrollen från cirka
720 ms till 546–575 ms, med samma EV/bästa svar inom 1e-8. Det är cirka
20–24 % kortare **kontrolltid**, ingen uppmätt tidsvinst i Monkers träning.

## Reproducera och fortsätt

Källor: `scripts/monker-audit/MonkerPolicyExport.java`, `policy-audit.mjs`,
`audit-file.mjs`, `crosscheck-river.mjs`, `crosscheck-turn.mjs` och deras test.
Råa syntetiska MKR-filer, normaliserade modeller, samtliga kvalitetsrapporter,
indata och positiva/negativa tester finns under
`docs/evidence/monker-policy-audit/`.
Sammanställning: `docs/evidence/monker-policy-audit-2026-11-06.json`.
Leverantörens körbara program ingår inte i paketet.

Med PowerShell 7, Java 17 och den officiella låsta binären:

```powershell
$vendor = 'C:\sokvag\MonkerSolverFree.exe'
$classes = 'work/monker-audit-classes'
javac -cp $vendor -d $classes scripts/monker-audit/MonkerPolicyExport.java
$archive = 'docs/evidence/monker-policy-audit/exports/audit3river10000nrKs7d2c8h9s200000.mkr'
java '-Djava.awt.headless=true' -cp "$classes;$vendor" c.MonkerPolicyExport $archive $vendor |
  Set-Content -Encoding utf8 work/monker-decoded.json
node scripts/monker-audit/audit-file.mjs work/monker-decoded.json work/monker-quality.json average
node scripts/monker-audit/audit-file.mjs work/monker-decoded.json work/monker-current.json current-regret-matching
node scripts/monker-audit/crosscheck-river.mjs tests/fixtures/monker-3p-river-10114.json
node scripts/monker-audit/crosscheck-turn.mjs docs/evidence/monker-policy-audit/decoded/audit3turn10000nrRetryKs7d2c8h200000.json docs/evidence/monker-policy-audit/turn-br-certificate.json
npm test -- --maxWorkers=1 --reporter=dot
npm run build
```

Audit CLI skriver `accepted:false` vid ett beräknat avslag. Exit 2 betyder
att kvaliteten inte kunde beräknas, exempelvis vid överskriden budget.
Standardgränsen 4096 gemensamma privata givningar stoppar breda multiwayranger
innan uppräkning. Att höja gränsen godtyckligt ger inte några sekunders drift.

Det dyraste obekräftade antagandet är fortfarande att realistiska multiwayranger
och användbara betstorlekar kan lösas **och kvalitetskontrolleras** inom några
sekunder på denna dator. De små positiva riverfallen verifierar inte detta.
Före en appanslutning behövs kvalificerade representativa modeller, skalbar
felkontroll, stabil jobbstyrning samt bindning till hela modellidentiteten
(ranger, board, positioner, stackar, rake, träd, strategi och handhistorik).
En förberäknad källa får bara användas vid en verifierad matchning.

Monkers [guide](https://www.monkerware.com/guide.html) beskriver iterationskvot
som en riktlinje när strategin börjar bli rimlig, inte som en 2 %-garanti.
Ingen ny egen träningsalgoritm, betald källa eller reserv med gissade råd har införts.

## Kodverifiering

Åtta Monker-regressioner passerar. Full seriell körning: **370 passerade,
13 överhoppade, 31 passerade testfiler och 4 överhoppade**.
Den tidigare parallella körningen hade två fel som ska finnas kvar i historiken:
`decision-mccfr` saknade traversal inom sin tidsbudget och `postflop-wasm`
överskred fem sekunders timeout i river-chanskontrollen. Båda passerade i
den separata seriella 77-testskörningen och i den fulla seriella körningen.
Detta är kodverifiering, inte ett godkänt Monker-livebeslut.

Slutligt `npm run build` och `git diff --check` passerade. Binärhashen verifierades igen efter proven. Det inledande handskrivna avvikelseförsöket förlorade EV och används inte som avslag; även det resultatet är sparat som `failed-handcoded-deviation.json`.
