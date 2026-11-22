# Strategitäckning och svarstid i Windows den 21 november 2026

## Det observerade bordet

I Windows-appens tillgänglighetsträd sågs aktiv anslutning och omväxlande en prefloptabell, väntan på egen tur, en storlek på 1 BB som saknade matchande linje, ofullständigt avlästa blinds och en flop som saknade strategi. Det exakta händelseförloppet bakom 1 BB gick inte att återskapa från den observationen. I det installerade ART-biblioteket har alla fem öppningspositioner enbart RFI. 40 BB-biblioteket har dessutom en syn för en oöppnad liten blind. En annan spelares limp kan därför sakna fortsättning.

Den inskickade bilden visar K♦ 7♣ på K♥ A♣ J♣. Pott 0,09 EUR, två aktiva, spelaren på knappen har 2,18 EUR och motståndaren 1,71 EUR. Gratis check och satsning finns. Ingen fullständig bettinghistorik eller motståndarrange framgår. Ett separat återspelningsprov återskapar dessa synliga fakta i Windows-appen. Appen visar handkategori, 193 starkare, 6 lika och 882 svagare tvåkortskombinationer samt valen check och satsning. En strategi som rangordnar de två valen för detta läge saknas. Fullständig rangemodell eller satsningsfrekvens kan inte utläsas från equity.

## Tillgängliga beslutsmodeller för vanlig Hold’em

| Gata | 2 aktiva | 3–6 aktiva | Modell och begränsning |
|---|---|---|---|
| Preflop | Tabell i matchande linje | Tabell i matchande linje | 2–6 utdelade och säker blindpostning, position, stack och observerad actionordning. RangeConverter 40 BB (30–50 BB verklig effektiv stack) och ART/GTO 100 BB (50–150 BB när tillämpligt), kortare bord mappas till sena positioner i sexmax. Matchningsavvikelser redovisas. Ej generell täckning för limp, squeeze eller avvikande storlek. |
| Kort preflop | Två utdelade, HoldemMath 4–20 BB, närmaste publicerade djup | Exakt sex utdelade, alla lika djupa, 4/6/8/10/12/15/20 BB | Push/fold, utan ante, öppna först eller möt en ensam shove. Sexmaxmodellen har högst en synare. Alla preflopresultat är källmärkta referenser utan oberoende felgräns. |
| Flop | Exakt avslutande all-in för två utdelade när syn eller fold har strikt högre chip-EV mot varje möjlig motståndarhand | Öppet spel saknar strategi | Prövning av 1 081 händer och 990 återstående brädor per hand, utan rake. Check mot satsning och fortsatt spel saknar kvalificerad motor. |
| Turn och river | DCFR i begränsat träd. Felmål 2 % av modellens startpott | Monker Free 10114 för 3–6, i matchande begränsat träd | HU utan bet, efter check eller mot en entydig bet (10–200 % pott eller all-in). Båda har redan satsat, höjningshistorik, sidoinsatser och olagliga chipstorlekar kan utesluta en lösning. Standard är fulla antagna HU-ranger eller användarens indata. |
| Turn och river med flera spelare | — | Oöppnat, tidigare checkar, eller entydig bet med matchade tidigare syner | 50 % av potten och höjning vid beslutet, begränsade all-in-fortsättningar. Standard är topp 50 % för hjälten och fulla motståndarranger. Hand utanför vald range eller oklar sidopott/höjning ger inget råd. De breda proven fick okänd felgräns. 2,1 % är endast ett mål tills ensidig EV-vinst har verifierats för varje spelare. |

6+ har separat evaluator och TexasSolver på kvalificerad heads-up-river. Equity med motståndarranger i livevyn gäller 52-korts Hold’em. Referenser och beräknad equity har egna etiketter. Spel med flera aktiva händer delar potten vid lika showdown.

## Tid från mottagen hand till synligt beslut

Intel Core i5-11300H, åtta logiska processorer, 15,7 GiB RAM, Windows build 26200 och Electron 45.1.0. Varje fall startar en separat paketerad app och privat mottagare. Kall avser app- och solverprocessen efter att fönstret har laddats. Windows filcache nollställdes inte. Varm använder nytt hand-ID med exakt samma modell, bräda och belopp i samma process. Detta testar återanvändning. Nya brädor och ranger kan kräva en ny beräkning.

Tid i ms anges **kall / varm**. Från bridge-serverns tidsstämpel fram till avläst synlig rekommendation för rätt hand, renderingsram, fönsterbild och förnyad kontroll av nyckeln. Den dolda testmiljön kan lägga till upp till ungefär en bildrutetakt i bakgrunden. En observation per läge och temperatur, ingen percentil eller garanti. Ett saknat råd räknas aldrig som en kort svarstid.

