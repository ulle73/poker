# Automatisk efteranalys från bordsläsaren

Windows-appen samlar avlästa beslut i den lokala mottagaren. I **Live · Edge** visas den senast frigivna handen automatiskt. Ett historiskt beslut behåller sitt handnummer, sina kort och sina insatser. Vid tre handbyten visas hand 2000 när 2003 börjar. Vid två byten skulle den visas när 2002 börjar. Räknaren följer observerade givar eftersom sajtens handnummer kan ha luckor.

Standardvärdet är `HAND_REVIEW_LAG = 3` i [hand-review.cjs](../../../electron/hand-review.cjs). Vid noll extra händer släpper mottagaren analysen när hjälten bekräftats foldad och handlingsknapparna försvunnit, eller när en giltig ny preflopgiv bekräftar att handen avslutats. Ändring i källfilen kräver ompaketering av Windows-appen. Händerna finns i arbetsminnet. En läsarväxling, omstart eller minst fem sekunder mellan mottagningar startar en ny kö. Varje hand rymmer högst 200 ändrade avläsningar. En full kö för en enskild hand ger statusen ofullständig historik. De sex senaste frigivna händerna med egna beslut är tillgängliga.

## Flop med två kvar

Efteranalysen använder samma 74 SHA-256-kontrollerade brädor som flopstudien. Den matchar samtliga sex startstackar om 100 BB, position, BTN:s öppning till 2,5 BB, BB:s syn, fyra foldar, exakt handkombination och den observerade följden av insatser. En enhetlig permutation av kortfärgerna tillämpas på både hålkort och bräda. Appen kontrollerar spelbara handlingar och avrundar källans belopp till bordets minsta marker vid matchning. Listade storlekar i strategiraden är källans BB-belopp. Ett känsligt antagande är att bordsläsaren hunnit se tillräckligt av preflophistoriken. Fel modell eller motstridiga uppgifter kan lämna beslutet utan referens. Källa och strategikvalitet beskrivs i [flopbibliotekets underlag](../flop-study-2026-11-21/RESULTAT.md).

## Återspelning i paketerad Windows-app

Ett isolerat mottagarprov skickade nio syntetiska händer via samma lokala HTTP-gränssnitt som tillägget använder. Provet öppnade Live · Edge och lät appen själv hitta och analysera händerna. Före frigivningen kontrollerades både den synliga vyn och att analysens interna läsanrop svarade 404. Tiden mäts från att provet skickar den utlösande givarens första avläsning till att rätt källa och resultat syns i vyn och Chromium har ritat två bildrutor. Första matchningen är den första analysen i en nystartad process. De följande mätningarna använder samma process. Tiden för de tre verkliga handbytena ingår inte.

- Hand 2000. K♥ 7♣ på A♣ K♦ J♣. Efter BB:s check visades check och satsning med källfrekvenser. Senare i samma hand kontrollerades svaret på höjningen.
- Hand 2001. BB möter en satsning. Raden för höjning till 10,96 BB kontrollerades i Windows.
- Händerna 2002–2005. Tre, fyra, fem och sex kvar med A♥ A♠ på A♣ A♦ K♣. För den öppna potten kontrollerades upplysningen om saknad källstrategi. Efter att alla motståndare satsat sina sista 0,40 EUR kontrollerades den matematiskt avgjorda synen.

[Handnummer, individuella tider, kort och faktisk UI-text](windows.json) · [Installerad pakethash och Windows-vy](installed.json) · [Desktopprov och layout](desktop-smoke.json) · [Riktade regressionstester](tests.log)

I slutkörningen gav de två HU-händerna synliga svar efter 304 respektive 200 ms från frigivningen. För tre, fyra, fem och sex spelare visades det styrkta all-in-svaret efter 1 459, 957, 968 respektive 1 049 ms. Samtliga 55 riktade tester passerade.

Ett andra prov använde den installerade utgåvan och mätte till och med en avläst bildruta. Varje spelarantal startade en ny process och fick därefter samma kort i en ny hand i varm process. Båda körningarna visade matematiskt styrkt syn mot de lika stora avslutande insatserna.

| Aktiva | Kall | Varm |
|---|---:|---:|
| [2](all-in/closing-all-in-flop-2.json) | 2 236 ms | 2 027 ms |
| [3](all-in/closing-all-in-flop-3.json) | 2 186 ms | 2 015 ms |
| [4](all-in/closing-all-in-flop-4.json) | 3 262 ms | 2 005 ms |
| [5](all-in/closing-all-in-flop-5.json) | 2 658 ms | 2 061 ms |
| [6](all-in/closing-all-in-flop-6.json) | 2 128 ms | 1 815 ms |

Maskinen körde Windows build 26200 och Electron 45.1.0 på Intel Core i5-11300H med åtta logiska processorer och 16 GB RAM. Provet verifierar den paketerade kedjan med återspelade avläsningar. En ny riktig Svenska Spel-hand ingick inte.

## Körkommandon

```powershell
$env:POKER_FLOP_TEST_DIR=Join-Path $env:APPDATA 'Poker GTO Advisor/flop-study'
$env:RAYON_NUM_THREADS='1'
$env:NODE_OPTIONS='--max-old-space-size=768'
npx vitest run tests/hand-review.test.ts tests/flop-study.test.ts tests/training-strength.test.ts tests/live-bridge.test.ts tests/decision-providers.test.ts tests/live-reader.test.ts --maxWorkers=1
npm run build
$exe='artifacts/ten-second-windows/Poker GTO Advisor.exe'
$out='docs/evidence/hand-review-2026-11-22'
python -X utf8 scripts/verify-hand-review.py $exe $out
$env:POKER_SMOKE_OUTPUT=(Resolve-Path $out).Path
Start-Process -FilePath $exe -WindowStyle Hidden -ArgumentList '--smoke-test' -Wait
./scripts/measure-decisions.ps1 -Executable 'release/Poker-Advisor-Windows/Poker GTO Advisor.exe' -Output "$out/all-in" -ClosingAllIn
```

Windows-provet kräver Python med Playwright och ett aktuellt paketerat exemplar av appen. Den isolerade testprofilen använder en temporär lokal mottagarport. Det frigivna resultatet representerar den historiska handen. Bred GTO-täckning för vanligt flopspel med 3–6 aktiva återstår.
