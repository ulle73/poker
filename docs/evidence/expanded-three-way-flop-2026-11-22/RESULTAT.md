# Trevägsflop med större solvertabell

22 november 2026. Bygger vidare på `7515ccf` och [förra trevägsprovet](../raised-postflop-2026-11-22/RESULTAT.md). Samma modell används i jämförelsen. Tre aktiva, `Qh 8d 6h`, `Ah Kh` som efterfrågad handrad, alla kompatibla privata kombinationer likaviktade och check → bet 60 → raise till 180. Vid beslutet ligger 360 marker i potten. Menyn har fold, syn 180 och all-in till 360. Framtida gator ingår med samma betsätt som tidigare. Rangersammansättningen antas vid roten.

## Metod

En uttrycklig forskningsinställning höjer taket från 50 000 till 400 000 informationsmängder och ger en budget på högst nio sekunder till solvern. Outcome sampling kör antingen med tidigare översampling av hjältens utpekade hand eller med lika sannolikhet för alla kompatibla givar. Den tidigare metoden drar hälften av givar från hjältens hand eller dess färgisomorfa varianter och viktar tillbaka till rätt fördelning. External sampling provades med utvidgade gränser som tredje kandidat. Standardinställningarna för appens träningsmotor använder den tidigare budgeten och samplingen. [MCCFR](https://proceedings.neurips.cc/paper/2009/file/00411460f7c92d2124a67ea0f4cb5f85-Paper.pdf) · [VR-MCCFR](https://arxiv.org/abs/1809.03057)

Tidtagningen börjar när provet bygger spelpositionen och slutar när den frysta handraden kommer tillbaka. Minnesvärdet är högsta process-RSS dittills, inklusive Vitest. Täckningsprocenten avser spelade beslut i auditens simuleringar där en tränad genomsnittsstrategi fanns. Andra beslut använder profilens likafördelade reservval. Provsekvensen spelades lokalt i Windows med Node v24.19.0 och AMD Ryzen AI 7 350. [Node `process.resourceUsage()`](https://nodejs.org/download/release/v24.19.0/docs/api/process.html#processresourceusage)

Auditen fryser den färdigtränade profilen, hittar en alternativ handling per beslutsrad med 60 000 givar och använder därefter ett separat stickprov om 160 000 givar. Den ensidiga gränsen i bekräftelseproven använder empirisk Bernstein med 5 % total felrisk över de tre uppmätta varianterna under antagandet om oberoende givar. Det tidigare pilotprovet använde Hoeffding. I provet för alla säten gäller samma felbudget över de tre spelarna. Den granskade spelaren får ändra bara sitt första beslut på floppen när det nås. Valet får bero på egna hålkort och offentlig satsningshistorik. Den simulerade fortsättningen efter beslutet följer den frysta profilen. Alla givar ingår i medelvärdet, även de där spelaren saknar beslut på floppen. [Maurer och Pontil, sats 4](https://arxiv.org/pdf/0907.3740)

En sådan avvikelse ger en undre gräns för vinsten av en fullständig bästa respons. Godkännande kräver en oberoende övre gräns under 2,1 % av rotpotten för samtliga spelare i den definierade modellen.

## Resultat för den första handlingen vid roten

| Variant | Tid till handrad | Informationsmängder | Tränade fortsättningar | Uppmätt förbättring | Undre gräns |
|---|---:|---:|---:|---:|---:|
| [Tidigare outcome](../raised-postflop-2026-11-22/flop.json) | 0,78 s | 49 862 | 60,69 % | 9,77 % | 7,39 % |
| [Större outcome med översampling](flop-expanded-confirmed.json) | 7,36 s | 399 854 | 73,05 % | 2,55 % | 2,06 % |
| [Större outcome med jämn sampling](flop-uniform-confirmed.json) | 6,38 s | 399 854 | 74,18 % | 2,32 % | 1,84 % |
| [Större external sampling med jämn sampling](flop-external.json) | 9,00 s | 400 000 | 76,24 % | 0,48 % | 0,03 % |

Outcome-varianterna tränade alla 1 176 kombinationer vid roten utan avkortningar. Båda nådde tabellgränsen. De hade som mest runt 530 MiB RSS. External sampling nådde tabellgränsen och fick 107 328 passiva avkortningar till check eller syn under träningen. Det gör den olämplig som ersättning för solvern som måste täcka de lagliga fortsättningarna. Pilotkörningarna i [flop-expanded.json](flop-expanded.json) och [flop-uniform.json](flop-uniform.json) sparar de första mätningarna med den tidigare statistiska metoden.

## Första floppbeslutet för varje spelare

Outcome med större tabell och jämn sampling gav handraden efter 7,12 s i det [separata provet för alla säten](flop-uniform-all-seats.json).

| Spelare | Uppmätt förbättring | Undre gräns |
|---|---:|---:|
| Hjälten, som hade checkat | 2,17 % | 1,69 % |
| Spelaren som satsade | 1,39 % | 0,88 % |
| Spelaren som höjde | 0,34 % | 0,00 % |

Samtliga mått gäller en avvikelse på ett beslut. Auditen inkluderar drygt 105 000 givar där spelaren som höjde fick besluta igen på floppen. I övriga givar påverkar den alternativa strategin för den spelaren inget beslut.

## Fördjupat kvalitetsprov

Den fördjupade auditen använde **360 000 givar för att hitta en bättre första handling per hålkortskombination** och **240 000 nya givar** för att mäta skillnaden mot den frysta profilen. Konfidensgränsen för detta enskilda prov hade 5 % ensidig felrisk. Samma outcome-inställning tränade 399 854 informationsmängder under 240 740 iterationer. Handraden kom efter **7,42 s**, och **74,26 %** av de simulerade besluten efter roten hade tränade rader. Själva kvalitetsauditen kördes efteråt och tog 51,60 s. [Rådata från det fördjupade provet](flop-uniform-deep.json)

Att ändra bara hjältens första beslut gav **3,64 %** av rotpotten i skattad förbättring, med **3,33 %** som statistisk undre gräns. Därmed överstiger den bästa ensidiga avvikelsen provgränsen **2,1 %** även utan att förbättra senare beslut. **Trevägsfloppen är underkänd på kvalitet.** Beslutskedjan från Windows-vyn och verklig liveavläsning återstår för en kvalificerad kandidat. Senare gator och fler spelare väntar på att floppen passerar båda kraven.

Nästa kandidat behöver bättre värden i fortsättningen, särskilt i de beslut där tabellgränsen lämnar otränade rader. Pröva en förberäknad profil för samma ranger och satsningsträd med en oberoende övre gräns för varje spelares bästa ensidiga avvikelse. Då kan träning och certifiering köras separat från leveransen av handraden.

## Kör om bekräftelseproven

```powershell
$env:POKER_RAISED_POSTFLOP_PROBE='1'
$env:POKER_RAISED_POSTFLOP_STREET='flop'
$env:POKER_RAISED_POSTFLOP_EXPANDED='1'
Remove-Item Env:POKER_RAISED_POSTFLOP_ALL_SEATS -ErrorAction SilentlyContinue
Remove-Item Env:POKER_RAISED_POSTFLOP_DEEP_AUDIT -ErrorAction SilentlyContinue
foreach ($p in @(
  @{Name='flop-expanded-confirmed';Share='0.5';Mode='outcome'},
  @{Name='flop-uniform-confirmed';Share='0';Mode='outcome'},
  @{Name='flop-external';Share='0';Mode='external'}
)) {
  $env:POKER_RAISED_POSTFLOP_HERO_SHARE=$p.Share
  $env:POKER_RAISED_POSTFLOP_SAMPLING=$p.Mode
  $env:POKER_RAISED_POSTFLOP_OUTPUT="docs/evidence/expanded-three-way-flop-2026-11-22/$($p.Name).json"
  npm.cmd test -- tests/decision-raised-postflop-probe.test.ts
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```

```powershell
$env:POKER_RAISED_POSTFLOP_PROBE='1'
$env:POKER_RAISED_POSTFLOP_STREET='flop'
$env:POKER_RAISED_POSTFLOP_EXPANDED='1'
$env:POKER_RAISED_POSTFLOP_SAMPLING='outcome'
$env:POKER_RAISED_POSTFLOP_HERO_SHARE='0'
$env:POKER_RAISED_POSTFLOP_ALL_SEATS='1'
Remove-Item Env:POKER_RAISED_POSTFLOP_DEEP_AUDIT -ErrorAction SilentlyContinue
$env:POKER_RAISED_POSTFLOP_OUTPUT='docs/evidence/expanded-three-way-flop-2026-11-22/flop-uniform-all-seats.json'
npm.cmd test -- tests/decision-raised-postflop-probe.test.ts
```

```powershell
$env:POKER_RAISED_POSTFLOP_PROBE='1'
$env:POKER_RAISED_POSTFLOP_STREET='flop'
$env:POKER_RAISED_POSTFLOP_EXPANDED='1'
$env:POKER_RAISED_POSTFLOP_SAMPLING='outcome'
$env:POKER_RAISED_POSTFLOP_HERO_SHARE='0'
Remove-Item Env:POKER_RAISED_POSTFLOP_ALL_SEATS -ErrorAction SilentlyContinue
$env:POKER_RAISED_POSTFLOP_DEEP_AUDIT='1'
$env:POKER_RAISED_POSTFLOP_OUTPUT='docs/evidence/expanded-three-way-flop-2026-11-22/flop-uniform-deep.json'
npm.cmd test -- tests/decision-raised-postflop-probe.test.ts
```
