# Fyrvägs- till sexvägsprov efter check → bet → raise

**22 november 2026 · Codex · Windows**

Efter godkända trevägsprov tränades samma linje på de tre brädorna med fyra, fem och sex aktiva. Varje säte började med 360 marker på gatan. Startpotten var 120 före check, bet 60 och raise till 180. Säte 3, först efter höjaren, är hjälten i de större modellerna. Eventuella ytterligare säten har också sitt första beslut kvar. Alla aktiva får likaviktade, sinsemellan kompatibla hålkort vid beslutets rot. Satsningsträdet använder halvpottsstorlek, högst två fulla höjningar samt all-in. [Föregående trevägsprov och avgränsningar](../chance-sampled-three-way-flop-2026-11-22/RESULTAT.md)

Trädet växer med antal aktiva och kvarvarande gator. Träningsbudgeten sätts utifrån antalet noder och har ett tak på sex miljoner givar. För varje giv räknas samtliga bettinggrenar. Alla framtida runouts kan dras. De exakta egna hålkorten används på rotgatan och grupper för relativ handstyrka på senare gator. Att hela trädet tränas och att en handrad visas räcker för funktionstest. Strategikvaliteten bedöms separat.

## Oberoende test

Den första övre kontrollen låter den avvikande spelaren se hela given och räknar dess optimala svar under det antagandet. En faktisk avvikare har mindre information, så resultatet är en övre gräns. Den kan vara betydligt större än den verkliga förbättringen. En övre gräns över 2,1 % lämnar kvaliteten öppen. För en snävare gräns delas stickprovet upp efter spelarens exakta hålkort och offentliga kort. Den avvikande spelaren får välja olika handlingsplaner för olika synliga lägen och samma plan måste användas mot alla dolda händer inom läget. [Hur den snävare gränsen beräknas](../chance-sampled-three-way-flop-2026-11-22/RESULTAT.md#fördjupning-för-sätet-som-satsade)

Flerpersonskörningarna använder AES-256-CTR med separat ström för varje träning och kontroll. Windows-proven använder det separata forskningsfönstret från trevägsprovet. De mäter från uppslagsbegäran till komplett infångad bildruta.

## Profiler med verifierad kvalitet

| Gata och aktiva | Oberoende övre gräns per säte, i ordning 0 och framåt | Första Windows-bildruta |
|---|---|---:|
| Turn, 4 | 0,766 %, 1,051 %, 1,586 %, 0,755 % | 0,127 s |
| River, 4 | 0,828 %, 0,839 %, 0,765 %, 0,747 % | 0,143 s |
| River, 5 | 1,565 %, 1,669 %, 1,470 %, 1,385 %, 1,460 % | 0,130 s |

Gränser och tider är avrundade uppåt. På turn användes 128 dolda givar per eget hålkortspar och riverkort. På river användes 4 096 dolda givar per eget hålkortspar vid fyra aktiva och 2 048 vid fem. Bonferronifördelning inom respektive spel ger minst 95 % samtidig konfidens under stickprovsantagandena.

[Fyrvägsturn, rådata och Windows-bildruta](4-turn/) · [Fyrvägsturn, arkiv](4-turn/profile.zip) · [Fyrvägsriver, rådata och Windows-bildruta](4-river/) · [Fyrvägsriver, arkiv](4-river/profile.zip) · [Femvägsriver, rådata och Windows-bildruta](5-river/) · [Femvägsriver, arkiv](5-river/profile.zip)

## Täckning på alla tre gator

| Aktiva | Gata | Noder | Träningsgivar | Första bildruta i Windows | Kvalitetsgräns för alla säten |
|---:|---|---:|---:|---:|---|
| 4 | [Flop](4-flop/) | 404 | 1 237 624 | 0,140 s | [Klar i senare omprov](../four-way-flop-verification-2026-11-22/RESULTAT.md) |
| 4 | [Turn](4-turn/) | 244 | 2 049 181 | 0,127 s | Klar |
| 4 | [River](4-river/) | 84 | 5 952 381 | 0,142 s | Klar |
| 5 | [Flop](5-flop/) | 1 460 | 342 466 | 0,155 s | Öppen |
| 5 | [Turn](5-turn/) | 868 | 576 037 | 0,133 s | Öppen |
| 5 | [River](5-river/) | 276 | 1 811 595 | 0,130 s | Klar |
| 6 | [Flop](6-flop/) | 5 084 | 98 348 | 0,130 s | Öppen |
| 6 | [Turn](6-turn/) | 2 980 | 167 786 | 0,132 s | Öppen |
| 6 | [River](6-river/) | 876 | 570 777 | 0,132 s | Öppen |

Alla nio har sparade funktionsprov för samtliga lagliga kombinationer vid roten och första kompletta handraden under tio sekunder i forskningsfönstret.

- Fyrvägsfloppen kontrollerades först med fyra kompatibla motståndargivar per eget hålkortspar och ordnad bräda. De ursprungliga övre gränserna avrundade uppåt blev 2,011 %, 3,853 %, 2,646 % och 1,633 %. Tätare oberoende prov kvalificerade senare den sparade profilen för alla fyra säten. [Säte 0](4-flop/card-grid-seat-0.json) · [Säte 1](4-flop/card-grid-seat-1.json) · [Säte 2](4-flop/card-grid-seat-2.json) · [Säte 3](4-flop/card-grid-seat-3.json) · [Profil](4-flop/profile.zip) · [Senare omprov](../four-way-flop-verification-2026-11-22/RESULTAT.md)
- Femvägsturn provades först med 64 dragningar per eget hålkortspar och riverkort för sätet som checkade. Tätare omprov med 128 och justering för omprov gav 2,020 % för det sätet och 3,583 % för sätet som höjde. [Första provet](5-turn/card-grid-seat-0.json) · [Sätet som checkade](5-turn/card-grid-deep-seat-0.json) · [Sätet som höjde](5-turn/card-grid-deep-seat-2.json)
- Sexvägsriver provades först med 2 048 dragningar per eget hålkortspar för sätet som checkade. Tätare omprov med 4 096 och justering för omprov gav 2,325 % för det sätet och 2,690 % för sätet som satsade. [Första provet](6-river/card-grid-seat-0.json) · [Sätet som checkade](6-river/card-grid-deep-seat-0.json) · [Sätet som satsade](6-river/card-grid-deep-seat-1.json) · [Profil för omprov](6-river/profile.zip)

Testköraren registrerade tre tidsgränsfel efter ett längre uppehåll i Windows. Råfilerna från försöken finns kvar med suffixet `-timeout`. Alla tre kördes om med samma profil och slumptalsström. Omgångarna passerade testköraren och gav identiska värden förutom tidsmätningen. Uppslagstiderna i tabellen kommer från Windows-fönstrets egna körningar. [Tidigare femvägsturn](5-turn/card-grid-deep-seat-2-timeout.json) · [Tidigare sexvägsriver](6-river/card-grid-deep-seat-1-timeout.json) · [Tidigare sexvägsflop](6-flop/omniscient-upper-timeout.json) · [Omprov sexvägsflop](6-flop/omniscient-upper.json)

## Kör om i PowerShell

```powershell
$env:POKER_RAISED_POSTFLOP_PROBE='1'
$base='docs/evidence/chance-sampled-four-to-six-2026-11-22'
foreach ($players in 4,5,6) {
  $env:POKER_RAISED_POSTFLOP_PLAYERS=[string]$players
  foreach ($street in 'river','turn','flop') {
    $env:POKER_RAISED_POSTFLOP_STREET=$street
    $env:POKER_RAISED_POSTFLOP_PROFILE="artifacts/chance-sampled-$players-way-$street-2026-11-22"
    $evidence="$base/$players-$street"
    New-Item -ItemType Directory -Force $evidence | Out-Null
    $env:POKER_RAISED_POSTFLOP_OFFLINE='model-size'
    $env:POKER_RAISED_POSTFLOP_OUTPUT="$base/model-$players-$street.json"
    npm.cmd test -- tests/decision-raised-postflop-probe.test.ts
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    $model=Get-Content $env:POKER_RAISED_POSTFLOP_OUTPUT -Raw | ConvertFrom-Json
    $env:POKER_RAISED_POSTFLOP_TRAIN_DEALS=[string][int][math]::Min(6000000,[math]::Ceiling(500000000/$model.publicNodes))
    foreach ($probe in @(@{Mode='train-chance';File='training'},@{Mode='omniscient-upper';File='omniscient-upper'})) {
      $env:POKER_RAISED_POSTFLOP_OFFLINE=$probe.Mode
      $env:POKER_RAISED_POSTFLOP_OUTPUT="$evidence/$($probe.File).json"
      npm.cmd test -- tests/decision-raised-postflop-probe.test.ts
      if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
  }
}
```

Använd en tom profilmapp för träning. För Windows-mätning används kommandot från flopprovet med den aktuella profilmappen och dess `training.json`. För ett oberoende kortprov behålls spelarantal, gata och profilmapp. Sätt läget till `tight-card-grid`, ange sätet med `POKER_RAISED_POSTFLOP_AUDIT_SEAT` och antalet dragningar med `POKER_RAISED_POSTFLOP_GRID_DRAWS`. Omprov på femvägsturn använder `POKER_RAISED_POSTFLOP_AUDIT_FAMILY='10'` och på sexvägsriver `'12'`. Kör samma testkommando och ange en egen rårapport för varje säte.
