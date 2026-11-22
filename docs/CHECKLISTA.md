# Checklista för Poker GTO Advisor

Uppdaterad 22 november 2026 för No-Limit Texas Hold’em med 52 kort och **2, 3, 4, 5 eller 6 spelare inklusive hjälten**. Med aktiv menas kvar i potten. En pott med två kvar efter fyra foldar behöver annan historik och andra ranger än en giv där bara två spelare fick kort.

Vid Svenska Spels bord visas strategianalysen automatiskt i **Live · Edge → Automatisk efteranalys**. Grundinställningen är tre observerade handbyten. Medan hand 4 pågår visas analysen av hand 1. En ny läsare eller ett mottagningsavbrott på minst fem sekunder startar en ny kö. Avslutade händer sparas i minnet under sessionen. [Windows-prov 22 november](evidence/hand-review-2026-11-22/RESULTAT.md)

## Checklista för full täckning

- [ ] **Bordsläsning och historik.** Återskapa turordning, stackar, blinds, insatser, foldar och minsta lagliga återhöjning genom hela handen. Avstäm startpott, huvudpott, sidopotter, återlämnade marker och rake där det gäller. Prova anslutning från ny giv och mitt i en hand, samt omstart och avbrott.
- [ ] **Preflop för 2–6 utdelade.** Kvalificera strategier för varje antal och position, med både lika och olika stackar. Täck oöppnat, limp, syn, öppning, 3-bet, 4-bet och senare återhöjningar inklusive squeeze och all-in. Dagens referenstabeller täcker valda djup och linjer.
- [ ] **Flop för 2–6 aktiva.** Utöka tvåspelartäckningen bortom befintlig BTN–BB-modell. Kvalificera vanlig flervägsflop separat för 3, 4, 5 och 6 aktiva. Prova första beslut, checkat fram, bet, bet–raise, reraise och all-in med beslut kvar.
- [ ] **Turn och river för 2–6 aktiva.** Kvalificera samma bettinglinjer som på floppen, inklusive flera syner, check–raise, reraise och stackberoende storlekar. Visa en mätbar felgräns för flervägsstrategin. Matcha ranger från den föregående linjen genom alla gator.
- [x] **Avslutande all-in efter preflop i entydig pott.** Matematiskt avgjord syn eller fold på flop, turn och river när samma val är strikt bättre för alla kompatibla motståndarhänder. Täckning och gränser framgår nedan.
- [ ] **Övriga all-in.** Prova korta all-in och när flera korta höjningar återöppnar satsningen, olika stackar, tidigare foldar, potter med flera behörighetsnivåer och situationer där andra spelare fortfarande kan agera. Lös rangeberoende syn/fold och strategi för egna all-in i det matchande spelet.
- [ ] **Strategikvalitet och storlekar.** Bind varje svar till exakt giv, spelare, ranger, pottregler och satsningsträd. Mät bästa ensidiga avvikelse oberoende. Redovisa förenklingar av kort och satsningsstorlekar, särskilt utanför modellens storleksmeny. Dagens HU-grind på 2 % av startpotten gäller det valda trädet. Ett tränat flervägssvar med okänd felgräns uppfyller inte kvalitetskravet.
- [ ] **Slutprov i Windows.** Återspela `2/3/4/5/6 × preflop/flop/turn/river × varje laglig bettinglinje` med både små och djupa stackar samt EUR och SEK. Kontrollera att handling och belopp matchar historiken, att svar visas inom tio sekunder från frigivet beslut och att gamla svar avvisas. Bekräfta efteranalys av nya verkliga avslutade händer separat.

### Flervägsprov för check → bet → raise

