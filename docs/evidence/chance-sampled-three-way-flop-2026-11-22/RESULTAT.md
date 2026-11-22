# Trevägsflop med träning över hela satsningsträdet

**22 november 2026 · Codex · Windows**

Samma spelmodell som i förra provet. Floppen är `Qh 8d 6h` efter check, bet 60 och raise till 180 med en pott på 360 marker. Alla tre ranger är likaviktade vid roten. Modellen har 104 noder, 50 beslutspunkter, inga avgifter och samma meny för satsningar, höjningar och all-in som det förra provet. Modellens hash matchar den tidigare profilen. [Föregående omprov och spelmodell](../frozen-three-way-flop-audit-2026-11-22/RESULTAT.md)

## Träning och oberoende kontroll

Träningen samplar en komplett giv åt gången och räknar igenom varje bettinggren för den given. Varje spelare uppdateras mot samma strategi före uppdateringen. Träningen använder exakta hålkort på flop. På turn och river använder den 24 grupper för relativ handstyrka på den synliga brädan. På turn skiljer den också ut lägen där exakt fyra av de sex tillgängliga korten har samma färg. Sex miljoner givar tog 59,75 s offline och gav 13 199 tränade rader, inklusive samtliga 1 176 hålkort vid roten. [Träningsrapport](training.json) · [Arkiv](profile.zip) · [CFR och stickprovsmetoder, Lanctot m.fl.](https://papers.nips.cc/paper_files/paper/2009/hash/00411460f7c92d2124a67ea0f4cb5f85-Abstract.html)

Den första oberoende övre kontrollen gav 7,39 %, 11,54 % och 5,76 % av potten. En separat uppsättning lagliga motstrategier som valdes med 120 000 träningsgivar och prövades på 240 000 färska givar visade ingen positiv förbättring. Det senare provet täcker de prövade motstrategierna. [Övre gränser före stratifiering](larger-upper.json) · [Lagliga motstrategier på nya givar](continuation-response.json)

Den snävare kontrollen håller det avvikande sätets hålkort fasta i varje stickprovsgrupp. Den går igenom alla 2 162 ordnade turn- och riverpar som återstår för de korten. Gruppens antal givar per bräda är lika för varje sådant kortpar. För varje bräda dras motståndarnas kort ur de kompatibla korten. Avvikaren kan använda sina exakta hålkort och hela den synliga brädan i varje beslut. Profilens gruppering av handstyrka begränsar därför bara spelarna som följer den frysta strategin. Showdown kontrolleras med den separata sju-kortsutvärderaren.

Varje grupp optimeras för den avvikande spelaren. Alla fasta lagliga motstrategier är tillåtna i optimeringen. Det bästa resultatet per grupp har därmed ett väntevärde som är minst den verkliga bästa ensidiga förbättringen. Stickprovsgrupperna dras separat från träningen. Den ensidiga övre gränsen inverterar ett test för väntevärdet av begränsade vinster. Rårapporterna använder `0,05 / 3` felrisk per säte. Slutbedömningen nedan tar höjd för att flera prov kördes. [Metod för ensidig gräns, Waudby-Smith och Ramdas](https://academic.oup.com/jrsssb/article/86/1/1/7043257)

| Säte | Föregående sparade profil | Ny gräns med fyra givar per bräda |
|---|---:|---:|
| 0, hjälten som checkade | 12,81 % | **1,61 %** |
| 1, spelaren som satsade | 15,88 % | 4,29 % |
| 2, spelaren som höjde | 15,55 % | **1,37 %** |

[Säte 0](stratified-seat-0.json) · [Säte 1](stratified-seat-1.json) · [Säte 2](stratified-seat-2.json) · [Uppslag och kontroll mot den optimerade läsaren](lookup.json)

### Fördjupning för sätet som satsade

Motstrategin fick använda det synliga turnkortets valör och färg samt riverbrädans par och färgstruktur. Floppens beslut låg fast. Den anpassades på 220 000 givar och skattades därefter till −0,08 % på 240 000 färska givar. Den undre gränsen för bästa möjliga förbättring blev 0 %. [Motstrategi med detaljer om senare brädor](continuation-texture-seat-1.json)

En andra övre metod räknar alla 1 176 egna hålkortskombinationer med lika vikt och alla kompatibla ordnade framtida brädor för varje kombination. Därmed kommer stickprovsvariationen enbart från motståndarnas kort. Om en av `N` oberoende samplade givar byts ut, ändras det uppskattade resultatet för en fast motstrategi med högst `2 × 1 200 / N` marker. Samma gräns gäller när vi väljer den bästa lagliga motstrategin i stickprovet. Det ger marginalen `1 200 × sqrt(2 × log(1/α) / N)` över den optimistiska skattningen med McDiarmids olikhet. [McDiarmid, On the method of bounded differences](https://doi.org/10.1017/CBO9781107359949.008)

Med 32 dragningar per eget hålkortspar och offentlig bräda kontrollerades 81 360 384 givar. Den optimistiska skattningen för sätet som satsade blev 0,4934 % och den statistiska marginalen 0,1058 procentenheter. Den oberoende övre gränsen blev **0,5992 %**. [Slutligt kortprov, säte 1](card-grid-seat-1.json)

En tidigare kontroll med 24 givar per bräda gav 1,3736 % för samma säte. Den körningens 32-bitarsräknare passerade sin periodgräns och återanvände en del av träningens slumptalsström. Den räknas därför bara som diagnos. Mot träningens första cirka 48 miljoner värden började de slutliga proven för säte 0, 1 och 2 vid cirka 2 906, 3 865 respektive 2 959 miljoner. Ingen av de slutliga kontrollerna överlappade träningens ström. Senare gator använder AES-256-CTR med separat nyckel för träning och varje verifieringssäte. [Tidigare djupkontroll](stratified-seat-1-deep.json)

**Floppens slutliga övre gränser är 1,967 %, 0,624 % och 1,731 %** efter avrundning uppåt. De inkluderar en Bonferroni-justering med felrisk `0,05 / 24` per prov så att valet bland flera körningar ryms inom den gemensamma felbudgeten. Kortprovet räknas om med den nya marginalen. För de andra sätena är logkapitalets lutning minst `2048 × β / (1 + β × 0,021 × 360)` upp till kvalitetsgränsen, där `β = 0,95 / 1200`. För att höja logkapitalets tröskel med `log(8)` räcker därför högst 0,3584 extra procentenheter så länge resultatet håller sig under 2,1 %.

Alla tre klarar 2,1 % av potten, med minst 95 % samtidig konfidens i stickprovsmodellen. Gränsen mäter värdet av spelarens bästa ensidiga avvikelse vid roten mot de övriga sätenas låsta strategier. Den gäller regelmenyn, pottstorleken, stackarna och rangerna i det här provet. [Beräkning av slutliga gränser](family-adjusted-upper.json)

## Windows

I ett separat forskningsfönster med Electron 45.1.0 tog ett första uppslag inklusive bildruta 168,74 ms. Fem varma uppslag inklusive bildruta tog 33,78–50,60 ms. Alla tre handlingar visades i den fångade bildrutan. En tidig mätning hade höjd för två handlingar. Den slutliga körningen krävde att hela handraden låg inom bildytan. Mätningen startade vid första begäran i ett laddat fönster och omfattar filuppslag, rendering och bildfångst. Den ordinarie mottagarens väg från handbyte till appens visning återstår för en kvalificerad profil. [Windowsrapport](windows-timing.json) · [Bildruta](windows-frame.png) · [Electron 45.1.0](https://github.com/electron/electron/blob/v45.1.0/docs/api/web-contents.md)

## Kör om proven i PowerShell

Profilarkivets SHA-256 är `e573cebf5b21b4d197f4bd2df9aa0796129c3830124fbafe38780a2004e788ed`. Den uppackade profilens manifest har SHA-256 `48bd40329b7d854829373d302edf2ae870f9436823c035481cc1dad4ca778d3c`.

```powershell
$evidence='docs/evidence/chance-sampled-three-way-flop-2026-11-22'
$original='artifacts/chance-sampled-three-way-flop-2026-11-22'
$extracted='artifacts/chance-sampled-flop-archive-check-2026-11-22'
$env:POKER_RAISED_POSTFLOP_PROBE='1'
$env:POKER_RAISED_POSTFLOP_STREET='flop'
$env:POKER_RAISED_POSTFLOP_PROFILE=$original
$env:POKER_RAISED_POSTFLOP_TRAIN_DEALS='6000000'
foreach ($probe in @(@{Mode='train-chance';File='training'},@{Mode='response';File='continuation-response'},@{Mode='tight-large';File='larger-upper'})) {
  $env:POKER_RAISED_POSTFLOP_OFFLINE=$probe.Mode
  $env:POKER_RAISED_POSTFLOP_OUTPUT="$evidence/$($probe.File).json"
  npm.cmd test -- tests/decision-raised-postflop-probe.test.ts
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
$env:POKER_RAISED_POSTFLOP_AUDIT_RANDOM='legacy'
$env:POKER_RAISED_POSTFLOP_OFFLINE='tight-stratified'
foreach ($seat in 0,1,2) {
  $env:POKER_RAISED_POSTFLOP_AUDIT_SEAT=[string]$seat
  $env:POKER_RAISED_POSTFLOP_OUTPUT="$evidence/stratified-seat-$seat.json"
  npm.cmd test -- tests/decision-raised-postflop-probe.test.ts
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
Expand-Archive -LiteralPath "$evidence/profile.zip" -DestinationPath $extracted
$env:POKER_RAISED_POSTFLOP_PROFILE=$extracted
$env:POKER_RAISED_POSTFLOP_OFFLINE='lookup'
$env:POKER_RAISED_POSTFLOP_OUTPUT="$evidence/lookup.json"
npm.cmd test -- tests/decision-raised-postflop-probe.test.ts

$env:POKER_RAISED_POSTFLOP_AUDIT_SEAT='1'
foreach ($probe in @(@{Mode='response-texture';File='continuation-texture-seat-1'},@{Mode='tight-card-grid';File='card-grid-seat-1'})) {
  $env:POKER_RAISED_POSTFLOP_OFFLINE=$probe.Mode
  $env:POKER_RAISED_POSTFLOP_OUTPUT="$evidence/$($probe.File).json"
  npm.cmd test -- tests/decision-raised-postflop-probe.test.ts
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$env:POKER_RAISED_POSTFLOP_OFFLINE='tight-stratified'
$env:POKER_RAISED_POSTFLOP_STRATIFICATION='deep'
$env:POKER_RAISED_POSTFLOP_OUTPUT="$evidence/stratified-seat-1-deep.json"
npm.cmd test -- tests/decision-raised-postflop-probe.test.ts
Remove-Item Env:POKER_RAISED_POSTFLOP_STRATIFICATION
Remove-Item Env:POKER_RAISED_POSTFLOP_AUDIT_RANDOM
```

```powershell
$cache=Get-ChildItem -LiteralPath "$env:LOCALAPPDATA/electron/Cache" -Recurse -Filter 'electron-v45.1.0-win32-x64.zip' -File | Select-Object -First 1
Expand-Archive -LiteralPath $cache.FullName -DestinationPath 'artifacts/electron-win-measure-45.1.0'
$env:POKER_RAISED_POSTFLOP_PROFILE=(Resolve-Path $original).Path
$env:POKER_RAISED_POSTFLOP_WINDOWS_OUTPUT=(Resolve-Path $evidence).Path
$env:POKER_RAISED_POSTFLOP_TRAINING_REPORT=Join-Path $env:POKER_RAISED_POSTFLOP_WINDOWS_OUTPUT 'training.json'
./node_modules/.bin/rolldown.cmd tests/helpers/measure-precomputed-flop.ts -p node -f cjs -e electron -o artifacts/measure-precomputed-flop.cjs
$exe=(Resolve-Path 'artifacts/electron-win-measure-45.1.0/electron.exe').Path
$entry=(Resolve-Path 'artifacts/measure-precomputed-flop.cjs').Path
$probe=Start-Process -FilePath $exe -ArgumentList ('"' + $entry + '"') -WindowStyle Hidden -PassThru
if (!$probe.WaitForExit(30000)) { $probe.Kill(); throw 'Windows measurement exceeded 30 seconds' }
if ($probe.ExitCode -ne 0) { exit $probe.ExitCode }
```
