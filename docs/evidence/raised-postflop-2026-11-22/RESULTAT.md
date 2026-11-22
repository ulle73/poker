# Trevägsprov efter check, bet och raise

22 november 2026. Solver- och regelkod från `92ffa9b`. Den reproducerbara provkoden finns i [decision-raised-postflop-probe.test.ts](../../../tests/decision-raised-postflop-probe.test.ts).

## Spelläget

Tre aktiva på en vanlig 52-kortslek. Alla har 360 marker kvar före gatans första beslut. Startpotten är 120, minsta bet är 10 och rake ingår inte. Säte 0 checkar, säte 1 satsar 60, säte 2 höjer till 180. Turen återgår till säte 0 med 360 i potten och 180 att syna. Rotens handlingsmeny innehåller fold, syn och all-in till 360. Framtida gator spelas till terminal med 50 % pott som ordinarie bet- och höjningsstorlek, all-in som extra storlek och högst två höjningar per gata.

Brädorna är `Qh 8d 6h`, `Qh 8d 6h 2c` och `Qh 8d 6h 2c Js`. Exakt handrad efterfrågas för `Ah Kh`. Varje säte har samma likaviktade range av alla lagliga kombinationer, med kortkrockar uteslutna gemensamt. Det ger 1 176, 1 128 respektive 1 081 möjliga kombinationer per säte före blockering från de andras privata kort. Spelläget byggs separat på varje gata. Fördelningen är ett antagande vid beslutet och härleds inte från vad spelarna gjorde tidigare i handen.

## Tid och kvalitet

Svarstid mäts med `performance.now()` från att testet börjar bygga spelet tills den lokala solvern återlämnat den efterfrågade handraden. Mätningen inkluderar förberedelsen av beslutet och solverkörningen. Vitest-start, Windows-vyn, bordets avläsning och den efterföljande kvalitetsmätningen ligger utanför tiden. Sampling, kortgruppering och kontrollvariater hör till den befintliga forskningssolvern. [MCCFR](https://proceedings.neurips.cc/paper/2009/file/00411460f7c92d2124a67ea0f4cb5f85-Paper.pdf) · [VR-MCCFR](https://arxiv.org/abs/1809.03057) · [Node 24.19.0 perf_hooks](https://nodejs.org/download/release/v24.19.0/docs/api/perf_hooks.html)

Efter lösningen fryses hela genomsnittsstrategin. Auditen simulerar fortsättningen från varje lagligt rotval, med samma kort och delade slumptal mellan alternativen. Varje strategifråga får bara spelarens egna hålkort och den dittills synliga brädan. Den separata 5-av-7-evaluatorn rankar vid showdown. Auditen återanvänder reglerna och pottavräkningen från produkten. Den väljer en alternativ första handling per egen hålkortskombination med 60 000 simulerade givar och använder en separat sekvens om 160 000 givar för att mäta förbättringen mot den frysta strategin. Samma fortsättningsstrategi används efter båda rotvalen. Täckning betyder att en informationsmängd hade en genomsnittsstrategi efter träning. Otränade fortsättningar använder den frysta policyns likafördelade reservval.

Den undre gränsen använder Hoeffdings ensidiga olikhet, med 5 % total felrisk för de tre planerade proven under antagandet om oberoende simulerade givar. Rapporten delar förbättringen i förväntade marker med rotpotten på 360. Jämförelsevärdet 2,1 % är valt för detta prov och följer nivån i appens Monker-grind. En påvisad större förbättring i bara hjältens första beslut räcker för att underkänna profilen. För godkännande behövs en övre gräns för bästa ensidiga avvikelse över hela fortsättningen och alla tre spelare. [Hoeffding, 1963](https://doi.org/10.1080/01621459.1963.10500830) · [Monkers kvalitetsgrind i appen](../../../src/monker/config.ts)

## Utfall

Windows, AMD Ryzen AI 7 350 och Node v24.19.0. Varje rad kördes i en ny Vitest-process. Handraden för `Ah Kh` matchade den frysta strategins rad i alla körningar. Träningen använde inga passiva avkortningar till showdown.

| Gata och sampling | Handrad | Tränade kombinationer vid roten | Tränade beslut i auditens fortsättningar | Uppmätt förbättring | Undre gräns |
|---|---:|---:|---:|---:|---:|
| [Flop, outcome med kontrollvariater](flop.json) | 0,78 s | 1 176 / 1 176 | 60,7 % | 9,77 % | **7,39 %** |
| [Turn, outcome med kontrollvariater](turn.json) | 0,52 s | 1 126 / 1 128 | 59,2 % | 13,30 % | **10,91 %** |
| [River, outcome med kontrollvariater](river.json) | 3,87 s | 1 081 / 1 081 | 97,4 % | 5,26 % | **2,87 %** |
| [River, external sampling](river-external.json) | 0,25 s | 980 / 1 081 | 82,6 % | 19,53 % | **17,49 %** |

Alla fyra körningar klarade tio sekunder och underkändes på strategikvalitet. Flop och turn nådde tabellgränsen nära 50 000 informationsmängder inom en sekund. River med outcome sampling nådde sitt iterationstak på 200 000. Jämförelsen med external sampling på river nådde 5 000 iterationer och använde separata frön och en ensidig felrisk på 5 % för det provet. Auditen kördes efter mätningen av handraden och tog 20,33, 17,63, 4,21 respektive 3,58 sekunder.

Fyra till sex aktiva väntar på en trevägsflop som klarar båda kraven. Nästa kvalificering behöver en solver som tränar en större del av fortsättningen inom budget, eller en matchande förberäknad strategi med separat kvalitetsevidens. Prova verifieringen av bästa ensidiga avvikelse på det mindre riverträdet innan samma verifiering används på turn och flop. Windows-återspelning och nya livehänder ingick inte i detta prov.

## Kör om provet

```powershell
$env:POKER_RAISED_POSTFLOP_PROBE='1'
Remove-Item Env:POKER_RAISED_POSTFLOP_SAMPLING -ErrorAction SilentlyContinue
foreach ($street in @('flop','turn','river')) {
  $env:POKER_RAISED_POSTFLOP_STREET=$street
  $env:POKER_RAISED_POSTFLOP_OUTPUT="docs/evidence/raised-postflop-2026-11-22/$street.json"
  npm.cmd test -- tests/decision-raised-postflop-probe.test.ts
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```

```powershell
$env:POKER_RAISED_POSTFLOP_PROBE='1'
$env:POKER_RAISED_POSTFLOP_STREET='river'
$env:POKER_RAISED_POSTFLOP_SAMPLING='external'
$env:POKER_RAISED_POSTFLOP_OUTPUT='docs/evidence/raised-postflop-2026-11-22/river-external.json'
npm.cmd test -- tests/decision-raised-postflop-probe.test.ts
```