- [x] Återspela linjen och hämta rätt handrad med alla lagliga kombinationer i tre ranger på flop, turn och river.
- [x] Mät solverns svarstid. Flop 0,78 s, turn 0,52 s och river 3,87 s. Windows-kedjan återstår för en kvalificerad lösning.
- [x] Prova en trevägsflop med större solvertabell. Outcome med jämn sampling tränade 399 854 informationsmängder och gav handrad på 6,38 s i jämförelsen. Andelen tränade beslut i de simulerade fortsättningarna ökade från 60,69 % till 74,18 %.
- [x] Förberäkna samma trevägsflop och läs in den sparade modellen i en separat process. Alla 1 176 hålkortskombinationer kontrollerades. Första uppslaget från den nyuppackade kopian tog 7,98 ms och de följande tog högst 0,50 ms.
- [x] Ompröva den sparade strategin med en snävare oberoende övre gräns och lagliga motstrategier över hela trädet. Nya övre gränser är 12,81 %, 15,88 % och 15,55 %. De undre gränserna på nya givar är 5,99 %, 7,06 % och 6,59 % av potten. Strategin underkändes för alla tre.
- [x] Träna en ny profil för samma spel med sex miljoner givar och alla bettinggrenar. Alla 1 176 hålkort fick tränade rader vid beslutet. Ett separat forskningsfönster i Windows visade hela handraden efter 0,17 s vid det första uppslaget.
- [x] Kvalificera den förberäknade trevägsfloppen i den sparade modellen. Oberoende övre gränser med justering för omprov är 1,967 %, 0,624 % och 1,731 % av potten, avrundade uppåt. Första handraden visades efter 0,17 s i Windows-forskningsfönstret.
- [x] Kvalificera separata trevägsprofiler på turn och river. Högsta övre gräns var 0,298 % på turn och 0,380 % på river. Första handraden visades efter 0,14 respektive 0,20 s i Windows-forskningsfönstret. [Prov på turn och river](evidence/chance-sampled-three-way-turn-2026-11-22/RESULTAT.md)
- [x] Kvalificera fyrvägsturn, fyrvägsriver och femvägsriver i samma separata spelmodeller. Högsta övre gränser är 1,586 %, 0,839 % och 1,669 %. Första handraden visades på högst 0,15 s. [Prov med fyra till sex aktiva](evidence/chance-sampled-four-to-six-2026-11-22/RESULTAT.md)
- [x] Träna och återspela alla nio profiler för fyra, fem och sex aktiva över flop, turn och river. Hela handraden visades på högst 0,155 s i Windows-forskningsfönstret. [Träningsstorlek, tider och rådata](evidence/chance-sampled-four-to-six-2026-11-22/RESULTAT.md)
- [ ] Få oberoende övre gräns under 2,1 % för varje säte på fyrvägsflop, femvägsflop och femvägsturn samt alla tre sexvägsgator. Fyrvägsfloppen har två godkända säten. Femvägsturn har ett godkänt säte i tätare prov. Sexvägsriver behöver en snävare gräns eller en starkare profil.
- [ ] Matcha kvalificerade profiler mot den ordinarie Windows-appens exakta bettinghistorik, storlekar och ranger. Mät från att en avslutad hand frigörs till att den kompletta handraden syns i efteranalysen.
- [ ] Utöka till andra bettinglinjer, flera stackdjup och olika stackar. Verifiera hur ranger följer en och samma hand genom alla gator.

[Ny profil med träning över hela trädet](evidence/chance-sampled-three-way-flop-2026-11-22/RESULTAT.md) · [Oberoende omprov av föregående profil](evidence/frozen-three-way-flop-audit-2026-11-22/RESULTAT.md) · [Förberäknad profil och arkiv](evidence/precomputed-three-way-flop-2026-11-22/RESULTAT.md) · [Flop med större tabell](evidence/expanded-three-way-flop-2026-11-22/RESULTAT.md) · [Tidigare trevägsprov](evidence/raised-postflop-2026-11-22/RESULTAT.md) · [Tidigare källprov](holdemsolver-qualification-2026-11-08.md) · [Windows-prov](evidence/gto-coverage-2026-11-22/RESULTAT.md)

## Täckning i befintliga modeller

