# Checklista för Poker GTO Advisor

Uppdaterad 22 november 2026 för vanlig 52-korts Hold’em i Windows. Med aktiv menas kvar i potten. Före floppen behövs dessutom uppgifter om alla som fick kort. En pott med två kvar efter fyra foldar har en annan historik än ett bord där bara två spelare fick kort.

Vid Svenska Spels bord visas strategianalysen automatiskt i **Live · Edge → Automatisk efteranalys**. Grundinställningen är tre observerade handbyten. Medan hand 4 pågår visas analysen av hand 1. En ny läsare eller ett mottagningsavbrott på minst fem sekunder startar en ny kö. Avslutade händer sparas i minnet under sessionen. [Windows-prov 22 november](evidence/hand-review-2026-11-22/RESULTAT.md)

| Situation | Fungerar nu | Kvar |
|---|---|---|
| Bord i EUR | Liveanslutning observerad. Hela avläsningar och Windows-beslut återspelade. | Animerade kort, blandade valutor, saknade belopp eller oklara säten kan blockera ett strategiråd. |
| Bord i kr eller SEK | Hela bordets pott, stack och insatser testade för båda beteckningarna. Windows visar återspelade preflop- och riverråd i SEK. | Bekräfta en ny komplett hand på verkligt SEK-bord. Valuta som orsak till det tidigare avbrottet är obekräftad. |
| Preflop, 2–6 spelare | Källmärkta referenstabeller i matchande position, stackdjup och historik. Testade beslut vid alla fem spelarantal. | Utöka luckor i stackdjup, limps, squeezes och storlekar. Tabellerna saknar oberoende felgräns för ditt exakta bord. |
| Kort stack | HU push/fold för två utdelade vid 4–20 BB. Sex utdelade med lika stackar vid 4, 6, 8, 10, 12, 15 eller 20 BB och högst en synare i modellen. | Vanligt spel med små höjningar och syn, olika stackar samt 3–5 utdelade med kort stack har ingen generell kortstackstrategi. |
| Flop, två kvar i potten | Matchar automatiskt dina hålkort, bräda, position, synliga insatser och prefloplinje mot de 74 publicerade flopparna. Sex utdelade vid 100 BB, knappen öppnar till 2,5 BB och BB synar. | Andra modeller och oberoende verifiering av källans fulla strategi. |
| Vanlig flop, 3–6 aktiva | Den avslutade handen visar deltagande och handstyrka. Equity visas för den första analyserade floppen med kända indata. | Kvalificerad strategi efter vanlig check, satsning eller höjning. |
| Avslutande all-in på floppen, 2–6 | Syn eller fold när samma val är strikt bättre för varje möjlig fördelning av hålkort. Med 3–6 måste alla utdelade vara kvar och alla motståndare all-in för samma belopp på floppen. | Ojämna flervägsinsatser, tidigare foldar, oklar pott och händer där gränserna tillåter båda valen. |
| Turn och river, 2 aktiva | Solverbeslut i matchande begränsade satsningsträd med 2 % felmål av modellens startpott. Färska Windows-exempel på båda gatorna. | Fler höjningslinjer, storlekar och sidoinsatser. Resultatet beror på antagna ranger och modellen utan rake. |
| Turn och river, 3, 4, 5 eller 6 aktiva | Monker visade beräknade träningsråd på båda gatorna för vart och ett av de fyra spelarantal som testades. | Oberoende felgräns för breda ranger och fler bettinglinjer. Hero utanför sin valda range eller oklar sidopott kan stoppa modellen. |
| Jag agerar först | Preflop finns öppningstabeller. I flopstudien kan du välja BB:s första beslut. På turn/river finns modeller för första beslutet. | Första beslut på flop utanför studiens modell. |
| Checkat till mig | Efteranalysen visade automatiskt frekvenser för check och satsning efter BB:s check i en matchande tvåmannapott. | Vanlig flervägsflop och tvåmannapotter utanför källträdet. |
| Någon har höjt före floppen | Källtabellen kan ge fold, syn eller ny höjning när den ursprungliga öppningen matchar modellen. | Öppningar eller tidigare syner som inte kan följas i trädet. |
| Höjning följd av återhöjning före floppen | Installerat källtest följde öppning och 3-bet till beslutet där 4-bet är möjlig. | Alla positioner, stackar, storlekar och squeeze-/flerhöjningslinjer täcks inte. |
| Höjd pott från preflop, nu på turn/river | Ett postflopråd kan gå att beräkna för den aktuella potten, stacken och angivna rangerna. | Härled inte verkliga motståndarranger från enbart en tidigare 3-bet. |
| Jag möter en satsning på turn/river | HU kan matcha en entydig bet på 10–200 % av startpotten eller all-in. Med 3–6 kan en entydig första bet och vissa efterföljande syner matchas. | Bet följd av raise/reraise på samma gata har ingen generell, verifierad fortsättning. |
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
