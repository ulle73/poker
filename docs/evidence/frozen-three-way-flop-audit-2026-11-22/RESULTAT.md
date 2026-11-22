# Oberoende omprov av den sparade trevägsfloppen

**22 november 2026 · Codex · Windows**

Den sparade strategin underkändes för alla tre spelarna. Det första lokala uppslaget från en nyuppackad kopia tog 7,98 ms. De 25 följande uppslagen tog 0,15–0,50 ms. Alla 1 176 lagliga hålkortskombinationer gick att slå upp och en ändrad pott avvisades. Tiden avser öppning och uppslag i en separat testprocess. Appens visning och livekedja provades inte.

## Kvalitetsgränser per spelare

Siffrorna är procent av potten på 360 marker vid beslutet. Undre gräns avser vinsten en spelare kan uppnå genom att ensam ändra strategi medan de andra två fortsätter använda den sparade profilen.

| Säte | Tidigare övre gräns | Ny övre gräns | Uppmätt vinst för motstrategin | Ny undre gräns |
|---|---:|---:|---:|---:|
| 0, hjälten som checkade | 15,76 % | 12,81 % | 6,25 % | **5,99 %** |
| 1, spelaren som satsade | 20,98 % | 15,88 % | 7,30 % | **7,06 %** |
| 2, spelaren som höjde | 18,95 % | 15,55 % | 6,82 % | **6,59 %** |

De undre gränserna ligger samtliga över kravet 2,1 %. En giltig övre gräns kan därför inte styrka den sparade strategin vid den valda konfidensnivån. Separata beslut på turn och river och kandidater med 4–6 spelare får vänta på en kvalificerad flopprofil. [Större övre kontroll](larger-upper.json) · [Motstrategi på nya givar](continuation-response.json) · [Uppslag](lookup.json)

## Modell och metod

Båda kontrollerna läser den befintliga frysta strategin, inklusive likafördelning mellan lagliga val där tränad rad saknas. Floppen är `Qh 8d 6h` efter check, bet 60 och raise till 180. Samma 104 noder i det begränsade satsningsträdet används i båda kontrollerna, inklusive återstående gator. Rangerna är likaviktade över alla kompatibla hålkort vid roten. Modellen saknar rake och actionbaserade ranger före roten. [Originalprofil, arkiv och modell](../precomputed-three-way-flop-2026-11-22/RESULTAT.md)

Den övre gränsen bygger på 1 024 grupper om 768 givar per säte, totalt 786 432 givar per säte. Spelarens hålkort är fasta inom en grupp. Motspelarnas hålkort och framtida brädkort varieras inom gruppen. Den avvikande spelaren måste välja samma handling för samma synliga läge, även när dolda kort skiljer sig. Den bäst uppmätta policyn per grupp ger en optimistisk skattning eftersom varje laglig fast strategi är ett alternativ i varje grupp. Motspelarnas faktiska sannolikhet att nå noden, givet given, ingår när handlingarna jämförs. En separat sju-kortsutvärderare bedömer showdown. Omprovet tog 175,46 s offline.

Den undre gränsen bygger på en laglig motstrategi per säte, vald med 120 000 träningsgivar. Den använder bettinghistorik, egna hålkort på flop och relativ handstyrka på den synliga brädan på turn och river. På turn skiljer den också på hand med och utan färgdrag. Den kan välja ett enskilt drag eller behålla den sparade blandningen vid ett beslut. Motstrategierna låstes före utvärderingen på 240 000 nya givar med ett separat frö. Samma giv används när den ursprungliga profilen jämförs med motstrategin. Alla satta handlingsfrekvenser vägs exakt i trädet och showdown utvärderas oberoende. Omprovet tog 71,27 s offline.

Varje kontroll använder ensidig empirisk Bernstein med felrisk `0,05 / 3` per säte, vilket ger minst 95 % samtidig konfidens inom respektive kontroll under stickprovsantagandena. De tre undre gränserna behöver inget antagande om att de valda motstrategierna är optimala. [Stickprovsoptimering, Shapiro](https://bpb-us-e1.wpmucdn.com/sites.gatech.edu/dist/4/1470/files/2021/03/mmor03.pdf) · [Empirisk Bernstein, Maurer och Pontil](https://arxiv.org/pdf/0907.3740)

## Kör om i PowerShell

Kör från repots rot. Använd en ny målkatalog vid uppackning. Det större övre provet och motstrategin kördes från den tidigare uppackade kopian `artifacts/precomputed-three-way-flop-archive-check-2026-11-22`. Uppslaget kördes från den nyuppackade katalogen nedan. Det övre provet upprepades från samma nyuppackade katalog och gav identisk rapport med undantag för körtiden. Samtliga rapporter har manifestets SHA-256 `d178eda83fb26465fdd785c7f4926aa821030581b637db86f9611c7696d58000`. Auditen kontrollerar varje strategitabell mot manifestet.

```powershell
$zip='docs/evidence/precomputed-three-way-flop-2026-11-22/profile.zip'
$destination='artifacts/frozen-three-way-flop-audit-2026-11-22'
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $zip).Hash.ToLowerInvariant() -ne 'bc84ed625bc01bf5642643a9ff1bb9889f9d1d43d754bd4e2328f08ebc678b62') { throw 'Unexpected profile archive SHA256' }
Expand-Archive -LiteralPath $zip -DestinationPath $destination
Get-FileHash -Algorithm SHA256 -LiteralPath "$destination/manifest.json"

$env:POKER_RAISED_POSTFLOP_PROBE='1'
$env:POKER_RAISED_POSTFLOP_STREET='flop'
$env:POKER_RAISED_POSTFLOP_PROFILE=$destination
$evidence='docs/evidence/frozen-three-way-flop-audit-2026-11-22'
foreach ($probe in @(@{Mode='tight-large';File='larger-upper'},@{Mode='response';File='continuation-response'},@{Mode='lookup';File='lookup'})) {
  $env:POKER_RAISED_POSTFLOP_OFFLINE=$probe.Mode
  $env:POKER_RAISED_POSTFLOP_OUTPUT="$evidence/$($probe.File).json"
  npm.cmd test -- tests/decision-raised-postflop-probe.test.ts
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```
