# Beslutsmotorn 1.4 — funktion och kvalitet

Automatisk beslutsberäkning fungerar tekniskt på alla fyra gatorna för 2–10
spelare. Den generella strategin är **experimentell och underkänd för
tillförlitliga spelråd**. Målet är fortsatt öppet.

## Genomfört

- Separat beslutslager ovanpå befintliga snapshots; ingen ändrad avläsning eller
  kortigenkänning.
- Bettingmotor med heltalsmarker, turordning, minimum, korta all-in,
  återöppning, sidopotter, split och återbetalning av osynade marker.
- Gemensam sampling av privata ranger och framtida kort utan informationsläckage.
  Tomma ranger betyder uniforma lagliga kombinationer. De är modellantaganden;
  tidigare handlingar uppdaterar ännu inte ranger med strategilikelihood.
- Outcome-sampling MCCFR, anpassad från OpenSpiel med Apache-2.0-notis.
  Frekvenser räknas numeriskt; de kommer inte från en språkmodell.
- Separat worker, tids- och minnesgränser, avbrott och identitetskontroll för
  hand, kort, insatser, positioner, synliga handlingar och rangerevision.
- Exakt HU-turn-/riverprovider får ersätta experimentresultatet först efter uppmätt
  exploaterbarhet och kontroll av samtliga vägar i trädet mot bettingreglerna.
  Verifieringen gäller valt träd och antagna ranger/blinds, utan rake. Alla
  obligatoriska check/fold/call-handlingar måste finnas genom hela trädet.
- Experimentella råd kräver ett aktivt val och märks tydligt i huvudvyn.

## Verifierat

Domäntester täcker 2–10 spelare på samtliga gator. Native-testet använder den
riktiga Electron-appen, autentiserad lokal brygga och faktiska paketerade workers.
Det prövar 2, 3, 6 och 10 spelare på alla fyra gatorna, belopp/frekvenser,
standardspärren, riktig WASM-uppgradering och borttagning av gamla råd vid
ändrad tur, ogiltig eller inaktuell snapshot. Inga pokerhandlingar på en verklig
sajt utförs.

Små oberoende riverfall testar att MCCFR återger en känd bluffblandning. Det
validerar algoritmens begränsade testspel, inte breda preflop-/multiway-resultat.

## Observerad kvalitetsbrist i 1.3

I en 100 bb preflopmodell med fulla ranger ger motorn systematiskt extrema
all-in-frekvenser med AKo. Motståndarnas olika privata händer och framtida
brädor får för få upprepade träningar. När informationsmängdstabellen eller
traverseringsbudgeten tar slut används passiv check/call-fortsättning. Roten
kan därmed optimera mot ofärdiga eller konstgjorda motståndarsvar. Fler
rotbesök eller normaliserade frekvenser bevisar inte strategikvalitet.

Reproducerbart underlag: [decision-quality.json](evidence/decision-quality.json).
Kör separat i PowerShell:

```powershell
$env:POKER_QUALITY_PROBE='1'
npx vitest run tests/decision-quality.test.ts --pool=threads --maxWorkers=1
Remove-Item Env:POKER_QUALITY_PROBE
```

Proben är en diagnostik och påstår inte att ett externt optimalt facit finns
för hela dessa fixtureträd. Den rapporterar bristen och ger ingen GTO-certifiering.

## Kvar för att uppfylla målet

Den generella providern behöver en validerad strategi-/fortsättningsmodell,
exempelvis offline tränade kort-/brädabstraktioner med oberoende best-response-
kontroller eller riktiga förberäknade strategier som matchar spelvarianten.
Observerade handlingar måste villkora ranger över hela handen. Okänd tidigare
sidopott och blind måste förbli synliga antaganden tills de kan verifieras.
Nuvarande experimentmotor är inte ett godkänt substitut för detta.

En efterföljande [källgranskning](strategy-source-audit.md) skiljer faktiska
solverartefakter från snäv täckning, osäker proveniens och rena databasplaner.

## Efterföljande experiment: exakta färgsymmetrier

