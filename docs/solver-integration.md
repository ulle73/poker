# Gratis motor nu, valfri betalmotor senare

Datum: 2026-11-05. Gäller `codex/free-solver-providers` i `C:\dev\poker`.
Detta är aktuell implementationsöverlämning. Kandidathistoriken finns i
`solver-selection-2026-11-04.md`; testresultat finns i `PROJECT_LOG.md`.

**Aktuell preflopintegration 2026-11-07 kväll:** se [källor, installation och
verklig täckning](preflop-2026-11-07.md). ART/GTO100BB6-maxdata och HoldemMath
HU push/fold är lokalt importerade. Position, stack och höjningslinje styr
tabellvalet. ART/GTO används som markerad100BB-referens vid50–150BB effektiv
startstack mot djupaste kvarvarande motspelare och2–6 positioner. Kortare säten
kan finnas; samtliga aktiva stackdjup redovisas. Detta är inte separat löst
GTO för varje stack/bordsstorlek. Rättat efter bilden med43BB-SB, se överlämningen.
Preflop använder inte Monkers topp50%-prior. Proprietära data installeras
lokalt för personligt bruk och distribueras inte med källkoden.

**Aktuell integration 2026-11-07 eftermiddag:** [Monker är nu ansluten](monker-app-2026-11-07.md)
för3–6 aktiva på turn/river med topp50 % som egen förvald startprior och breda
motståndarranger. Användaren accepterade2,1 % och delegerade visningsvalet;
implementerat är tydligt källmärkt Monkerträning med okänt fel där exakt kontroll
inte ryms. Det är inte verifierad2,1 %-GTO. Kända mätfel övergränsen blockeras,
och gamla egna experimentbeslut förblir blockerade. Windows-appen har visat
breda syntetiska6p-turn-/riverbeslut. Faktisk aktuell Edgehand väntar eftersom
öppna pokerflikar var frånkopplade. Äldre text nedan är historik.

**Historisk kvalificering 2026-11-07 morgon:** se [Monkerturn](monker-turn-2026-11-07.md).
Export/policy och ett exakt separat felmått är nu verifierade för små modeller.
Användaren har delegerat valet: multiwaygränsen är max ensidig förbättring2 %
av rotpotten, med summan redovisad separat. Varma smala3–5-spelarturnkontroller
klarade2,31–2,50s inklusive decode+audit. Sex spelare missar fortfarande gränsen;
topp50 % för endast hjälten med fulla motståndarranger har okänd kvalitet.
Ingen Monker-provider är ansluten. Historiken nedan beskriver tidigare status.

## Vad ändringen gör

Fria strategikällor för NLHE är nu b-inary Postflop för lokal native-turn och
UCSandman Postflop WASM för river. Användaren valde 2 % som felgräns den 2026-11-05; samma gräns
gäller solve, provider/router och synlig UI-etikett. Läs
[snabböverlämningen](nlhe-fast-2026-11-05.md) för installation och latens.
Det tidigare 19,5-sekundersfallet når synligt beslut på 2 725 ms i slutprovet
(2 121 ms beräkning), med 1,805 % fel.
TexasSolver v0.2.0 är separat
lokal källa för 6+ HU river. Läs [6+-överlämningen](shortdeck-solver-2026-11-05.md)
för installation, kontroller och mätningar.
Det experimentella MCCFR-flödet startas inte längre av livepanelen och dess
opt-in är borttaget. Forskningskod och negativ kvalitetsevidens finns kvar.
Misslyckad beräkning, bristande täckning och underkänd lösning har olika besked.

NLHE-täckningen är **två aktiva händer på turn/river i matchande träd**,
även vid ett större bord. Preflop, flop och 3–6 aktiva händer saknar ansluten
strategi. 6+ stöder endast två aktiva händer på river. Läsning/historik fungerar
separat; standard-equity körs inte för 36-kortsbord.
Monker Free har 2026-11-06 faktiskt testats för 3–6 aktiva på båda gatorna.
Tio arkivexporter är lästa, men kvalificerat 2 %-mått och komplett policykontrakt
saknas. Fortsatt profilering med 13 faktiska prov gav sexvägs turn ratio10
14,030/14,819 s med Java17/åtta trådar, mot 21,778 s med fyra trådar och
historiskt 30,174 s. Samma lilla kontrollträd och fullrange, utan uppmätt 2 %.
Ingen provider är ansluten. Läs [funktionstestet](monker-free-test-2026-11-06.md)
och [prestandaproven](monker-performance-2026-11-06.md).
Det här är en förbättring av pålitlighet och utbytbarhet, inte en ny komplett
2–6-spelarsolver. Inga egna solverexperiment eller modellträningar utförs.

Tom range är en uniform modellprior. Den är inte en korrekt härledd prefloprange.
Solverns felmått gäller det begränsade trädet och valda ranger, utan rake.
Okända tidigare sidopotter och ofullständig handlinje kan inte repareras genom
att byta solver. Dessa begränsningar måste vara synliga även med en betalmotor.

