# Monker turn: uppmätt snabbare kedja, ännu ingen multiway-provider

Datum: 2026-11-07. Fulla 2–6-spelarmålet är **inte uppnått**.
Ingen Monker-provider har aktiverats i appen och inget nytt livebeslut har
verifierats. HU-motorerna och deras gränser har inte ändrats i detta arbete.

## Vald felgräns

Användaren delegerade valet efter att ha fått skillnaden mellan summamåttet
och individuell avvikelse förklarad. Jag valde **maximal ensidig EV-förbättring
för någon spelare ≤2 % av rotpotten**, ε-Nash i den kontrollerade modellen:

`100 × max_p(BR_p(policy_-p) − EV_p(policy)) / rootPot ≤ 2`.

Alla spelares fullständiga informationsmängdsbästa svar kontrolleras. Det är
inte en kontroll bara vid rotbeslutet. Summan NashConv rapporteras också,
men delas aldrig med spelarantalet för att godkänna en lösning. Definitionen
av ε-Nash är att ingen spelare vinner mer än ε på en ensidig avvikelse
([Asadi m.fl.](https://arxiv.org/abs/2508.15356)). Ingen ny 3–4 %-gräns
har införts trots användarens frihet att lätta kraven.

CLI `audit-file.mjs` har av reproducerbarhetsskäl kvar historisk standard
`nashconv`; kör uttryckligen `average max-unilateral` för den nya gränsen.
Fälten `qualityMetric`, `qualityErrorPct`, `nashConvPct`, `maxGainPct` och
`gains` skiljer måtten. Okänd kvalitet kan aldrig godkännas.

## Mätning som faktiskt nådde några sekunder

En uppvärmd Java17-process körde Monkers oförändrade numeriska FREE10114-kärna.
Varje rad började med **nollställda regrets och medelstrategier**. Endast JIT,
korttabell och process återanvändes. Åtta trådar, två sekunders begärd träning.

| Aktiva | Solve + avkodning | Exakt kontroll | Summa | Värsta spelarens förbättring | Godkänd ≤2 % |
| --- | ---: | ---: | ---: | ---: | --- |
| 3 | 2 408 ms | 39 ms | 2 446 ms | 0,355 % | Ja |
| 4 | 2 210 ms | 100 ms | 2 310 ms | 1,156 % | Ja |
| 5 | 2 278 ms | 225 ms | 2 503 ms | 1,932 % | Ja |
| 6, prov 1 | 2 586 ms | 501 ms | 3 088 ms | 4,019 % | Nej |
| 6, prov 2 | 2 573 ms | 545 ms | 3 118 ms | 3,061 % | Nej |
| 6, prov 3 | 2 479 ms | 546 ms | 3 025 ms | 3,529 % | Nej |

Tiderna summerar uppmätta solve+decode och kontroll i separata steg. De
inkluderar filskrivning men **inte** uppvärmning, Node-start, apptransport
eller rendering. Uppvärmningen tog 5,206 s och räknade en separat, kasserad
sexspelarstrategi. Ett fullständigt kallt trespelarprov via run-kernel.ps1 tog
**6,012 s** inklusive två JVM-starter, fil, avkodning, Node-start och kontroll,
efter kompilering och hashkontroll; det klarade 0,310 %.

**Modellen är smal:** Ks7d2c8h, rotpott4000, stack8000 per spelare (SPR2),
ingen rake, endast check/fold/call/all-in. Varje spelare har två parvalörer med
alla lagliga suitkombinationer: AA/QQ, KK/JJ, TT/99, 88/66, 55/44, 33/22.
På denna bräda blir antalen 12/9/12/9/12/9. Detta är kontrollmodeller, inte
härledda motståndarranger, en komplett NLHE-abstraktion eller stöd för
användarens godtyckliga bord. Resultaten får inte jämföras som en lika-modell-
speedup mot det äldre fullrangeprovet på14s.

Andra bevarade prov: kalla SPR2-fall klarade 3/4/5 spelare med
0,332/1,548/1,949 %. Sexspelarfallet missade med2,966 %. Fyra sekunders ny
sexspelarträning gav2,472 %, sex sekunder blev sämre (cirka5,91 %).
Medelstrategireset efter1s och en tråd förbättrade inte resultatet. Det finns
ingen observerad monotont avtagande felkurva att basera en tidsutfästelse på.

Efter användarens senaste ”fortsätt” mättes samma sexspelarmodell även som
ett sammanhängande jobb med sparade ensekunderskontroller. Sex på varandra
följande faser med åtta trådar gav maxfel
2,669/3,719/2,494/4,780/2,434/3,016 %. Samma PRNG-strömmar, regrets och
medelstrategier fortsatte mellan faserna; ingen reset eller blandning av
separata profiler gjordes. Alla sex checkpointar missade gränsen.

En kontrollerad trådjämförelse med 2 s, samma modell och ny strategi gav:
1 tråd 2,324 %, 2 trådar 2,600 %, 4 trådar 2,701 %, 8 trådar 3,594 %.
Tiderna för solve+decode+kontroll var 2,47–2,57 s efter uppvärmning.
Färre trådar gav alltså lägre fel i detta prov trots färre iterationer;
en specifik race-orsak är inte bevisad. En separat sammanhängande entrådskörning
gav vid 1–6 s maxfel 3,537/2,099/2,250/3,012/3,211/3,325 %.
Bästa checkpointen är fortfarande **över 2 %**. Aktuell regret-strategi
från sex undersökta arkiv gav 33,54–172,72 % och hjälpte inte heller.

## Vad som förbättrades och vad högt turnfel betyder

* **Processarbete:** den stora korttabellen återanvänds. I samma JVM sjönk
  förberedelsen till cirka28–349ms i de observerade proven, från cirka1,4–2s
  vid kall start. Till skillnad från GUI-batchen fungerar nu byte3→6→3 i samma
  numeriska process. Före rättning kraschade regressionsprovet med ett arrayfel.
* **Stopptid:** kernelns eget stoppvillkor används vid tidsgränsen i stället
  för att invänta hela145000-världarsbatcher. Tvåsekundersjobben slutade efter
  cirka2,01–2,03s beräkning. Workers har en extra hård join-gräns; uteblivet
  stopp ger inget exporterat godkännande. Detta är en studiehost, inte en
  färdig app-service med robust extern processtidsgräns och annulleringsprotokoll.
* **Exakt symmetri:** fulla parklasser på fyrfärgad turn kan i de verifierade
  fallen reduceras till valörer, med bibehållna klassmassor och rankchans.
  Ett trespelarfall med1296 gemensamma givningar och5,23s tidigare kontroll
  fick samma EV/bästa svar inom1e-8 med8 rankvärldar och kontroll på tiotals ms.
  En naiv representanthandsreduktion med konkret river gav däremot fel BR;
  det negativa försöket finns kvar. Produktionskontrollen kräver kompletta
  likaviktade parklasser, åtskilda valörer och suitinvarianta policybucketar.
* **Cache:** profilen visade omräkning av policy och kortnycklar. Policycache
  och delade terminalutbetalningar för identiska insatser/aktiva säten gav
  samma EV/BR. I det jämförda sexspelarfallet sjönk kontrollen från855 till536ms.
  Policiens informationsmängder slås inte ihop när bara utbetalningar återanvänds.
* **Orsakstest:** det äldre djupa trespelarfallet gav20,45 % förbättring för
  en spelare över hela turn+river. Att ändra bara turn enligt det kompletta
  bästa svaret gav−3,85 %, bara river+0,64 %. Det styrker en svaghet i den
  samverkande fortsättningsstrategin; det bevisar inte en ensam algoritmisk
  grundorsak. SPR50-kontrollerna är dessutom mycket djupare än SPR2-fallen.

## Topp50 % prövades också

Literal modellrange:

`33+,A2s+,K2s+,Q2s+,J4s+,T6s+,96s+,86s+,76s,65s,A2o+,K5o+,Q7o+,J7o+,T8o+,98o,T7o:0.25`

672 positiva fysiska kombinationer, viktad massa663/1326 =50 % före blockers.
Gränsklassen T7o har25 % vikt. Ordningen kommer från
[holdem-evals PokerStove-transkription](https://github.com/apometta/holdem-eval/blob/e0687e13ff0d780ec8134a33bdc17adfbc8fe606/src/PercentageToRange.cpp),
ISC. Det är ett uttryckligt startpriorval, inte en verifierad GTO-prefloprange.

Endast spelarens egen range begränsades i proven; motståndarna förblev fulla.
Alla3–6-spelarjobben gick att köra och exportera. Exakt kvalitetskontroll
överskred däremot budgeten4096 gemensamma givningar: **kvalitet okänd**.
Ett lägre iterationsmått eller ett prov mot några slumpade motståndarkort
ersätter inte kontrollen av fullständiga bästa svar. Rangen är inte aktiverad
i användarens app och motståndarnas händer har inte kapats för att få grönt.

## Reproduktion och överlämning

Källa: `scripts/monker-audit/MonkerCoreProbe.java`, `MonkerKernelBench.java`,
`MonkerCoreCheck.java`, `MonkerPolicyExport.java`, `policy-audit.mjs`,
`audit-file.mjs`, `run-kernel.ps1`, `crosscheck-payoffs.mjs`.
`MonkerCheckpointProbe.java` sparar en kontinuerlig beräkning efter varje
ensekundsfas. `MonkerKernelBench` accepterar ett fjärde argument `thread-sweep`
för jämförelsen 1/2/4/8 trådar. Kontrollfaserna är inte produktionsservicekod.

FREE10114-SHA256:
`f66d7f2b5d8b35393577a39abfc0325215f26dd5102355e1ae49be477318e652`.
Officiell handRanks.ser-SHA256:
`d927fac383d43d8743fa50b81e3684fcd26a900ee548ec4b38668ab9fe7a6fc5`.
Ingen vendorbinär/bytekod har ändrats. Den ursprungliga leverantörsbinären och
Java måste finnas lokalt; inga konton, köp eller licensspärrar har berörts.

Kommandon från C:\dev\poker (byt arbetsrot `<work>`):

```powershell
npx vitest run tests/monker-audit.test.ts tests/monker-pair-symmetry.test.ts --maxWorkers=1
javac -cp '<classes>;<runtime>\MonkerSolverFree.exe' -d <classes> scripts/monker-audit/MonkerPolicyExport.java scripts/monker-audit/MonkerCoreProbe.java scripts/monker-audit/MonkerCoreCheck.java scripts/monker-audit/MonkerKernelBench.java
# Kör numeriska Java-proven med arbetskatalog <runtime>:
java '-Djava.awt.headless=true' -cp '<classes>;<runtime>\MonkerSolverFree.exe' c.MonkerCoreCheck '<work>\spr2-pairs3-input.mkr' '<work>\spr2-pairs6-input.mkr' '<runtime>\MonkerSolverFree.exe' '<result>\repeated'
java '-Djava.awt.headless=true' -cp '<classes>;<runtime>\MonkerSolverFree.exe' c.MonkerKernelBench '<work>' '<runtime>\MonkerSolverFree.exe' '<result>\warm-matrix'
node scripts/monker-audit/audit-file.mjs '<result>\warm-matrix\job3-6p.json' '<result>\quality.json' average max-unilateral
node scripts/monker-audit/crosscheck-payoffs.mjs '<work>\payoff-model.json' '<work>\core-payoff.mkr.payoffs.json' '<result>\payoffs.json'
```

6300 terminalutbetalningar över84 kortfall matchade oberoende7kortsvärdering
exakt, maxdiff0. Röd/grön regression för det nya felmåttet är genomförd.
Ytterligare kontroll av sexspelarmodellen matchade **166320 utbetalningar
över72 kortfall exakt**, också maxdiff0. Kontrollerna gäller dessa modeller
och kortfall, inte alla möjliga Monkerinställningar.
Fixtures för3/4/6 spelare låser faktiska exporter; sexspelartestet visar att
NashConv/N skulle ge falskt godkänt när en spelare fortfarande kan vinna2,966 %.

Maskinläsbar matris: `docs/evidence/monker-turn-2026-11-07.json`.
Underlag: `docs/evidence/monker-turn-2026-11-07/` med råa MKR, små avkodade
modeller, kvalitetsrapporter, inputarkiv, warm-matris, profileringsresultat,
negativa försök och tester. `source-artifacts.json` anger hash/storlek och vilka
stora avkodningar som kan återskapas från sparade MKR. Första breda proven4–6
har ingen tillförlitlig tid efter ett loggvägsfel; därför mättesR2 separat.

Nästa tekniska blocker är skalbar oberoende felkontroll för breda ranger och
stabil sexspelarkvalitet i relevanta betträd. Därefter behövs en riktig
annulleringsbar service och bindning av hela modellen till snapshot: board,
aktör/turordning, insatser, stackar, ranger/vikter, rake och hela trädet.
Enbart trädhash eller en lyckad liten kontroll räcker inte. Att koppla in
smala fixture-ranger som om de motsvarade användarens bord skulle ge fel råd.
Det är därför ingen Monker-provider är påslagen. Ingen commit/push har gjorts.

Slutlig programkontroll: `npm test -- --maxWorkers=1 --reporter=dot` gav
376 godkända/13 överhoppade tester, 32 godkända/4 överhoppade filer, exit0.
`npm run build` och `git diff --check` gick igenom. Java-proberna kompilerades
och kördes på Windows med ovanstående verkliga utfall. Gröna programtester
ändrar inte de negativa kvalitetsresultaten eller den saknade appintegrationen.