Version 1.3.1 grupperar privata/publika kort under samtidiga färgbyten som
bevarar varje spelares viktade range och det redan synliga rotbrädet. Detta är
en exakt spelisomorfi, utan rank- eller styrkebucketing. Prefloptestet återfår
de 169 kända klasserna av 1326 kombinationer. Importance sampling överviktar
hela ekvivalensklassen för rotbeslutet och korrigerar för den gemensamma
kortfördelningens förslagsfördelning. Även mycket små positiva rangevikter
bevarar exakt support; de jämställs aldrig med frånvarande kombinationer.

Den upprepade [diagnostiken](evidence/decision-quality-isomorphic.json) visar
fortfarande extrema AKo-frekvenser och full informationsmängdstabell. Ändringen
har alltså inte löst strategikvaliteten. Experimentspärren gäller fortsatt.

## Kompletta outcome-episoder i 1.3.1

Den generella standardmotorn samplar nu en fullständig terminal hand per
spelaruppdatering enligt OpenSpiels outcome-sampling-estimator. Uppdateraren
utforskar även handlingar med noll aktuell policyvikt. Motståndarna följer sina
träningspolicyer; deras privata kort eller framtida bräden läcker inte in i
informationsmängdsnyckeln. Chance-importance appliceras en gång i regret- och
medelstrategiuppdateringarna.

Varje påbörjad cykel uppdaterar samtliga spelare färdigt. Tiden kontrolleras
före nästa cykel, och minne reserveras för dess konservativa maximala antal
nya informationsmängder: `n * (4*n*(maxRaises+2)+1)`. För små manuella
nod-/djupgränser avvisas före träningen. Motorn ersätter alltså inga återstående
beslut med en passiv policy. Den tidigare externa samplingen finns bara som
uttryckligt val för regressioner och jämförande diagnostik.

Tester återger den oberoende kända riverbluffblandningen 1/2 och den viktade
varianten 1/8 över tre frön. De prövar även alla gator med 2, 3, 6 och 10 spelare,
hela uppdateringscykler och avvisning av otillräckliga gränser. Stora ändliga
regretvikter normaliseras utan summans overflow; icke-ändliga deltal,
ackumulatorer eller slutresultat avvisas.

[Outcome-diagnostiken](evidence/decision-quality-outcome.json) har noll passiva
avskärningar men fortfarande instabila fullrangestrategier och otillräcklig
informationsmängdstäckning. Det gör inte versionen kvalitetsgodkänd. Både
generella rekommendationer och EV-estimat är fortsatt experimentella.

## Exakt turn och fungerande automatiska ranger i 1.4

Konfigurationskontrollen avvisade tidigare `o` i offsuit-notation som `AKo`.
Det stoppade den automatiska fullrangen innan den exakta solvern kunde köras.
Felet är reproducerat och rättat. Fullrangen ger 1326 kombinationer före
blockering och 1128 per spelare på det testade turnbrädet.

En uttrycklig postflopväg stöder nu HU-turn genom alla riverutfall. Den behåller
64 MiB-gränsen för solverlagring/chancemappar och tillåter högst 5000 publika
noder; det gamla riverträningslägets 250-nodsgrind är oförändrad. TOML-brädet
måste stämma med konfigurationen före preflight. Flop avvisas före trädbygget.
Endast det aktuella beslutets handstrategier exporteras till livevyn. Alla
publika noder exporteras för regelkontrollen. Full strategiexport är begränsad
till små oberoende kontrollfall.

Turn använder normalt 50 % pott samt all-in och högst en raise per gata.
Ett observerat första bet får sin verkliga procentstorlek i trädet. OOP/IP,
checklinje och första bet/all-in stöds; redan höjda linjer med båda spelarnas
insatser kvar godkänns inte som verifierade. Solvern har 300 iterationer och
25 sekunders workergräns. Råd kräver högst 0,2 % uppmätt fel samt lagliga
belopp, obligatoriska passiva handlingar, unika handlingar, alla 48 publika
riverkort, fullständig potthantering och matchning av aktuella turknappar.

