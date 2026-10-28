# Multiway: resultat och kvarvarande strategigap

Kravet gäller hela bordet, oavsett antal spelare. Begränsningen till ett bord med exakt två upptagna säten var fel. Version 1.2 skiljer säten, synligt aktiva händer och observerade folds. Positioner beräknas runt dealerknappen; relativa postflop-positioner för två kvarvarande spelare fungerar även på större bord. Deltagande som är oklart avvisas vid strategiuttag.

## Levererat i appen

- Bordsmodell och positioner för 2–10 spelare, inklusive tomma säten och flyttad knapp.
- Minnet behåller observerade folds under samma hand när handlingsetiketten försvinner.
- Lokal showdown-equity för alla gator och 2–10 synligt aktiva spelare, med PHE 0.6.0, gemensam kortlek utan återläggning, delade potter, samplingfel och tydligt antagande om slumpmässiga motståndarhänder.
- 63 tester passerar. Native-flödet provar 3, 6 och 10 spelare med en royal flush på brädan; andelen blir 1/N. Equity presenteras aldrig som GTO eller som Fold/Call/Raise-frekvenser.

Detta gör inte den automatiska strategidelen färdig. Motståndarens privata kort kan inte läsas ur HTML. En GTO-strategi kräver en löst modell, ranger och rätt offentlig spellinje.

## Faktiskt undersökt flerpersonersmotor

[Zeta](https://github.com/lewismj/zeta) vid revision `acd8f042b1271cd16ecdff3c4fbd5f11105450e5` är en LGPLv3-motor med JSON-CLI. Den har byggts lokalt med isolerad portabel C++-verktygskedja. Den publika gränsen 7 höjdes experimentellt till 10 i källan och mallinstansieringen. Faktisk riverberäkning och artefaktvalidering har passerat för varje antal 2–10 med mycket små ranger. Binären är en forskningsartefakt under `.research/zeta/local-build/` och är inte inkopplad i appens live-råd eller paketerad som färdig motor.

| Spelare | Iterationer | Observerad tid, inklusive export |
|---|---:|---:|
| 3, två exakta händer per säte | 100 | 0,095 s |
| 3, samma scenario | 1 000 | 1,193 s |
| 3, samma scenario | 10 000 | 13,955 s |
| 6, en exakt hand per säte | 20 | 1,473 s |
| 8, en exakt hand per säte | 2 | 2,484 s |
| 9, en exakt hand per säte | 2 | 27,800 s |
| 10, en exakt hand per säte | 2 | 88,274 s |

Motorn räknar kortblockering mellan samtliga spelare i terminalerna, men enumereringen växer exponentiellt med bredare ranger. Sex helt öppna river-ranger ger ungefär 3,91×10^17 kompatibla givprofiler redan före upprepning över noder/iterationer. Denna implementation är därför ingen praktisk generell live-motor. Multiway preflop/flop/turn stöds inte. Exportens multiway-EV har dessutom approximativ normalisering, och numeriskt exploaterbarhetsvärde 0 måste ignoreras när `exploitability_available=false`.

## Oberoende verifiering av en verklig trepersonersstrategi

För ett avgränsat check/all-in-riverspel med två specificerade händer per spelare har en separat JavaScript-oracle byggts. Den använder egen handvärderare och egna potter/handlingar, enumererar sex kompatibla givprofiler och beräknar bästa ensidiga avvikelse för varje spelare. Den får inte se motståndarkorten när den väljer handling. Resultatet dubbelkontrolleras med full enumeration av rena informationsmängdsstrategier.

Efter 10 000 iterationer är summan av bästa ensidiga förbättringar **0,020069 chips**, eller **0,011149 % av startpotten**. Största enskilda förbättring är **0,006212 % av potten**. Profilens EV summerar till noll. Detta är ett verkligt uppmätt litet Nash-gap i just den lilla modellen, inte en garanti för hela NLHE.

Kör om med `node scripts/verify-multiway.mjs`. Indata och solverprofil finns i `docs/evidence/multiway-3p-spot.json` respektive `multiway-3p-solution.json`. Denna kontroll använder inte motorns exporterade EV eller dess regretvärde som facit.

## Andra kontrollerade alternativ

[MonkerSolver Free](https://monkerware.com/solver.html) erbjuder multiway turn/river men någon verifierad automatisk CLI/API-integration hittades inte. [Simple 3-Way](https://simplepoker.com/en/Solutions/Simple_3-way) erbjuder trepersoners river, med samma integrationsfråga och en trepersonersgräns. [OpenSpiel](https://github.com/google-deepmind/open_spiel) har spelrepresentation för fler spelare men är ingen färdig tränad NLHE-policy för detta bord.

## Vad som återstår för automatiska beslut

En praktiskt användbar, verifierad flerpersonerspolicy över alla gator; automatisk rangeuppdatering genom handens faktiska handlingar; komplett och ordnad handrekonstruktion; mappning av sajtens lagliga sizing och chipavrundning; samt verifiering mot riktiga anonymiserade hela händer. Dessa luckor får inte döljas med enbart equity, LLM-svar eller en heads-up-strategi använd på en multiway-pott.
