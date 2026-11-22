# Fem- och sexvägsflop efter check → bet → raise

**22 november 2026 · Codex · Windows**

Proven fortsätter med fem respektive sex aktiva på `Qh 8d 6h` efter en check, en satsning på 60 och en höjning till 180. Startpotten vid beslutet är 360 marker. Alla kompatibla hålkortskombinationer väger lika vid roten. Trädet har 1 460 respektive 5 084 noder, halvpottsstorlekar, högst två fulla höjningar och all-in. [Spelmodell och första träningsprov](../chance-sampled-four-to-six-2026-11-22/RESULTAT.md) · [Godkänd fyrvägsflop](../four-way-flop-verification-2026-11-22/RESULTAT.md)

## Windows

De tidigare profilerna packades upp i nya kataloger. Första hela handraden tog 86,12 ms för fem aktiva och 131,42 ms för sex aktiva. Varma uppslag inklusive bildruta tog högst 60,16 och 50,98 ms. Det separata Windows-forskningsfönstret kontrollerade samtliga handlingar i bilden mot respektive profilmätning. Ordinarie efteranalys behöver fortfarande matchas och provas. [Femvägsprofil](5-flop-profile.zip) · [Femvägsrapport](5-flop-windows/windows-timing.json) · [Sexvägsprofil](6-flop-profile.zip) · [Sexvägsrapport](6-flop-windows/windows-timing.json)

## Oberoende kvalitetsprov

