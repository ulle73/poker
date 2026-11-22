# Avslutande all-in för två till sex spelare

22 november 2026. Utgångspunkt `6db8f96` från `origin/codex/free-solver-providers`.

Efteranalysen kan använda samma bevis på flop, turn och river. För varje möjlig enskild motståndarhand prövas återstående brädkort. Vid flera motståndare begränsas pottandelen för varje möjlig gemensam giv, med hänsyn till blockerade kort och delning av potten. Syn visas när lägsta möjliga utbetalning i förväntan överstiger synkostnaden. Fold visas när högsta möjliga utbetalning ligger under kostnaden. För en ojämn delning kan utfallet skilja med upp till en minsta marker per utbetalning. Gränserna hanterar detta försiktigt. Priset gäller syn som avslutar satsningen, med alla utdelade kvar och med samma positiva all-in-insats från motståndarna vid flervägsspel. Modellen räknar chip-EV utan rake. [Svenska Spels pottodds](https://spela.svenskaspel.se/poker/pokerodds) · [Regler för sidopotter och udda marker](https://www.pokertda.com/view-poker-tda-rules/)

## Körningar

| Prov | Observerat resultat |
| --- | --- |
| Regressioner före ändringen | 8 passerade, 3 föll för turn, river och strikt vinst på delad riverbräda. |
| Standardsvit | 461 passerade, 34 överhoppade. [Testlogg](tests.log) |
| Produktionsbygge och Windows x64-katalog | Båda passerade. [Bygglogg](build.log) · [Paketeringslogg](package.log) |
| Paketerad efteranalys | 15 kombinationer av gata och spelarantal, 30 godkända om man räknar kall och varm körning. Alla visade **Syna 0,40 EUR**, 100 %, med bevisetikett och upplysning om rake. |

| Gata | Min–max från frigiven hand till fångad bildruta |
| --- | ---: |
| Flop | 161–2 264 ms |
| Turn | 69–2 048 ms |
| River | 72–2 111 ms |

[Rådata för samtliga körningar och pakethash](windows.json) · [Sex spelare på turn](closing-all-in-turn-6.png) · [Sex spelare på river](closing-all-in-river-6.png)

Provet använde samma handtyp med en ensam vinnande hjältehand på de tre gatorna, via syntetiska mottagarsnapshots. Tiden för tre handbyten ingår inte. De 34 överhoppade proven innehåller bland annat installerade externa källor. Ny faktisk hand och extern strategikvalitet verifierades inte i denna körning.

```powershell
npm.cmd ci --no-audit --no-fund
npx.cmd vitest run tests/training-strength.test.ts --maxWorkers=1 --reporter=default # rött prov före ändringen
$env:RAYON_NUM_THREADS='1'
$env:NODE_OPTIONS='--max-old-space-size=768'
npm.cmd test -- --maxWorkers=1 --reporter=default
npm.cmd run build
./node_modules/.bin/electron-builder.cmd --win --dir --x64
./scripts/measure-decisions.ps1 -Executable 'release/win-unpacked/Poker GTO Advisor.exe' -Output 'artifacts/gto-coverage-2026-11-22' -ClosingAllIn -ClosingAllInStreets flop,turn,river
```

## Källor granskade för den bredare luckan

| Kandidat | Stöd och blockerare |
| --- | --- |
| Monker Free och Holdem Solver 0.93 | Monker Free stöder turn och river. Tidigare lokal Holdem Solver-kvalificering fastställde varken en fungerande automatisk startväg eller tillräcklig kvalitet och tid. [MonkerWare](https://www.monkerware.com/solver.html) · [Tidigare kvalificering](../../holdemsolver-qualification-2026-11-08.md) |
| SHARINGAN-2 | Öppna vikter och kod, sex utdelade, 100 BB, fast storleksmeny och publicerade exploaterbara svagheter. Utgivaren anger cirka 170 GB för den slutliga viktfilen. [Källkod och modell](https://github.com/markokraemer/poker-sharingan) · [Driftkrav](https://sharingan.poker/docs/) |
| Omni | Gratisplanen kan användas för ett riktat flervägsprov på Q♥ 8♦ 6♥ med konto. För bred användning krävs annan åtkomst. Multiwaymåttet gäller leverantörens abstraherade spel. Maskinläsbar integration, felgräns i målmodellen och svarstid återstår att verifiera. [Produkt och mått](https://omnigto.com/press) · [Villkor](https://omnigto.com/terms) |
| IkaSolver | Leverantören dokumenterar konfigurerbara träd upp till nio spelare och exportformat. Demon använder förberäknade lösningar. Tid, oberoende kvalitetskontroll och komplett läsformat återstår. [Funktioner](https://ikasolver.com/features) · [Demo](https://ikasolver.com/demo) |
| GTO Wizard | Anpassad flervägspreflop upp till nio spelare och dokumenterad anpassad postflop upp till tre. [Leverantörens lansering](https://blog.gtowizard.com/introducing-multiway-preflop-solving/) |

Kvalificera först en bred trevägsflop där historiken innefattar check, bet och raise. För ett fullständigt prov krävs en läsbar strategi för den exakta modellen, en oberoende jämförelse mot bästa ensidiga avvikelse och en mätning av tiden från begäran till visat svar. Upprepa för fyra, fem och sex spelare innan modellen får täcka dessa spelarantal.