Turnkällan är `b-inary/postflop-solver` (AGPL-3.0-or-later), separat lokalt
installerad i `solvers/postflop-fast`. River-WASM är fortsatt `ucsandman/postflop`.
Låst granskad revision, binärernas SHA-256 och skilda uppgifter om ursprung för
nedladdad WASM respektive lokalt byggd native finns i `docs/solver-provenance.json`. Inga WASM-binära
artefakter eller solveralgoritmer har ändrats. Ny native-adapter bygger samma
offentliga modell; normaliseringsfaktor och oberoende bästa-svarstest finns i
snabböverlämningen. Det är fortfarande två aktiva händer, inte sex aktiva.

## Implementerat kontrakt

`src/decision/providers.ts` exporterar:

```ts
interface DecisionProvider {
  info: { id: string; name: string; cost: "free" | "paid"; coverage: string };
  unsupportedReason(snapshot: LiveSnapshot, input: DecisionInput): string | null;
  solve(snapshot: LiveSnapshot, input: DecisionInput): Promise<DecisionResult | null>;
  cancel(): void;
}
```

`DecisionEngine` väljer första stödda, godkända motor, med fria först. Betalda
filtreras bort utan `allowPaid=true`. Fabriken `createDecisionEngine()` registrerar
`FreePostflopProvider` och `SixplusProvider`, filtrerade på explicit spelvariant.
Betald opt-in är ett programkontrakt för en framtida
inställning, inte en levererad anslutning eller köpknapp. Inga kostnader kan
uppstå från nuvarande fabrik.

Utfall är `ready`, `unsupported`, `rejected`, `error` eller `cancelled`.
Vid avbrott stoppas workers och generationskontrollen förhindrar både sena svar
och start av en reservmotor för den gamla handen. Hooken släcker dessutom råd
vid gammal avläsning, handbyte, ändrade ranger, avstängd automatik och turbyte.

Adaptern ansvarar för full modellmatchning och kvalitetsbevis. Routern kontrollerar
också handnyckel/rangerevision, kvalitetsstatus, ändligt felmått inom providerns gräns,
frekvenser, EV, chipbelopp, aktuell handlingsmeny och lagliga rothandlingar.
Den tidigare gemensamma 0,2 %-gränsen är nu providerspecifik: vanlig NLHE har
uttryckligen vald 2 %, 6+ och leverantörer utan särskild policy behåller 0,2 %.
En extern fil får **inte** godkännas bara för att den själv innehåller strängen
`verified-gto`. Den fria adaptern har redan full trädgranskning i
`verified-river.ts` och `river-legality.ts`. Routertester med testleverantörer
verifierar kontraktet, inte någon extern solvers strategikvalitet.

## Billigaste granskade betalkandidat för den utökade täckningen