| Situation | Fungerar nu | Kvar |
|---|---|---|
| Bord i EUR | Liveanslutning observerad. Hela avläsningar och Windows-beslut återspelade. | Animerade kort, blandade valutor, saknade belopp eller oklara säten kan blockera ett strategiråd. |
| Bord i kr eller SEK | Hela bordets pott, stack och insatser testade för båda beteckningarna. Windows visar återspelade preflop- och riverråd i SEK. | Bekräfta en ny komplett hand på verkligt SEK-bord. Valuta som orsak till det tidigare avbrottet är obekräftad. |
| Preflop, 2–6 spelare | Källmärkta referenstabeller i matchande position, stackdjup och historik. Testade beslut vid alla fem spelarantal. | Utöka luckor i stackdjup, limps, squeezes och storlekar. Tabellerna saknar oberoende felgräns för ditt exakta bord. |
| Kort stack | HU push/fold för två utdelade vid 4–20 BB. Sex utdelade med lika stackar vid 4, 6, 8, 10, 12, 15 eller 20 BB och högst en synare i modellen. | Vanligt spel med små höjningar och syn, olika stackar samt 3–5 utdelade med kort stack har ingen generell kortstackstrategi. |
| Flop, två kvar i potten | Matchar automatiskt dina hålkort, bräda, position, synliga insatser och prefloplinje mot de 74 publicerade flopparna. Sex utdelade vid 100 BB, knappen öppnar till 2,5 BB och BB synar. | Andra modeller och oberoende verifiering av källans fulla strategi. |
| Vanlig flop, 3–6 aktiva | Den avslutade handen visar deltagande och handstyrka. Equity visas för den första analyserade floppen med kända indata. En sparad forskningsprofil med tre aktiva klarade 2,1 %-gränsen efter check → bet → raise i en avgränsad modell. | Matchning i ordinarie efteranalys och generella strategier för andra floppar, insatser, ranger och spelarantal. |
| Avslutande all-in på flop, turn eller river, 2–6 | Vid känd pott och alla utdelade kvar kan syn eller fold bevisas oberoende av ranger. Med 3–6 måste motståndarna vara all-in för samma belopp på gatan. En kortare syn räknar bara beloppet som hjälten kan vinna. | Ojämna flervägsinsatser, tidigare foldar, oklar pott och händer där gränserna tillåter båda valen. |
| Turn och river, 2 aktiva | Solverbeslut i matchande begränsade satsningsträd med 2 % felmål av modellens startpott. Färska Windows-exempel på båda gatorna. | Fler höjningslinjer, storlekar och sidoinsatser. Resultatet beror på antagna ranger och modellen utan rake. |
| Turn och river, 3, 4, 5 eller 6 aktiva | Monker visade beräknade träningsråd på båda gatorna för vart och ett av de fyra spelarantal som testades. | Oberoende felgräns för breda ranger och fler bettinglinjer. Hero utanför sin valda range eller oklar sidopott kan stoppa modellen. |
| Jag agerar först | Preflop finns öppningstabeller. I flopstudien kan du välja BB:s första beslut. På turn/river finns modeller för första beslutet. | Första beslut på flop utanför studiens modell. |
| Checkat till mig | Efteranalysen visade automatiskt frekvenser för check och satsning efter BB:s check i en matchande tvåmannapott. | Vanlig flervägsflop och tvåmannapotter utanför källträdet. |
| Någon har höjt före floppen | Källtabellen kan ge fold, syn eller ny höjning när den ursprungliga öppningen matchar modellen. | Öppningar eller tidigare syner som inte kan följas i trädet. |
| Höjning följd av återhöjning före floppen | Installerat källtest följde öppning och 3-bet till beslutet där 4-bet är möjlig. | Alla positioner, stackar, storlekar och squeeze-/flerhöjningslinjer täcks inte. |
| Höjd pott från preflop, nu på turn/river | Ett postflopråd kan gå att beräkna för den aktuella potten, stacken och angivna rangerna. | Härled inte verkliga motståndarranger från enbart en tidigare 3-bet. |
| Jag möter en satsning på turn/river | HU kan matcha en entydig bet på 10–200 % av startpotten eller all-in. Med 3–6 kan en entydig första bet och vissa efterföljande syner matchas. Separata trevägsprofiler efter bet och raise klarade 2,1 % på en turn- och riverbräda vardera i forskning. | Bet följd av raise/reraise på samma gata saknar generell, verifierad fortsättning i appen. |
| Oklart säte eller avbruten avläsning | Ett oklart säte kan ge en förklaring i den avslutade handens analys. Färskhet och handbyten kontrolleras i mottagaren. | Säkrare deltagandehistorik vid animationer och när läsaren ansluts mitt i handen. |
| Handstyrka och equity | Gjord hand och antal starkare/lika/svagare lagliga kombinationer för en motståndare på flop, turn och river. HU-equity kan räknas exakt, flervägsequity samplas mot märkta ranger. | Visa equity först när det finns tillräckliga indata. Handstyrka ensam bestämmer inte vilket drag som tjänar mest. |
| Svarstid | Tio sekunders beräkningsbudget per historiskt beslut. Windows-provet mäter från det handbyte som frigör handen tills resultatet är synligt. | Garanterade råd för samtliga händer, linjer och datorer. |

## Historiska Windows-prov den 21 november

Varje cell visar sekunder för kall respektive varm körning. Samma modell och kort återanvändes med ett nytt handnummer i den varma körningen. Ett värde är ett observerat råd för ett bestämt exempel. Flopprovet med två spelare är ett avslutande all-in. Kolumnerna för turn och river med 3–6 spelare innehåller träningsråd med okänd felgräns.

| Aktiva | Preflop | Flop | Turn | River |
|---|---:|---:|---:|---:|
| 2 | 1,46 / 0,05 | 1,16 / 1,07 | 6,20 / 0,07 | 1,15 / 0,05 |
| 3 | 1,18 / 0,07 | Saknar strategi | 6,26 / 0,07 | 6,18 / 0,07 |
| 4 | 1,17 / 0,07 | Saknar strategi | 5,29 / 0,13 | 4,20 / 0,06 |
| 5 | 1,14 / 0,07 | Saknar strategi | 5,33 / 0,14 | 4,19 / 0,05 |
| 6 | 1,16 / 0,07 | Saknar strategi | 7,32 / 0,10 | 5,23 / 0,12 |

Se [mätmetod, hårdvara och återspelad skärmbild](evidence/ten-seconds-2026-11-21/RESULTAT.md) samt [första genomgångens källor och stackdjup](evidence/windows-training-2026-11-21/RESULTAT.md).
