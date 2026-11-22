# Gratis solver för 2–6 spelare: granskning och AI-överlämning

Datum: 2026-11-04, Europe/Stockholm. Arbetskopia: `C:\dev\poker`, branch `codex/free-solver-providers`, utgångspunkt `e87cbc275b72757db16c6e3decaaf996db594e11`.

## Gällande beställning

Användaren vill nu ha **bästa möjliga implementation med gratis källa**, med möjlighet att senare välja en billig betald motor. Målet är 2–6 spelare på alla gator; fler egna solverexperiment är fortfarande stoppade. Inget köp eller abonnemang har beställts.

**Senaste implementation och integrationskontrakt:** [Gratis motor nu, valfri betalmotor senare](solver-integration.md). Den befintliga fria motorn har fått ett utbytbart providerlager; experimentella livebeslut är borttagna. Täckningen har inte utökats: HU turn/river i matchande träd. IkaSolver är nu granskad som möjlig betalkandidat för 199 USD engångsvis, inte som färdig eller kvalitetsverifierad anslutning.

Nedan bevaras tidigare granskningssteg. Deras generella förbud mot betalkandidater och beslutet att vänta med router är ersatta av senaste användarinstruktionen. Källornas täckningsluckor kvarstår.
## Tillägg: kombination av motorer för 2–6 spelare

En kombination är tekniskt möjlig, men de granskade delarnas förenade täckning är fortfarande otillräcklig för en verifierad helhet.

| Beslutsläge | Möjlig fri komponent | Verifieringsläge och lucka |
| --- | --- | --- |
| Preflop, 2–6 | GTOpen Preflop Lab / NoRegrets | GTOpen beskriver approximativ postflopfortsättning. NoRegrets saknar gratis förtränad leverans. Ingen kvalificerad preflopkälla vald. |
| Flop, två kvar | TexasSolver eller b-inary | Dokumenterade HU-postflopgränssnitt; inget av dem har nyintegrerats eller provkörts här. |
| Flop, 3–6 kvar | Ingen kvalificerad komponent funnen | Detta förblir ett direkt täckningshål. Tvåspelarsolver får inte användas genom att övriga motståndare slås ihop. |
| Turn, 3–6 kvar | MonkerSolver Free som möjlig separat komponent | Produktens all-player-påstående tillsammans med gratisversionens turn/rivergräns gör detta till en kandidat, inte verifierad automatisk integration. Export/API och faktisk drift måste styrkas. |
| River, 3–6 kvar | Zeta; alternativt MonkerSolver Free | Zetas dokumenterade multiwayriver omfattar upp till sju spelare. Det styrker funktionens existens, inte användbar fullrange-latens eller kvalitet för varje verkligt bord. |