| Aktiva | Preflop | Flop | Turn | River |
|---|---:|---:|---:|---:|
| 2 | 1184 / 71 | 1145 / 1061 | 3260 / 69 | 1260 / 71 |
| 3 | 1497 / 1060 | saknas / saknas | 10524 / 134 | 6437 / 84 |
| 4 | 1217 / 77 | saknas / saknas | 7304 / 69 | 6287 / 67 |
| 5 | 1233 / 83 | saknas / saknas | 6331 / 133 | 6231 / 77 |
| 6 | 1238 / 52 | saknas / saknas | 8352 / 75 | 7315 / 148 |

6+ heads-up-river gav 3333 / 63 ms. Separata lägen efter check till spelaren gav 3212 / 161 ms på turn och 1292 / 63 ms på river. På motsvarande flop från skärmbilden visas vilka handlingar som är möjliga, utan GTO-råd. Rådata för alla fall finns i [final](final/) med exakt hand, bräda, potter, stackar, aktiva säten, källa och synliga strategifrekvenser. Kontrollera [flopprovet](final/flop-2.json) för avvisad avläsning, återkomst och inaktualitet. Aktuella råd doldes vid båda ogiltiga tillstånden.

Preflopfallen använder AA i en oöppnad pott och 0,01/0,02 i blinds. HU och sexmax använder 10 BB, övriga 40 BB. Det positiva tvåspelarfloppfallet använder A♥ K♥ på Q♥ J♥ T♥ mot all-in. Flervägsfallen använder K♥ 8♦, pott 0,80 och stackar 1,60. De tidigare filerna i huvudkatalogen är den första mätserien med två väntade bildrutor. Skillnaden i mätsätt hindrar direkt före/efter-jämförelse. Ett tidigare försök att fånga fönsterbilden alldeles för tidigt gav UnknownVizError. Det försöket räknas inte som ett beslut.

## Källor och förutsättningar

- HoldemMath, CC BY 4.0, versionslåst data för push/fold. [Datakälla](https://github.com/Julian-cloud-max/holdemmath-data/tree/7c72b1261f08c63cf8366120dc531631935c21cd)
- ART/GTO:s personliga träningsdata och RangeConverters 40 BB-referens laddas lokalt från de källkontrollerade installationerna. ART:s publika postfloppsexempel täcker en särskild BU–SB 3-bet-pott på K♥ J♥ T♥. [ART/GTO](https://artgto.com/gto-solutions/) · [RangeConverter](https://rangeconverter.com/downloads/6-max-40bb-Poker-Charts-No-Limit-Texas-Holdem-Cash)
- PokerNow-tränarens exempelbibliotek består av 60 typbrädor för 100 BB BTN-open mot BB-call. Ingen matchande verifierad strategi för handens djup, historik och ranger kunde fastställas. SolvePoker erbjuder ett gratis urval och betald komplett postflopåtkomst. Ingen tjänst köptes. [PokerNow-tränaren](https://github.com/RubberDucke825/PokerNow-Analysis-and-Trainer) · [SolvePoker](https://solvepoker.app/nlhe)
- Monker Free erbjuder turn och river. Den installerade b-inary-bryggan godtar fyra eller fem brädkort och har egen kontroll av minnesåtgång. Holdem Solver är inte kvalificerad för automatisk flopprådgivning. Ingen ny solverträning, autentiseringsändring eller försvagning av minnesskydd ingick. [Monker](https://monkerware.com/solver.html) · [Holdem Solver](https://holdemsolver.com/terms/) · [föregående flopgranskning](../../flop-shortstack-2026-11-07.md)

## Om verifieringen

Mätvärdena i [råfilerna](final/) gäller den paketerade lokala appen och syntetiska händer. Den befintliga Edge-sessionen användes dessutom för passiv observation av uppkoppling, vissa beslut och stopporsaker. Ingen spelhandling utfördes. Detta är inte en liveverifiering av varje gata, valuta eller spelplats. Ingen USB- eller portabel installerare testades i denna körning.

Den ordinarie rådgivaren stängdes normalt mellan beslut. Den nya binären under release/Poker-Advisor-Windows ägde sedan den lokala mottagarporten 47832. I dess tillgänglighetsträd lästes ”Live · uppdateras automatiskt” och ”Inväntar ditt nästa beslut.” Edge-sessionen återanslöt till den sparade parningen.
