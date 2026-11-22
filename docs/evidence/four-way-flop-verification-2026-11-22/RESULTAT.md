# Oberoende omprov av den sparade fyrvägsfloppen

**22 november 2026 · Codex · Windows**

Samma sparade profil för `Qh 8d 6h` med fyra aktiva efter check → bet 60 → raise till 180. Alla kvarvarande hålkortskombinationer är likaviktade vid roten. Potten är 360 marker. Trädet har 404 noder, halvpottsstorlekar, högst två fulla höjningar och all-in. Omprovet öppnade det versionshanterade arkivet i en ny katalog. Profilens manifest har SHA-256 `4477d5e2972f1e931089cae72a5a432c362217dacdae6dc7b42e4505538d66c4`. [Tidigare prov, modell och profilarkiv](../chance-sampled-four-to-six-2026-11-22/RESULTAT.md)

## Oberoende övre gräns

Den sparade profilen klarade kravet under 2,1 % för alla fyra. Gränserna anges som procent av rotpotten och är avrundade uppåt.

| Säte | Roll i den återspelade linjen | Övre gräns | Rådata |
|---:|---|---:|---|
| 0 | Checkade | 2,08548 % | [Omräknat tidigare prov](archived-seats-adjusted.json) |
| 1 | Satsade | 1,86720 % | [20 dolda givar per kortpar och bräda](card-grid-seat-1.json) |
| 2 | Höjde | 2,09720 % | [12 dolda givar per kortpar och bräda](card-grid-seat-2.json) |
| 3 | Agerar vid roten | 1,70790 % | [Omräknat tidigare prov](archived-seats-adjusted.json) |

Den nya verifieraren håller den avvikande spelarens exakta hålkort fasta. Den räknar alla 1 176 hålkortspar och alla 2 162 ordnade turn- och riverpar per hålkortspar. Den samplar motståndarnas kompatibla hålkort separat för varje bräda. Endast den avvikande spelaren får optimera sin strategi. Besluten delar information enligt den synliga brädan på varje gata. Träningens handutvärderare byts mot den separata sju-kortsutvärderaren i kontrollen.

Verifieraren besöker en gren i taget och använder sannolikheten att motståndarna följer handlingarna på vägen till noden. Den räknar den frysta profilens värde separat. När ett beslut ska optimeras summerar den först varje handlings viktade värde per informationsmängd och väljer sedan den bästa handlingen i den mängden. Kalibreringsprov jämför den med den tidigare verifieraren för samtliga säten på flop, turn och river, inklusive handlingar med noll sannolikhet. Den nya minneslayouten ändrar vilken beräkningsordning som används.

Höjarens kontroll upprepades från den nyuppackade profilen med samma slumptalsström och den slutliga minneslayouten. Den övre gränsen blev 2,09719029614 %. Skillnaden från första körningen var mindre än 0,00000000003 procentenheter. Upprepningen kontrollerar reproducerbarhet. [Upprepningens rårapport](card-grid-seat-2-replay.json)

Den optimistiska stickprovslösningen är en övre gräns i väntevärde. Med heltäckande kort- och brädstratifiering ändras optimum för det parade utfallet med högst `2 × 1 560 / N` marker när en dold giv byts ut. Marginalen är `1 560 × sqrt(2 × log(24 / 0,05) / N)` marker. Uppräkning med felrisk `0,05 / 24` per kontroll täcker tidigare och nya prov under en gemensam felbudget. Sätena som checkade och som agerade direkt efter höjaren räknas om från tidigare oberoende rådata med samma felbudget. [McDiarmid, On the method of bounded differences](https://doi.org/10.1017/CBO9781107359949.008) · [Omräknade rågränser](archived-seats-adjusted.json)

## Windows

Den uppackade profilen gav första kompletta bildrutan efter 430,11 ms. Fem varma uppslag inklusive bildruta tog 30,91–46,12 ms. Ett separat forskningsfönster i Electron 45.1.0 kontrollerade samtliga handlingar i den renderade handraden mot den sparade träningsrapporten. Mätningen gäller från begäran i ett redan laddat fönster. Ordinarie efteranalys behöver fortfarande matcha spelmodell, historik och ranger. [Windowsrapport](windows-timing.json) · [Bildruta](windows-frame.png)

## Kör om i PowerShell

```powershell
$base='docs/evidence/four-way-flop-verification-2026-11-22'
$profile='artifacts/four-way-flop-archive-verification-2026-11-22'
Expand-Archive -LiteralPath 'docs/evidence/chance-sampled-four-to-six-2026-11-22/4-flop/profile.zip' -DestinationPath $profile
$env:POKER_RAISED_POSTFLOP_PROBE='1'
$env:POKER_RAISED_POSTFLOP_PLAYERS='4'
$env:POKER_RAISED_POSTFLOP_STREET='flop'
$env:POKER_RAISED_POSTFLOP_PROFILE=$profile
$env:POKER_RAISED_POSTFLOP_OFFLINE='tight-card-grid'
$env:POKER_RAISED_POSTFLOP_AUDIT_ENGINE='compact'
$env:POKER_RAISED_POSTFLOP_AUDIT_FAMILY='24'
$env:POKER_RAISED_POSTFLOP_TIMEOUT_MS='3600000'
foreach ($check in @(@{Seat=1;Draws=20},@{Seat=2;Draws=12})) {
  $env:POKER_RAISED_POSTFLOP_AUDIT_SEAT=[string]$check.Seat
  $env:POKER_RAISED_POSTFLOP_GRID_DRAWS=[string]$check.Draws
  $env:POKER_RAISED_POSTFLOP_OUTPUT="$base/card-grid-seat-$($check.Seat).json"
  npm.cmd test -- tests/decision-raised-postflop-probe.test.ts
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```

Windows-fönstret körs enligt [trevägsprovet](../chance-sampled-three-way-flop-2026-11-22/RESULTAT.md#windows), med den uppackade fyrvägsprofilen och dess tidigare `training.json`. För de återanvända råfilerna sätts `N = batchCount × batchSize` och den nya marginalen läggs till `estimatePct` efter omräkning till procent av 360 marker.
