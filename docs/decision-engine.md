# Beslutsmotorn 1.3 — funktion och kvalitet

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
- External-sampling MCCFR, anpassad från OpenSpiel med Apache-2.0-notis.
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

## Observerad kvalitetsbrist

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

Algoritmdokumentation:
[OpenSpiel external sampling](https://github.com/google-deepmind/open_spiel/blob/master/open_spiel/python/algorithms/external_sampling_mccfr.py),
[Postflop ranges](https://b-inary.github.io/postflop_solver/postflop_solver/struct.Range.html),
[officiellt TDA-exempel om kort öppnings-all-in](https://www.pokertda.com/forum/index.php?topic=736.0).
