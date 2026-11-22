# Leveransplan för Poker GTO Advisor

Uppdaterad 22 november 2026. Det här är arbetslistan för nästa AI och för granskning av vad appen faktiskt klarar. [Projektloggen](../PROJECT_LOG.md) sparar testkommandon och tidigare försök.

## Målet

En Windows-app för träning i vanlig No-Limit Texas Hold’em med låtsaspengar. Efteranalysen ska automatiskt visa det bäst underbyggda beslutet för varje komplett och giltigt läge med **2–6 spelare**, från preflop till river. Vid Svenska Spels bord frigörs handen som standard efter tre observerade handbyten. Analysen av hand 1 blir tillgänglig när hand 4 börjar.

- Läs SEK- och EUR-bord och återskapa kort, positioner, stackar, pott och exakt satsningsföljd. Preflop räknas efter antal utdelade. Postflop räknas efter antal kvar, med hänsyn till vem som foldade och när.
- Täck första beslut, check till hjälten, satsning, höjning, återhöjning och avslutande samt övriga all-in-lägen. Prioritera vanliga floppar och relevanta korta cashgamestackar.
- Visa lagliga drag, insatsbelopp, frekvenser, källa och kvalitetsstatus. Visa gjord hand, starkare/lika/svagare lagliga tvåkortskombinationer och equity mot märkta ranger när underlaget räcker.
- Visa komplett råd inom **10 sekunder** från att det kompletta beslutet är tillgängligt i efteranalysen. Om källa, underlag eller tid saknas ska appen ge ett tydligt besked och dölja inaktuella råd. Använd kostnadsfria, tillåtna källor.

## Nästa uppgift

**FL-01 — Trevägsflop när det checkats till hjälten.** Börja med att frysa ett representativt, komplett läge från en avläst eller syntetiskt återspelad hand. Använd ett läge där check och bet är lagliga. Kontrollera om en tillåten källa täcker samma bräda, pott, stackar, turordning, actionhistorik, ranger och regler. Vid träff, anslut källan till efteranalysen och återspela den matchande och en avvikande hand i Windows. Dokumentera det konkreta hindret om källan saknas. Gå då vidare till FL-02 eller ED-01, beroende på vilket underlag som finns.

**ED-01 kan köras parallellt** när en ny avslutad Edgehand finns. Syntetiska återspelningar räcker för att fortsätta utveckla och prova mottagaren under tiden.

## Prioriterad checklista

| ID | Delmål att leverera | Läget nu och vad som krävs |
|---|---|---|
| FL-01 | Trevägsflop efter check | **Nästa.** Visa check och modellens betstorlekar med frekvenser för ett matchande läge. |
| FL-02 | Trevägsflop mot första bet | **Öppen.** Visa hur fold, syn och eventuell höjning fördelas i källan, med exakta belopp. |
| FL-03 | Samma check- och betlägen för fyra, fem och sex aktiva | **Öppen.** Prova och dokumentera varje spelarantal och linje för sig. |
| FL-04 | Flop efter bet → raise, därefter reraise | **Delvis.** Tre och fyra aktiva har ett matchat beslut efter check → bet → raise. Kvalificera fem och sex separat. Lägg till fler roller, brädor, stackdjup och en verifierad fortsättning efter återhöjning för varje relevant spelarantal. |
| FL-05 | Första floppbeslutet samt fler tvåmannapotter | **Delvis.** Befintlig BTN–BB-modell täcker vissa 100 BB-lägen. Utöka till 2–6 aktiva för första beslutet och fler positioner, historiker och stackdjup för heads-up. |
| ED-01 | Nya verkliga avslutade Edgehänder i EUR och SEK | **Öppen.** Bekräfta att händer frigörs vid rätt handbyte, att underlaget matchar indatan och att täckta lägen ger rätt råd. Dokumentera även avbrott, omstart och anslutning mitt i handen. |
| PF-01 | Komplett preflop för 2–6 utdelade | **Delvis.** Referenstabeller finns för valda positioner, stackar och linjer. Prioritera vanlig kortstack, limps, öppning, syn, squeeze, 3-bet, 4-bet och all-in med lika och olika stackar. |
| PO-01 | Turn och river för 2–6 aktiva | **Delvis.** Matchande heads-up-träd finns. Verifiera flervägsprofiler, bind ranger till tidigare handlingar och återspela check, bet, raise och reraise på båda gatorna. |
| AI-01 | Övriga all-in och sidopotter | **Delvis.** Den entydiga avslutande synen eller folden är klar inom villkoren nedan. Återstår korta all-in, återöppnad satsning, spelare med beslut kvar, sidopotter och olika behörigheter. |
| UI-01 | Läsbar efteranalys och handstyrka för hela flödet | **Delvis.** Kontrollera lagliga drag, belopp, frekvenser, antaganden, gjord hand, kombinationer och equity på varje relevant gata. |
| QA-01 | Sammanhängande Windows-slutprov | **Öppen.** Återspela varje spelarantal, gata och stödd bettinglinje med korta och djupa stackar. Mät kallt och varmt i SEK och EUR. Prova ogiltig historik, gammalt läge, timeout och handbyte. |

### Bekräftade delmål

