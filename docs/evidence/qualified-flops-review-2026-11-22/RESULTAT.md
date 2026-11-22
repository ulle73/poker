# Tre- och fyrvägsfloppar i automatisk efteranalys

22 november 2026. Efteranalysen använder nu de två sparade profilerna efter
check → bet → raise på Q♥ 8♦ 6♥ och motsvarande brädor med omdöpta färger.
Spelarna har 36 BB var vid floppens början. Potten är 12 BB före satsningen,
första bet är 6 BB och höjningen är till 18 BB. Belopp, minsta bet och
granularitet måste matcha de arkiverade modellerna exakt. Trevägsprofilen
gäller första sätet som checkade. Fyrvägsprofilen gäller sätet efter höjaren.
Det tredje observerade handbytet frigör fortfarande handen.

| Windows-prov | Syn | All-in | Övre gräns i modellen | Tid från frigivning |
|---|---:|---:|---:|---:|
| Tre aktiva, EUR | 3,46 % | 96,54 % | 1,967 % | 176 ms |
| Fyra aktiva, SEK | 70,04 % | 29,96 % | 2,098 % | 107 ms |
| Fyra aktiva, första betbildrutan saknas |  |  | Ingen modellreferens | 90 ms till täckningsbesked |

Hero hade A♥ K♥ i båda träffarna. Varje profil har också en foldrad med under
0,01 % för den handen. Tiderna inkluderar den lokala mottagaren och första
målade strategiraden i den paketerade appen på Intel Core i5-11300H och Electron
45.1.0. Första träffen laddade profildata i processen. Den andra återanvände
modulen med en annan profil. Underlaget är syntetiska bordssnapshots, så
mätningen täcker mottagare och efteranalys. En ny faktisk Edgehand återstår.
[Windows-rådata](windows.json)

Gränserna har 95 % gemensam konfidens och gäller den bästa ensidiga
förbättringen i vardera modellens bettingträd. Modellerna antar likaviktade
lagliga hålkort vid beslutet och ingen rake. Frekvenserna hämtas ur den
arkiverade raden för den exakta kombinationen. Före export kontrolleras
modellens hash, manifestets hash, tabellens hash och antalet rader mot
träningsrapport och kvalificeringsunderlag. [Trevägskontroll](../chance-sampled-three-way-flop-2026-11-22/RESULTAT.md) · [Fyrvägskontroll](../four-way-flop-verification-2026-11-22/RESULTAT.md)

Fristående check- och betsvar samt fler brädor och stackstorlekar kräver andra
profiler. Inga profiler för fem och sex aktiva kvalificerade för samma krav.

```powershell
python -X utf8 scripts/export-qualified-flops.py
npm.cmd run build
npm.cmd test -- tests/hand-review.test.ts tests/decision-providers.test.ts tests/decision-raised-postflop-probe.test.ts --maxWorkers=2
python -X utf8 scripts/verify-hand-review.py 'artifacts/ten-second-windows/Poker GTO Advisor.exe' docs/evidence/qualified-flops-review-2026-11-22
```

Bygget och Windows-återspelningen passerade. 41 riktade tester passerade och
ett opt-in-prov hoppades över. Filerna för appen packades i det lokala
Windowsprovet med projektets ASAR-filer enligt avsnittet `build.files` i
`package.json`.