Ny kontroll av [GTOpen](https://github.com/star7js/gtopen#what-the-results-mean) visar uttryckligen att preflop använder en approximativ fortsättningsmodell, att full multiway genom river inte löses och att postflop är heads-up. Det fyller därför inte luckan genom att kombineras med en riversolver.

Även en nedladdningsbar modell granskades: [CFR-NLHE-6max v0.6.0 modellkort](https://github.com/dberweger2017/CFR-NLHE-6max/blob/main/docs/releases/v0.6.0/MODEL_CARD.md). Trots reponamnet gäller modellerna tre spelare, lika 100 bb, utan rake/ante och begränsad satsningsmeny. Modellkortet redovisar uniform fallback och säger att Nash-konvergens inte är etablerad. Runtime rekommenderar 32 GB RAM; 16 GB anges inte som stödd fullmodellmiljö. Ursprunglig motorlicens är fortfarande olöst. Därför kvalificerar inte denna leverans för användarens krav. Ingen modell hämtades.

[NoRegrets releases](https://github.com/conorarmstrong/noregrets/releases) hade inga releaser vid denna kontroll. Detta kompletterar README:s uppgift om kommersiella förtränade modeller; det utesluter inte att andra distributionskanaler kan finnas, men någon gratis kvalificerad modell har inte identifierats.

### Nödvändigt överlämningskontrakt mellan motorerna

En eventuell framtida router måste välja efter **antal aktiva händer och gata**, inte bara bordets säten. Handhistorik, regler/rake, alla stackar och sidopotter, nådda ranger och kortblockering följer med. Komponenterna måste vara överens om chipenhet, beloppssemantik och tillåtna handlingar. Resultat från en annan abstraktion eller satsningsmeny behöver explicit modellmatchning.

Att varje delsolver konvergerar i sitt eget delspel bevisar inte att den sammansatta strategin är en jämvikt för hela handen. Preflop måste värdera den fortsättning som faktiskt används, och senare omlösningar behöver förenliga range-/värdegränser. Saknade data eller otäckt gren måste ge avslag. En kombination som återställer uniforma ranger eller gissar saknade spelgrenar skulle återskapa det ursprungliga kvalitetsfelet.

**Historiskt beslut, ersatt för providerlagret av senaste beställningen:** avvakta router tills nya källor är kvalificerade. Nu byggs gränssnittet kring den redan befintliga motorn; inga okvalificerade källor registreras. Bortfallet av spelare 7–10 löser inte preflop och multiwayflop. Kravet gratis + verifierbart + alla gator är fortfarande öppet. Inga nya experiment är genomförda.

Följande kandidattabeller bevarar den första tiopelargranskningen. Hänvisningar till tio där är historiska; aktuell omfattning och kombinationsbedömning står ovan.

## Slutsats och beslut

**Ingen granskad kostnadsfri kandidat har kunnat verifieras uppfylla hela kravet. Ingen integrationsklar ersättare är vald.** Detta är ett negativt granskningsresultat, inte ett bevis för att en sådan produkt aldrig kan finnas.

Skilj fyra olika saker: att källkod finns, att den kan köras med ett spelarantal, att den levererar en tillräckligt bra strategi i rätt modell och att resultatet går att hämta inom beslutstiden. Endast det första räcker inte. Fler iterationer, hög vinst mot svaga testmotståndare eller ordet GTO i produktnamnet styrker inte hela kravet.

## Kontrollerade gratisalternativ

| Kandidat | Vad primärkällan styrker | Varför den inte uppfyller beställningen |
| --- | --- | --- |
| NoRegrets | Publik MIT-kod för 2–6 spelare. Aktuell README anger att publik kod släpar cirka tolv månader och att förtränade strategier bara finns kommersiellt. | Ingen gratis färdig modell med styrkt 2–10-täckning. Fortsatt egen träning skulle återuppta experiment som användaren stoppat. |
| Zeta | Heads-up på flop/turn/river; multiway upp till sju spelare på river. CLI finns. | Saknar den efterfrågade multiwaytäckningen på preflop/flop/turn och stöd för tio i dokumenterad upstream. |
| TexasSolver | Gratis för personligt bruk enligt README, konsolprogram och JSON-export. Dokumenterat gränssnitt använder IP/OOP-ranger i ett postflopträd. | Ingen styrkt 2–10/all-street-täckning. README:s kommersiella integrationsvillkor måste dessutom redas ut om den någon gång väljs. |
| b-inary/postflop-solver | Öppen Rust-kod under AGPL; kortkonfigurationen innehåller exakt två ranger och en flop. | Heads-up postflop, ingen komplett preflop-/multiwaymotor. Fyra foldade spelare i bunching-stödet innebär inte sex aktiva spelare. |
| MonkerSolver Free | Gratisversion begränsad till turn/river. | Uppfyller inte alla gator. Fullversionen är betald och därmed bortvald. |

Primärkällor, lästa 2026-11-04:

- [NoRegrets README och Licensing](https://raw.githubusercontent.com/conorarmstrong/noregrets/main/README.md).
- [Zeta README](https://raw.githubusercontent.com/lewismj/zeta/main/README.md).
- [TexasSolver README](https://raw.githubusercontent.com/bupticybee/TexasSolver/master/README.md) och [konsolgränssnitt](https://raw.githubusercontent.com/bupticybee/TexasSolver/console/README.md).
- [b-inary README](https://raw.githubusercontent.com/b-inary/postflop-solver/main/README.md) och [CardConfig](https://b-inary.github.io/postflop_solver/postflop_solver/struct.CardConfig.html).
- [MonkerSolver produkt och gratisversion](https://www.monkerware.com/solver.html).

De offentliga sidorna är rörliga dokument, inte låsta revisionsbevis. Ingen ny binär eller modell har laddats ned eller provkörts i denna granskning. Den tidigare lokala NoRegrets-patchen gäller en annan låst revision; dess testresultat får inte tillskrivas aktuell upstream.

## Betalalternativ som granskades före gratisförtydligandet

Dessa är dokumenterade för att nästa AI inte ska upprepa förslagen. De är inte rekommendationer att köpa.

| Produkt | Listpris vid kontroll | Täckning och beslut |
| --- | --- | --- |
| MonkerSolver full | 499 EUR; skattehantering, licensperiod och integrationsrättigheter inte klarlagda | Leverantören anger valfritt spelarantal och alla gator. Explicit tio-spelarverifiering och automatisk all-street-export saknas i vår granskning. Bortvald: kostar pengar. |
| Simple Preflop Holdem | 250 USD för ett år, en dator | 2–10 spelare preflop. Uppfyller inte ensam alla gator; bortvald även på pris. |
| Simple 3-way | 249 USD för ett år, en dator | Tre spelare postflop; inte tio. Bortvald även på pris. |
| IkaSolver | Pris inte granskat när täckningsbristen konstaterats | Officiella sidan anger högst nio spelare. Uppfyller inte tio. |

Källor: [MonkerSolver](https://www.monkerware.com/solver.html), [Simple Preflop](https://simplepoker.com/en/Solutions/Simple_Preflop_Holdem), [Simple 3-way](https://simplepoker.com/en/Solutions/Simple_3-way), [IkaSolver](https://ikasolver.com/).

Monkers egen [FAQ](https://www.monkerware.com/faq.html) säger att full strategiexploaterbarhet inte kan beräknas med deras resurser och att prefloprangernas exploaterbarhet med optimal postflopfortsättning är okänd. Detta avsnitt gäller deras ranger; det är inte ett bevis för fel i varje individuell solve. [Abstraktionsbeskrivningen](https://www.monkerware.com/compare.html) visar att liknande händer grupperas. En etablerad numerisk solver är alltså inte samma sak som exakt löst obegränsad poker.

[Startguiden](https://www.monkerware.com/guide.html) anger att stora preflopträd kan behöva flera dagar. [Trädguiden](https://www.monkerware.com/trees.html) föreslår begränsade fortsättningsträd för att hålla resursbehovet nere. Sådana begränsningar får inte döljas som full multiwaytäckning.

[MonkerViewer](https://monkerware.com/viewer.html) bekräftar import av exporterade preflopranger. Det bekräftar inte maskinläsbar export av fullständiga postflopstrategier. Ingen dokumenterad publik solver-API/CLI hittades på de granskade produkt-, guide-, vy- och supportsidorna. Det betyder **okänt**, inte bevisat obefintligt. Produktlicens och sajtens regler för användning med öppen pokerklient måste kontrolleras för den avsedda integrationen; se [leverantörens villkor](https://www.monkerware.com/tos.html).

## Vad en faktisk integration kräver

Detta är ett tekniskt kravunderlag, inte en beställning av en ny implementation. Ingen leverantör uppfyller ännu inträdeskraven.

1. **En kostnadsfri leverans med tydliga rättigheter.** Exakt källrevision/binär och eventuell modell, licens, konfiguration och kvalitetsunderlag. Ingen betalnyckel, tidsbegränsad testperiod eller kommersiell blueprint får döljas i beroenden.
2. **Styrkt täckning.** Separat evidens för 2, 3, 4, 5 och 6 aktiva spelare på var och en av fyra gator. Bord med sex säten och bara två kvar är inte sex-spelarpostflop. Ojämna stackar, rake, blinds/ante, sidopotter och tillåtna handlingar måste ingå i den avsedda modellen.
3. **Ett dokumenterat gränssnitt.** CLI med strukturerad filutväxling, bibliotek eller lokal API. Det måste lämna kombinationsspecifika handlingsfrekvenser, lagliga belopp, EV med definierad referenspunkt och kvalitetsmått. Preflopdiagram eller skärmläsning av solverfönstret räcker inte som permanent integration.
4. **Full offentlig handrekonstruktion.** Nuvarande snapshots saknar ibland handens början, verklig blind och tidigare sidopotter. Återställ exakt handlingsordning och håll modellantaganden synliga. Ranger ska följa den lösta policyn genom observerade handlingar med korrekt kortblockering; inte återställas till uniform fullrange vid varje beslut.
5. **Matchning mot rätt lösning.** Bind resultat till spelarantal, positioner, startstackar, spelregler, rake, bräda och handlingshistorik. Handlingar utanför trädet kräver dokumenterad omräkning eller tydligt avslag. Närmaste stackdjup eller satsningsstorlek får inte omärkligt presenteras som exakt matchning.
6. **Ett separat processlager i Electron.** Ett framtida adapterlager kan kopplas från `src/decision/use-decision.ts` och `src/decision/client.ts`, med kontrakt i `src/decision/types.ts`. In- och utdata valideras. Tidsgräns, avbrott och hand-/generationsidentitet måste följa varje begäran. Källan får inte få kvalitetsstatus bara genom att sätta strängen `verified-gto`.
7. **Mätbar driftsättning.** Jämför adapterutdata med leverantörens egna exporter för samma modell, kontrollera chipbelopp och sena svar och dokumentera kvalitetsmåttets faktiska innebörd. En leverantörsjämförelse verifierar överföringen, inte självständigt matematisk optimalitet. Latens och minne mäts i den avsedda konfigurationen innan livefunktion utlovas.

Förberäknade strategier kan ge snabba uppslag endast inom sitt täckningsområde. En lösning för ett specifikt stackdjup och träd är inte en komplett databas för alla tänkbara bord. Största risken är att en importerbar gratis strategi saknas; adapterkod löser inte den luckan.

## Kostnad och lokal kapacitet

Budgetkravet är noll inköps-/abonnemangskostnad. Inga köp, kontakter med leverantörer eller molnjobb har genomförts. Öppen källkod kan ha noll licensavgift men kräver fortfarande lokal beräkning, lagring och integrationsarbete. Ingen total kostnad eller leveranstid kan verifieras innan en kvalificerad källa finns.

Lokal read-only-inventering: Intel Core i5-11300H, fyra kärnor/åtta logiska processorer, 15,7 GiB installerat RAM enligt Windows. Detta är inte ett benchmark. Det räcker inte som belägg för att hela tio-spelarträdet kan lösas inom beslutstiden. Monkers angivna minimum är 8 GB, men maxträd beror på minne och tid på CPU; minimum är inget prestandalöfte.

## Vad som gjorts och vad nästa AI ska göra

- Läst global/projektets AGENTS, projektlogg, tidigare strategikällgranskning och relevant adapterkod.
- Gjort read-only-kontroll av aktuella officiella källor och lokal CPU/RAM. GTO Wizards developers-sida gav HTTP 403; ingen ny slutsats om dess API dras från den misslyckade hämtningen.
- Inga solverexperiment, träningsjobb, ändrade spelregler, nya strategimodeller eller produktkodändringar i detta granskningssteg. Inga nya funktionstester behövs för enbart dokumentation.
- Tidigare i chatten klonades repot, beroenden installerades och appen byggdes/startades. En tillfällig DOM-läsare anslöts till den befintliga Edge-fliken. Första kontrollen fick timeout; användarens senare bild visade inkommande data och experimentella råd. Det är inte en ny fullständig liveverifiering i denna granskning. Hur experimentvalet aktiverades fastställdes inte.
- Nästa AI ska först läsa denna rapport och den nya statusen i `PROJECT_LOG.md`. Äldre träningschecklistor är historiska och får inte återstartas på eget initiativ.
- En ny kandidat måste först visa gratis licens/modell, explicit täckning och ett verkligt integrationsgränssnitt. Därefter kan ett konkret integrationsbeslut tas. Om underlaget saknas ska resultatet fortsätta vara **ingen kvalificerad kandidat**, inte ett löfte om att egen träning snart löser allt.

### Kort prompt för överlämning

> Läs C:\dev\poker\AGENTS.md, PROJECT_LOG.md och docs\solver-integration.md först. Senaste beställning: bästa möjliga gratisimplementation och valfri billig betalsolver senare. Bevara kvalitetsgrinden; återstarta inte experimentell träning. Providerlagret är implementerat med fri HU turn/river. Full 2–6-täckning saknas fortfarande. Kvalificera nya gratis källor eller Ika-exportens gränssnitt/kvalitetsmått innan integration. Köp och leverantörskontakter är inte beställda.