- [x] Automatisk frigivning efter tre handbyten i den paketerade Windows-appen. [Syntetiskt Windows-prov](evidence/hand-review-2026-11-22/RESULTAT.md)
- [x] En trevägs- och en fyrvägsflop efter check → bet → raise ger matchade handlingsfrekvenser i ordinarie efteranalys inom 10 sekunder. [EUR- och SEK-proven](evidence/qualified-flops-review-2026-11-22/RESULTAT.md)
- [x] Matematiskt avgjord avslutande syn eller fold på flop, turn och river i entydig pott när samma val är strikt bättre för alla kompatibla motståndarhänder. [Villkor och prov](evidence/gto-coverage-2026-11-22/RESULTAT.md)

## Flop – täckning per beslut

**Modellträff** betyder att appen har viss täckning och att bräda, stackar och historik behöver matcha. **Öppen** betyder att ett generellt svar för den beslutstypen fortfarande saknas.

| Läget på floppen | 2 kvar | 3 kvar | 4 kvar | 5 kvar | 6 kvar |
|---|---|---|---|---|---|
| Första beslutet | BTN–BB-modell | Öppen | Öppen | Öppen | Öppen |
| Checkat till mig | BTN–BB-modell | Öppen | Öppen | Öppen | Öppen |
| Jag möter första bet | BTN–BB-modell | Öppen | Öppen | Öppen | Öppen |
| Jag möter en höjning | BTN–BB-modell | En modellträff | En modellträff | Öppen | Öppen |
| Jag möter en återhöjning | Öppen | Öppen | Öppen | Öppen | Öppen |
| Avslutande all-in | Avgörbara fall | Avgörbara fall | Avgörbara fall | Avgörbara fall | Avgörbara fall |

De två flervägsträffarna gäller Q♥ 8♦ 6♥ och färgisomorfa brädor, med 36 BB bakom vid floppstart, 12 BB i startpotten, bet 6 BB och raise till 18 BB. Trevägsprovet tog 176 ms och fyrvägsprovet 107 ms från frigivning i den paketerade appen. [Modeller, villkor och Windows-prov](evidence/qualified-flops-review-2026-11-22/RESULTAT.md)

## När ett delmål får bockas av

1. **Modell och kvalitet.** Spara källa och villkor för kort, säten, stackar, pott, ranger, rake och satsningsträd. Märk tabellreferens och strategi med okänd felgräns enligt deras kvalitet. För verifierade strategier gäller projektets oberoende gräns i det matchade trädet, 2 % för heads-up och 2,1 % per säte för flerväg.
2. **Funktion och tid.** Kör ett positivt och ett relevant negativt prov genom paketerad efteranalys. Kontrollera full handrad, korrekt belopp, källa och kvalitetsmärkning. Mät från frigivet komplett läge till synligt svar och spara kallt och varmt utfall med hårdvara och indata.
3. **Täckning och evidens.** Bocka av exakt det delmål som provet täcker. En profil i ett forskningsfönster kan markeras som kvalificerad modell. Ett syntetiskt Windows-prov kan markeras som fungerande appflöde. Markera en verklig Edgehand först efter ett separat sådant prov.
4. **Överlämning.** Uppdatera denna plan och projektloggen i samma ändring. Spara rådata och reproduktionskommando i `docs/evidence/`. Flytta **Nästa uppgift** när delmålet är uppnått. Vid delvis täckning, skriv vad som återstår på rätt rad och bryt ut ett avbockat delmål vid behov.

## Tidigare flervägsprov för check → bet → raise

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
- [x] Kvalificera den sparade fyrvägsfloppen. Oberoende övre gränser är 2,08548 %, 1,86720 %, 2,09720 % och 1,70790 % av potten, avrundade uppåt. Första handraden visades efter 0,43 s i Windows-forskningsfönstret. [Omprov och rådata](evidence/four-way-flop-verification-2026-11-22/RESULTAT.md)
- [ ] Kvalificera femvägsfloppen för alla säten. Profilen med 1,6 miljoner träningsgivar klarade fyra av fem säten. Höjarens övre gräns i tätaste slutförda provet är 2,16816 %. Första hela handraden visades efter 0,166 s i Windows-forskningsfönstret. [Träning och omprov](evidence/five-six-way-flop-verification-2026-11-22/RESULTAT.md)
- [ ] Kvalificera sexvägsfloppen. Den äldre profilen underkändes när en laglig avvikelse gav en undre gräns på 2,52945 %. Profilen med 460 000 givar visades efter 0,844 s i Windows-forskningsfönstret. Två oberoende övre gränser var 6,01241 % och 3,65137 %. [Träning och omprov](evidence/five-six-way-flop-verification-2026-11-22/RESULTAT.md)
- [ ] Få oberoende övre gräns under 2,1 % för varje säte på femvägsturn, sexvägsturn och sexvägsriver. Femvägsturn har ett godkänt säte i tätare prov. Sexvägsriver behöver en snävare gräns eller en starkare profil.
- [x] Matcha tre- och fyrvägsfloppens kvalificerade profiler i ordinarie efteranalys. Windows-proven gav 176 ms respektive 107 ms från frigivning. Kvarvarande turn- och riverprofiler följs under PO-01. [Windows-prov](evidence/qualified-flops-review-2026-11-22/RESULTAT.md)
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
| Vanlig flop, 3–6 aktiva | Tre- och fyrvägsprofil efter check → bet → raise visas automatiskt på matchande bräda, linje, stackar och pott. Gemensam övre gräns i modellerna är 1,967 % respektive 2,098 % av potten. | Fler brädor, första beslut, checkat fram, första bet, andra storlekar, andra ranger och verifierade flopprofiler för fem och sex aktiva. [Windows-prov](evidence/qualified-flops-review-2026-11-22/RESULTAT.md) |
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
