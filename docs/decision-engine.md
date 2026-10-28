# Beslutsmotorn 1.3.1 — funktion och kvalitet

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
- Exakt HU-riverprovider får ersätta experimentresultatet först efter uppmätt
  exploaterbarhet och kontroll av samtliga vägar i trädet mot bettingreglerna.
  Verifieringen gäller valt träd och antagna ranger/blinds, utan rake.
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

Algoritmdokumentation:
[OpenSpiel external sampling](https://github.com/google-deepmind/open_spiel/blob/master/open_spiel/python/algorithms/external_sampling_mccfr.py),
[OpenSpiel outcome sampling](https://github.com/google-deepmind/open_spiel/blob/master/open_spiel/python/algorithms/outcome_sampling_mccfr.py),
[Postflop ranges](https://b-inary.github.io/postflop_solver/postflop_solver/struct.Range.html),
[officiellt TDA-exempel om kort öppnings-all-in](https://www.pokertda.com/forum/index.php?topic=736.0).