IkaSolver NLHE + Trainer har listpris **199 USD engångsbetalning**, två nycklar
för varsin enhet och annonserat stöd upp till nio spelare. Demon visar endast
förberäknade exempel. Skatt, valuta-/betalavgifter och eventuella externa
beräkningskostnader är inte fastställda. Detta är billigaste kandidaten i vår
granskning med annonserad önskad täckning, inte en garanti om billigast på hela
marknaden eller verifierad kvalitet. [Officiellt pris](https://ikasolver.com/pricing).

Leverantören anger preflop/postflop och konfigurerbar rake.
[Officiell funktionstäckning](https://ikasolver.com/).
Den dokumenterade motorn använder MCCFR och handabstraktion. Det är inte i sig
ett fel, men ett visat antal iterationer eller stabilitetstal är inte ett
Nash-intyg. Oberoende kvalitet och lokal tidsåtgång har inte verifierats här.
[CLI](https://ikasolver.com/docs/cli/usage),
[abstraktion](https://ikasolver.com/docs/solver/abstraction).

## Konkret arbete som återstår före en Ika-anslutning

1. Fastställ tillåten tredjepartsintegration och få ett dokumenterat läsformat
   för kompletta strategier. `.tree` innehåller spelstruktur/ranger; `.iks`
   innehåller lösningen. Dokumentationen beskriver deras användning men de
   lästa sidorna definierar inte ett fullständigt parser-/API-schema.
   PIO-export beskrivs för preflopranger, inte som full all-street-export.
   [Trädfiler](https://ikasolver.com/docs/results/saving-trees),
   [strategifiler](https://ikasolver.com/docs/results/saving-sims).
2. Installera och aktivera en separat licensierad binär först efter köpbeslut.
   CLI-formatet är `ikasolver --tree game.tree -i 1000000 -o result.iks`.
   `--ram` uppskattar minnet före solve. Kommandot är leverantörens exempel,
   inte ett kvalitetskrav eller något som har körts här.
   [CLI-referens](https://ikasolver.com/docs/cli/flags-reference).
3. Skriv en adapter bakom samma providergränssnitt. Electron-huvudprocessen ska
   starta en uttryckligen vald binär med argumentlista och `shell:false`, inte
   låta renderer köra kommandon. Använd separata jobbkataloger, tids-/minnesbudget,
   cancellation och schema-/storlekskontroll. Behåll nycklar utanför loggar.
4. Bind modell och resultat till exakt position, stackar, blinds/ante, rake,
   bräda, handlinje, ranger och satsningsmeny. Validera import mot referensexporter
   för varje stödd gata/spelarantal, inklusive ojämna stackar och sidopotter.
   Fastställ EV-bas och vad kvalitetsmåttet faktiskt mäter. Nuvarande gemensamma
   kvalitetsgrind kräver ett felmått som Ika ännu inte har visats leverera;
   fabricera inte ett sådant eller döp om volatilitet till exploaterbarhet.
5. Mät verklig resursåtgång på användarens fyrkärniga dator med cirka 16 GB RAM.
   Cache/förberäknade lösningar måste ha exakt konfigurationsnyckel. Att CLI finns
   gör inte stora multiwaysolves snabba nog för aktuell beslutstid.

Ingen Ika-binär, licens eller extern databas har hämtats, köpts eller kopplats in.
Den dyraste oprövade förutsättningen är **åtkomst till en maskinläsbar strategi
med tillräcklig modellkvalitet och täckning**, inte själva adapterkoden.

## Historisk slutkontroll och ytterligare fri kandidat (2026-11-04)

- Helsviten: `npm test -- --maxWorkers=1` gav 330 pass, 4 opt-in-tester
  överhoppade. Efter fem extra livscykelregressioner gav slutkontrollen av hook
  och provider 32 pass. Bygge och Electron smoke är godkända. Ett tidigare
  parallellt test nådde femsekundersgränsen; samma test passerade seriellt,
  utan ändrad tidsgräns eller sänkta kvalitetskrav.
- Windows-testet kontrollerar 20 kombinationer (2–6 aktiva gånger fyra gator),
  med verklig WASM i stödda fall och explicita avslag i övriga. Det är en
  funktions-/täckningskontroll, inte 20 godkända strategilägen. Färskhet,
  regelkontroll, sessionslagring och layout ingår.
- Appen startades om med senaste bygget och fri täckning verifierades i dess
  gränssnitt. Pokerfliken visade då lobbyn, inte ett bord. Ingen ny aktuell hand
  eller komplett liveanslutning har därför verifierats efter omstarten.

TexasSolver v0.2.0 Windows hämtades från den officiella releasen till chattens
`work` och leverantörens oförändrade konsolprov kördes separat. Referensprovet
använder smala ranger på Qs/8d/7h. Det avbröts vid vår 30-sekundersbudget utan
komplett resultatexport; senaste utskrift var iteration 41 och 1,4131937 %
exploaterbarhet. Total uppmätt tid inklusive start/avbrott var 30,85 sekunder.
Provets eget mål var 0,5 %, medan appens gräns är 0,2 %.

Det styrker att binären startar, men kvalificerar den inte för aktuella liveråd.
Det är inte bevis för att alla floppar misslyckas eller att längre offlinejobb
saknar värde. Ingen egen solveralgoritm, träningsmodell eller reservgissning
infördes. Kandidaten var då **inte registrerad** i providerfabriken. Sedan
2026-11-05 är endast 6+ HU river registrerad; floppevidensen är oförändrad. Vid fortsatt
arbete behövs både komplett resultat-/trädvalidering och realistiskt
latensunderlag; ett lyckat exempel skulle inte räcka för full flopptäckning.
[Officiell release](https://github.com/bupticybee/TexasSolver/releases/tag/v0.2.0),
[konsolmanual](https://github.com/bupticybee/TexasSolver/tree/console#usage).

Binär-/arkivhash, exakta testkommandon och utfall finns i
`docs/evidence/free-solver-verification-2026-11-04.json`, native-rapporten i
`docs/evidence/free-solver-desktop-2026-11-04.json` och Texas-loggen i
`docs/evidence/texassolver-v020-vendor-sample-2026-11-04.log`.

## Nästa AI

Läs globala och lokala AGENTS samt PROJECT_LOG först. Behåll fria motorn som
standard och starta inte om tidigare underkänd träning. För ny gratis täckning:
TexasSolver/b-inary är möjliga HU-flopkandidater; multiway och preflop har
fortfarande egna luckor. Kvalificera källan innan du registrerar adaptern.
För betalspåret: börja med exportformat, integrationsrättigheter och kvalitet;
inga köp eller kontakter är beställda. Ett providergränssnitt gör byte möjligt
utan att skriva om UI, men det gör inte en leverantör färdigintegrerad.
