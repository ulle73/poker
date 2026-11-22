# Trevägsturn och trevägsriver efter check → bet → raise

**22 november 2026 · Codex · Windows**

Tre säten med lika breda ranger på samma bräda som i flopprovet. Turn är `Qh 8d 6h 2c`, river `Qh 8d 6h 2c Js`. Varje prov börjar med en egen pott på 120 före check, bet 60 och raise till 180. Vid beslutet finns 360 marker i potten. Startstacken på den aktuella gatan är 360 per säte. Modellen har halvpottsstorlekar, högst två fulla höjningar och all-in. Rangerna är likaviktade i respektive rot. Det återstår att verifiera hur ranger, insatser och stackar följer en och samma hand mellan gatorna. [Flopprovet och metoden](../chance-sampled-three-way-flop-2026-11-22/RESULTAT.md)

Sex miljoner givar tränade hela bettingträdet på respektive gata. Turn tog 42,20 s offline och gav rader för alla 1 128 egna hålkortspar vid roten. River tog 20,21 s och gav alla 1 081 par. [Turnträning och profil](training.json) · [Riverträning](../chance-sampled-three-way-river-2026-11-22/training.json)

En separat handutvärderare räknar showdowns. Kontrollens stickprov inkluderar varje möjligt eget hålkortspar och varje återstående riverkort. På turn används 1 024 och på river 16 384 kompatibla motståndargivar per kombination. Träningen och varje kontroll använder en egen reproducerbar AES-256-CTR-ström. Gränsen för samtliga spelare gäller med minst 95 % samtidig konfidens per gata under stickprovsantagandena.

| Gata | Sätet som checkade | Sätet som satsade | Sätet som höjde | Första bildruta i Windows |
|---|---:|---:|---:|---:|
| Turn | 0,191 % | 0,220 % | 0,298 % | 0,137 s |
| River | 0,353 % | 0,380 % | 0,310 % | 0,195 s |

Gränserna visas i procent av rotpotten, avrundade uppåt. Båda gatorna klarade kvalitetskravet på 2,1 % för var och en av de tre spelarna. De två uppackade profilerna lästes in i separata Windows-forskningsfönster med Electron 45.1.0. Filuppslag, rendering av komplett handrad och fångad bildruta ingår. Alla efterföljande uppslag tog högst 0,050 s. Ordinarie efteranalys kräver att spelet kan matchas med rätt satsningshistorik och spelmodell.

[Turnprov säte 0](card-grid-seat-0.json) · [Säte 1](card-grid-seat-1.json) · [Säte 2](card-grid-seat-2.json) · [Turn Windows](windows-timing.json) · [Turnbild](windows-frame.png) · [Turnarkiv](profile.zip)

[Riverprov säte 0](../chance-sampled-three-way-river-2026-11-22/card-grid-seat-0.json) · [Säte 1](../chance-sampled-three-way-river-2026-11-22/card-grid-seat-1.json) · [Säte 2](../chance-sampled-three-way-river-2026-11-22/card-grid-seat-2.json) · [River Windows](../chance-sampled-three-way-river-2026-11-22/windows-timing.json) · [Riverbild](../chance-sampled-three-way-river-2026-11-22/windows-frame.png) · [Riverarkiv](../chance-sampled-three-way-river-2026-11-22/profile.zip)

## Kör om i PowerShell

```powershell
$env:POKER_RAISED_POSTFLOP_PROBE='1'
$env:POKER_RAISED_POSTFLOP_TRAIN_DEALS='6000000'
foreach ($street in 'turn','river') {
  $env:POKER_RAISED_POSTFLOP_STREET=$street
  $env:POKER_RAISED_POSTFLOP_PROFILE="artifacts/chance-sampled-three-way-$street-2026-11-22"
  $evidence="docs/evidence/chance-sampled-three-way-$street-2026-11-22"
  $env:POKER_RAISED_POSTFLOP_OFFLINE='train-chance'
  $env:POKER_RAISED_POSTFLOP_OUTPUT="$evidence/training.json"
  npm.cmd test -- tests/decision-raised-postflop-probe.test.ts
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  $env:POKER_RAISED_POSTFLOP_OFFLINE='tight-card-grid'
  foreach ($seat in 0,1,2) {
    $env:POKER_RAISED_POSTFLOP_AUDIT_SEAT=[string]$seat
    $env:POKER_RAISED_POSTFLOP_OUTPUT="$evidence/card-grid-seat-$seat.json"
    npm.cmd test -- tests/decision-raised-postflop-probe.test.ts
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
}
```

Använd en tom profilmapp vid omträning. För timingprovet packas arkivet upp i en separat katalog. Använd Windows-kommandot från flopprovet och peka på den uppackade profilmappen samt gatans träningsrapport. Arkivets SHA-256 är `dfeab233ddfed62db855fee84288f44a8ebf198dd0bbb0d61fb308abb167bf67` på turn och `5343bb0b52bdc25754eb877cd7c1a75135dff4cfc68592dc7b5dee53a1898f33` på river.