`npm run verify:turn` jämför ett riktigt 3819-nodsträd med en separat
JavaScript-handvärderare och informationskorrekt best-response-traversering.
Chance väger `1/(52 - antal bordskort - 4)` per kompatibelt privat kortpar;
blockerade riverkort får noll massa. Den oberoende bästa motstrategin får
inte se motståndarens kort. Resultatet matchar WASM inom 0,0001 marker.
[Evidens](evidence/turn-solver-verification.json) skiljer detta lilla oberoende
kontrollfall från det större fullrangefallets solverrapporterade felmått.

Native-testet visar också verifierat turn-råd med automatiska fulla ranger och
experimentläget avstängt. Sena exakta svar efter en ny hand avvisas; ett
ofärdigt exakt svar behåller beräkningsindikeringen även när MCCFR är färdig
eller misslyckas. Ingen av dessa förbättringar löser den kvarvarande generella
preflop-, flop- eller multiway-strategikvaliteten.

Algoritmdokumentation:
[OpenSpiel external sampling](https://github.com/google-deepmind/open_spiel/blob/master/open_spiel/python/algorithms/external_sampling_mccfr.py),
[OpenSpiel outcome sampling](https://github.com/google-deepmind/open_spiel/blob/master/open_spiel/python/algorithms/outcome_sampling_mccfr.py),
[Postflop ranges](https://b-inary.github.io/postflop_solver/postflop_solver/struct.Range.html),
[officiellt TDA-exempel om kort öppnings-all-in](https://www.pokertda.com/forum/index.php?topic=736.0).

## Fortsatt kvalitetsarbete 2026-11-02 — inte en ny godkänd liveversion

En valfri `baseline: "learned"` använder kontrollvariater i outcome-samplingen,
med separata skattningar för varje uppdaterad spelare. Baseline läses före
handlingsdragningen och uppdateras efteråt. Endast nästa baseline-mål begränsas
till fysiska utbetalningar; nyttor och regret klipps inte. Standardvalet är
fortfarande `none`. Metoden bygger på
[Schmid m.fl.](https://arxiv.org/abs/1809.03057) och
[OpenSpiels implementation](https://github.com/google-deepmind/open_spiel/blob/master/open_spiel/python/algorithms/outcome_sampling_mccfr.py),
men den lokala inlärningsregeln garanterar ingen variansminskning.

En separat kontroll kan nu fråga den färdiga medelstrategin med endast den
agerande spelarens kort och publik historik. En oberoende river-orakelmodell
bygger sitt eget check/all-in-spel, räknar alla kompatibla privata givningar
och väljer bästa motstrategi efter att dolda givningar aggregerats. Den
använder varken produktionsmotorns betting-, payoff- eller CFR-kod.
Kalibreringar täcker känd jämvikt, dold information och udda marker per pott,
enligt modellens separata pottfördelning och
[TDA:s regler för delade potter](https://www.pokertda.com/view-poker-tda-rules/).

Den [uppmätta diagnostiken](evidence/multiway-policy-quality-2026-11-02.json)
med frö 395 gav följande **summa förbättringar vid ensidig avvikelse**, uttryckt
i procent av startpotten. Det är NashConv, inte samma mått som HU-solverns
exploaterbarhet. Spelet har små uttryckliga ranger och endast check/all-in;
resultaten gäller inte generellt no-limit hold'em.

| Spelare | Utan baseline | Inlärd baseline |
| --- | ---: | ---: |
| 3 | 4,43 % | 2,69 % |
| 6 | 4,55 % | 4,44 % |
| 10 | 21,40 % | 9,33 % |

Tre och sex spelare tränade 10 000 cykler. Tiomannafallen stoppades efter
4 sekunder med olika antal cykler; jämförelsen är därför ingen kontrollerad
konvergensstudie. Tusentals frågor till tiomannastrategin saknade tränade
medelfrekvenser. Kvalitetsgrinden är fortsatt stängd. Ingen uppdaterad
portable-app eller bred GTO-certifiering har levererats med detta experiment.

Reproducera separat utan annan belastning:

```powershell
$env:POKER_MULTIWAY_PROBE='1'
npx vitest run tests/decision-multiway-quality.test.ts --maxWorkers=1
Remove-Item Env:POKER_MULTIWAY_PROBE
```

## Återanvändning av publika spelträd 2026-11-02

CPU-profilering visade att upprepad serialisering av samma offentliga tillstånd,
regelkontroll och kopiering av bettingtillstånd tog en stor del av beräkningen.
Outcome-motorn återanvänder nu lagliga handlingar och övergångar för varje
komplett publik handlingshistorik. Privata kort och synliga bordskort har egna
exakta nycklar vid varje publik nod. Varken olika historiker eller händer
slås ihop till en grövre approximation. Referensvägen kan väljas med
`publicTreeCache: false`; extern sampling använder den gamla vägen.

Minnesbudgeten omfattar både informationsmängder och publika noder, inklusive
terminaler. Utrymme för hela nästa uppdateringscykel reserveras innan en giv
dras. Gränsen är högst två publika noder per tillåten informationsmängd, alltså
100 000 publika noder vid standardinställningen. Policyauditen jämför alla
publika fält innan en cachad historik återanvänds.

16 jämförelser över alla gator och 2, 3, 6 och 10 spelare ger identiska
frekvenser, EV-estimat, rotbesök och antal informationsmängder vid samma frö
och cykelantal. En separat jämförelse av hela den viktade trepersonerspolicyn
med inlärd baseline ger också identiskt oberoende best-response-resultat.

[Prestandaproben](evidence/public-tree-performance-2026-11-02.json) kör samma
2 000 cykler, först efter uppvärmning och sedan i omvänd ordning. Observerade
tider för referensvägen respektive cachen:

| Spelare | Referens, två körningar | Cache, två körningar |
| --- | ---: | ---: |
| 3 | 211 / 169 ms | 101 / 77 ms |
| 6 | 816 / 713 ms | 254 / 260 ms |
| 10 | 2 293 / 2 187 ms | 664 / 685 ms |

Fler cykler inom fyra sekunder gav lägre uppmätt NashConv i de små spelen:
0,85 %, 1,91 % och 6,92 % för 3, 6 respektive 10 spelare utan baseline.
[Cache-körningen](evidence/multiway-public-cache-quality-2026-11-02.json) och
[referenskörningen](evidence/multiway-public-cache-reference-2026-11-02.json)
redovisar exakt cykelantal och tidsbudget. Väggtidskörningarna är känsliga för
annan datorbelastning och bevisar ingen generell konvergens eller GTO-täckning.

Den [nya fullrange-diagnostiken](evidence/decision-quality-public-cache.json)
visar nästa konkreta begränsning: alla åtta fallen stannar vid modellens
50 000 informationsmängder. Tiomannafallen slutför bara 365–401 cykler, med
191–213 rotbesök, trots att tidsbudgeten inte tagit slut. Återanvändningen löser
alltså tidsförlusten men inte bristen på tränad strategi över det stora spelet.
Grinden för experimentella råd är oförändrad och den breda livefunktionen är
fortfarande inte godkänd.

Efter ändringen passerar 302 vanliga tester; tre diagnostiktester är opt-in
och har körts separat. TypeScript och produktionsbygget passerar. Det
[nya native-testet](evidence/decision-native-public-cache-smoke.json) kör den
byggda Electron-appen med syntetiska snapshots i en separat profil: alla
16 kombinationer av gata och 2/3/6/10 spelare passerar, grinden behålls,
verifierad HU-turn/river fungerar och gamla råd försvinner vid ändrad tur,
ogiltig eller inaktuell snapshot. Detta är funktionstest, inte en kontroll
av den generella strategins kvalitet. Ingen ny portable-version har paketerats.

Kör prestandaproben separat:

```powershell
$env:POKER_PUBLIC_CACHE_PERF='1'
npx vitest run tests/decision-multiway-quality.test.ts --maxWorkers=1
Remove-Item Env:POKER_PUBLIC_CACHE_PERF
```