Kortprovet räknar den bästa ensidiga avvikelsen för sätet som satsade, med exakt synlig information och de övriga spelarnas sparade strategier. Provet använder alla egna hålkortspar och alla ordnade brädor, med åtta nya dolda givar per kombination. Den gemensamma felbudgeten för upprepade övre gränser är 0,05, delad på högst 32 prov per modell. Den här körningen använder betalningsgränser vid vägar där motståndarnas sammanlagda räckvidd understiger 0,000005. Den väljer högsta möjliga utfall för avvikaren och lägsta möjliga för den fasta profilen vid varje sådant stopp. Det vidgar den övre gränsen och minskar offlinearbetet. [Indelning av givar och konfidensmetod](../four-way-flop-verification-2026-11-22/RESULTAT.md#oberoende-övre-gräns)

Provet av lagliga motstrategier väljer bara en annan första handling på floppen för ett säte i taget. Spelaren följer därefter den frysta profilen. Valet anpassas på 160 000 givar och värderas på 160 000 separata givar per säte. Den ensidiga undre gränsen är beräknad gemensamt för sätena i respektive profil. Ett sådant prov kan underkänna en profil om det hittar en påvisad vinst över gränsen. [Maurer och Pontil, teorem 4](https://www.cs.mcgill.ca/~colt2009/papers/012.pdf)

De sparade profilernas övre gränser för sätet som satsade är 5,17614 % av rotpotten för fem aktiva och 10,19458 % för sex. Första-beslutsprovet för fem aktiva gav undre gräns 0 % för samtliga säten. På sexvägsfloppen kom den högsta undre gränsen från säte 5 med 1,99471 %. [Femvägsprofilens övre gräns](five-card-grid-seat-1.json) · [Sexvägsprofilens övre gräns](six-card-grid-seat-1.json) · [Undre gränser med fem aktiva](five-lower.json) · [Undre gränser med sex aktiva](six-lower.json)

Den sparade sexvägsprofilen underkändes i det större oberoende provet. Samma lagliga ändring av sätets första handling gav 2,85252 % uppskattad vinst över den frysta profilen på ytterligare 640 000 givar från en ny AES-ström. Den ensidiga undre gränsen var 2,52945 % av rotpotten, avrundad nedåt. [Upprepat undre prov för säte 5](six-lower-seat-5-recheck.json)

## Profiler med fler träningsgivar

För fem aktiva tränades 1 600 000 givar, jämfört med tidigare 342 466. Träningen tog 302,19 s. Den uppackade profilen gav första hela handraden efter 165,09 ms i Windows. Alla 1 176 lagliga rotkombinationer hade tränade rader och en avvikande pott avvisades. Träningen besökte hela satsningsträdet för varje giv. Cachen för pottutbetalning återanvänder utfallet när de spelare som fortfarande kan vinna potten har samma inbördes handrankning. [Träningsrapport](5-flop-deep-training.json) · [Arkiv](5-flop-deep-profile.zip) · [Windowsrapport](5-flop-deep-windows/windows-timing.json) · [Rottest](5-flop-deep-lookup.json)

Det första kortprovet täckte alla fem säten. Tiden för de körningarna inkluderar att Windows gick i vila och återupptog beräkningarna. Tiderna för Windows-fönstret mättes separat.

| Säte | Givar per kortpar och ordnad bräda | Övre gräns | Under 2,1 % |
|---:|---:|---:|---|
| 0 | 16 | [1,34833 %](5-flop-deep-card-grid-seat-0.json) | Ja |
| 1 | 24 | [2,12357 %](5-flop-deep-card-grid-seat-1.json) | Öppen |
| 2 | 24 | [2,42615 %](5-flop-deep-card-grid-seat-2.json) | Öppen |
| 3 | 16 | [0,98420 %](5-flop-deep-card-grid-seat-3.json) | Ja |
| 4 | 16 | [1,18253 %](5-flop-deep-card-grid-seat-4.json) | Ja |

För sex aktiva tränades 460 000 givar, jämfört med tidigare 98 348. Träningen skrev ut hela profilen och testköraren rapporterade sedan ett tidsgränsfel efter vilan i Windows. Arkivet från den körningen verifierades i ny process. Första hela handraden tog 843,64 ms i forskningsfönstret. [Första träningsrapporten](6-flop-deep-training-timeout.json) · [Arkiv](6-flop-deep-profile.zip) · [Windowsrapport](6-flop-deep-windows/windows-timing.json)

Tätare kontroll kvalificerade ytterligare ett säte på femvägsfloppen. Höjarens gräns behöver fortsatt skärpas. Gränserna i tabellerna anges som procent av rotpotten och är avrundade uppåt.

| Säte | Givar per kortpar och ordnad bräda | Övre gräns | Under 2,1 % |
|---:|---:|---:|---|
| 1 | 32 | [1,96965 %](5-flop-deep-card-grid-seat-1-recheck.json) | Ja |
| 2 | 56 | [2,16816 %](5-flop-deep-card-grid-seat-2-recheck.json) | Öppen |

Omkörningen av sexvägsträningen passerade med samma manifest. Rottestet verifierade alla 1 176 kombinationer och avvisade en avvikande pott. Med 460 000 träninggivar minskade sätets övre gräns från 10,19458 % till 6,01241 % för den som satsade, med samma åtta dolda givar per kort och bräda. Säte 5 fick 3,65137 % som övre gräns. Det tidigare avvikelseprovet på nya givar gav nu undre gräns 0 % för det sätet. [Godkänd omkörning](6-flop-deep-training.json) · [Rottest](6-flop-deep-lookup.json) · [Säte 1](6-flop-deep-card-grid-seat-1.json) · [Säte 5](6-flop-deep-card-grid-seat-5.json) · [Laglig avvikelse för säte 5](6-flop-deep-lower-seat-5.json)

## Kör om i PowerShell

```powershell
$base='docs/evidence/five-six-way-flop-verification-2026-11-22'
$env:POKER_RAISED_POSTFLOP_PROBE='1'
$env:POKER_RAISED_POSTFLOP_STREET='flop'
$env:POKER_RAISED_POSTFLOP_TIMEOUT_MS='3600000'
foreach ($model in @(
  @{Players=5;Name='five';Deals=1600000},
  @{Players=6;Name='six';Deals=460000}
)) {
  $players=$model.Players
  $env:POKER_RAISED_POSTFLOP_PLAYERS=[string]$players
  $archive="artifacts/$players-flop-archive-verification-2026-11-22"
  Expand-Archive -LiteralPath "$base/$players-flop-profile.zip" -DestinationPath $archive
  $env:POKER_RAISED_POSTFLOP_PROFILE=$archive
  $env:POKER_RAISED_POSTFLOP_OFFLINE='first-decision-response'
  Remove-Item Env:POKER_RAISED_POSTFLOP_AUDIT_SEAT,Env:POKER_RAISED_POSTFLOP_AUDIT_FAMILY -ErrorAction SilentlyContinue
  $env:POKER_RAISED_POSTFLOP_OUTPUT="$base/$($model.Name)-lower.json"
  npm.cmd test -- tests/decision-raised-postflop-probe.test.ts --environment node
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  $env:POKER_RAISED_POSTFLOP_OFFLINE='tight-card-grid'
  $env:POKER_RAISED_POSTFLOP_AUDIT_SEAT='1'
  $env:POKER_RAISED_POSTFLOP_AUDIT_ENGINE='compact'
  $env:POKER_RAISED_POSTFLOP_AUDIT_CUTOFF='0.000005'
  $env:POKER_RAISED_POSTFLOP_AUDIT_FAMILY='32'
  $env:POKER_RAISED_POSTFLOP_GRID_DRAWS='8'
  $env:POKER_RAISED_POSTFLOP_OUTPUT="$base/$($model.Name)-card-grid-seat-1.json"
  npm.cmd test -- tests/decision-raised-postflop-probe.test.ts --environment node
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  $env:POKER_RAISED_POSTFLOP_PROFILE="artifacts/chance-sampled-$players-way-flop-deep-2026-11-22"
  $env:POKER_RAISED_POSTFLOP_OFFLINE='train-chance'
  $env:POKER_RAISED_POSTFLOP_TRAIN_DEALS=[string]$model.Deals
  $env:POKER_RAISED_POSTFLOP_OUTPUT="$base/$players-flop-deep-training.json"
  npm.cmd test -- tests/decision-raised-postflop-probe.test.ts --environment node
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```

Det upprepade sexvägsprovet använder den uppackade äldre sexvägsprofilen. Sätt `POKER_RAISED_POSTFLOP_PLAYERS='6'`, `POKER_RAISED_POSTFLOP_OFFLINE='first-decision-response'`, `POKER_RAISED_POSTFLOP_AUDIT_SEAT='5'`, `POKER_RAISED_POSTFLOP_AUDIT_FAMILY='24'` och `POKER_RAISED_POSTFLOP_RESPONSE_EVALUATION_DEALS='640000'`. Kör samma testkommando med en separat rårapport.

För de nya profilerna, packa upp motsvarande `*-flop-deep-profile.zip`, peka `POKER_RAISED_POSTFLOP_PROFILE` dit och kör `tight-card-grid` med sätena och antalet givar i tabellerna. Behåll familjestorlek 32 och samma verifierare samt betalningsgräns. Sexvägsprovet kördes för säten 1 och 5 med åtta givar. Det lagliga avvikelseprovet kördes även på den nya sexvägsprofilen med samma parametrar. Sätt `POKER_RAISED_POSTFLOP_TIMEOUT_MS='14400000'` för reproduktion av offlineproven som kördes om efter vilan i Windows.

Använd nya utdatakataloger. [Körkommando för Windows-fönstret](../chance-sampled-three-way-flop-2026-11-22/RESULTAT.md#windows)
