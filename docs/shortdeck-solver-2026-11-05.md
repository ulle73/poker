# 6+ Hold’em: fri native-integration för två aktiva spelare på river

Datum: 2026-11-05. C:\dev\poker, branch codex/free-solver-providers.

## Aktuell omfattning

TexasSolver v0.2.0 är registrerad som SixplusProvider och installerad lokalt.
Ett Windows-test går genom autentiserad snapshotbrygga, provider, riktig native-
process, oberoende kvalitetskontroll och rekommendation i appens UI. Fullrangeprovet
tog 4,26 s totalt, varav 0,59 s kontroll. Desktopprovet tog 5,36 s under samtidig
belastning. Ingen betaltjänst eller ny modellträning används.

Detta stöder **två aktiva spelare på river i ett matchande satsningsträd**.
Preflop, flop, turn och fler än två aktiva saknar ansluten 6+-strategi.
Fullmålet 2–6 spelare på alla gator är inte uppnått. Resultatet gäller valda
ranger och chip-EV utan rake. Tom range betyder uniforma lagliga händer, inte
en härledd prefloprange. Handlingars EV saknas i native-exporten och visas som okänt.

Användaren har laddat om tillägg 1.1.0 och pokerfliken. Den aktuella fliken visar
”Söker efter ett spel …”, utan handnummer eller speltypsklass. En riktig hand
efter omladdningen och ett aktuellt 6+-riverbeslut är därför ännu inte verifierade.
Historisk automatisk transport finns i evidence/edge-auto-connect-2026-11-05.json.
Inga spelhandlingar utfördes av agenten.

Största praktiska risken är avslag vid modellmatchning av verklig historik/ranger
eller för lång tid för större träd. Ett lyckat syntetiskt riverprov bevisar inte
bred täckning eller korrekt rangeprior.

## Rotorsak och felmått

TexasSolvers BET/RAISE-export anger **ytterligare insats från spelaren**.
Den gamla offlinekonverteraren tolkade beloppet som ny totalinsats, vilket gav
fel pott efter återhöjningar. Importen använder nu ownContribution + exportedAmount,
i enlighet med [GameTree-källan](https://github.com/bupticybee/TexasSolver/blob/console/src/GameTree.cpp).

- NashConv = (BR0 + BR1) / rotpott × 100, summan av ensidiga förbättringar.
- TexasSolvers medelmått = (BR0 + BR1) / (2 × rotpott) × 100.
- Appens 6+-gräns är oberoende NashConv ≤ 0,2 %. UI anger ”NashConv / rotpott”.
- Native-målet är 0,05 % i medelmåttet; godkännande avgörs av oberoende kontroll.

Med rätt import ger den äldre sparade exporten medelmått cirka 0,16784862 %
och NashConv 0,33569724 %. Den underkänns alltså av appens gräns.
Tidigare rapporterade 0,1931287232 / 0,3862574464 % var felaktiga på grund av
konverteringen. evidence/shortdeck-policy-2026-11-05.json behålls som **ersatt
historik**, inte kvalitetsbevis. Regressionerna bevarar de rättade värdena.

Nytt skarpare nativeprov (pott 1000 chipenheter, stack 2000):

| Mått | Observerat |
| --- | ---: |
| Native medelmått | 0,048821066 % |
| Oberoende medelmått | 0,0488291213 % |
| Oberoende NashConv | 0,0976582425 % |
| Policy-EV OOP / IP | −35,2763455454 / +35,2763455454 |
| Bästa svar OOP / IP | −34,8210143774 / +35,7975968028 |
| Iterationer | 131 |
| Total service / audit | 4259 / 595 ms |

Måtten stämmer nu nära inom numerisk precision.
Evidens: evidence/shortdeck-live-service-2026-11-05.json.
En senare omkontroll från den installerade kopian tog 1891 ms totalt, med
204 ms audit och samma strategimått. Det visar belastningsberoende, inte en
garanterad maxtid. Se evidence/sixplus-service-recheck-2026-11-05.json.

## Snabb oberoende kontroll

Det gamla skalära oraklet tog cirka 36–51 s. Den nya kontrollen delar motståndarens
reach-vektor mellan hjältens händer och förberäknar blockerare/showdown.
Maximering sker fortfarande per privat hand och offentlig historik, aldrig
med kännedom om motståndarens dolda kort. Viktade delmängder jämförs mot det
äldre separata skalära oraklet i tests/shortdeck-audit.test.ts. Fullrange jämförs
även mot native-måttet efter rättad import. Inga kvalitetsgränser har sänkts.

En separat Node-worker håller UI responsivt. Importen kontrollerar kort,
efterfrågat kombinationsuniversum, vikter, blockering, alla offentliga grenar,
frekvenser och lagliga heltalshandlingar. Nollsummetest och icke-negativa
ensidiga förbättringar krävs före godkännande.

## Installation och reproducerbarhet

[Officiell release](https://github.com/bupticybee/TexasSolver/releases/tag/v0.2.0).
Installerad katalog:
C:\Users\ryd\AppData\Roaming\Poker GTO Advisor\solvers\texassolver-v0.2.0

Katalogen innehåller console_solver.exe och paketets resources-katalog.
POKER_TEXAS_SOLVER_DIR kan ange annan installation. Binärer finns inte i Git
och omdistribueras inte; annan dator kräver eget officiellt paket.

- EXE SHA-256: 8b74cd6f687387a9ea6c567591642cfe0bfca88360a1748ff7c7db769d0c5c1a
- Tabell SHA-256: 10f9e0e16364a849de6cf93025704c86cf054bb894ffdb7cece89d932aefc54b
- ZIP SHA-256: 0a9122fa0cd9384e6c1cbe0492e8a3b8ac7809890c649e1a53f77a59d6d50a7c

Huvudprocessen verifierar EXE/tabell, använder fast argv, shell:false, dolt
processfönster, separata jobbmappar, logg/exportbudget och 18 s tidsgräns för
native+audit. Avbrott stoppar matchande process/worker. Sena svar spärras av
jobbidentitet, beslutnyckel och rangerevision. Cache rymmer fyra exakta
konfigurationer. Renderaren får inte köra egna kommandon.

Native tar handklasser, inte godtyckliga explicita kombinationslistor.
Alla tillåtna kombinationer inom en klass måste ha samma vikt; oförenliga
vikter avvisas, aldrig medelvärdesbildas. Första observerade bet stöds inom
10–200 % av rotpotten och måste matcha exakt. Redan höjda/ofullständiga linjer
avvisas. Rake och okänd historik modelleras inte.

Bygg: npm run build; npm run build:extension. Start: npm start -- --live.
Reproducerbart nativeprov: sätt POKER_TEXAS_SOLVER_DIR och kör
node scripts/verify-shortdeck-service.mjs; lägg till --cancel för avbrottsprovet.
Avbrottsprovet passerade med noll kvarvarande jobbmappar och inget aktivt jobb.
Tillägget är version 1.1.0 med samma behörigheter. Snapshotens variant är
holdem/sixplus/unknown och ingår i besluts-/cachenycklar. Vanlig 52-korts-equity
körs inte för sixplus. Äldre läsare ger omladdningsbesked. Interna Edge-sidor
är verktygsspärrade; användaren utförde omladdningen.

## Regler och kostnad

[Svenska Spels beskrivning](https://spela.svenskaspel.se/poker/turneringar)
anger 36 kort, färg över kåk, triss över stege och A6789 som lägsta stege.
En oberoende kontroll av samtliga 376 992 femkortshänder matchade leverantörens
tabell med 1 404 distinkta ranker (evidence/shortdeck-rules-2026-11-05.json).
Det bevisar tabellens ordning, inte ensam all binärkod.

[README](https://github.com/bupticybee/TexasSolver) anger gratis personligt bruk
och binär integration. Källkoden anges som AGPL med ytterligare kommersiella
formuleringar i README. Ingen leverantörskällkod införlivades, ingen kommersiell
licenstolkning görs och inga köp gjordes. Denna personliga installation kostar
0 kr i licens-/API-avgift; lokal datortid tillkommer.

## Testevidens och nästa AI

- npm test -- --maxWorkers=1 --testTimeout=15000: 358 pass, 4 opt-in överhoppade,
  373,07 s. Första helsviten med standardgräns 5 s fick två wall-clock-timeouts
  i befintlig turn/bridgekontroll. Endast testkommandots timeout ökades;
  produktens 18 s och NashConv-gräns ändrades inte.
- npm run build: godkänt. Initiala saknade typdeklarationer för orakelimporter
  rättades före slutbygget.
- npm run smoke:desktop med POKER_TEXAS_SOLVER_DIR: godkänt, inklusive
  verifiedSixplusRiver=true och tidigare NLHE-färskhets-/regelkontroller.
- Evidence/: sixplus-tests-2026-11-05.log, sixplus-build-2026-11-05.log,
  sixplus-desktop-2026-11-05.json och sixplus-native-ui-2026-11-05.png.
  UI-bilden togs före sista etikettändringen till NashConv / rotpott; värdet
  på bilden är redan den oberoende summan, inte native-medelmåttet.

Nästa steg: verifiera färsk snapshot, explicit sixplus, rätt handnummer och
stödd riverlinje på verkligt bord. Ingen manuell sensor får maskera problem
med installerad automatik. Utöka inte täckningspåståendet till andra gator
eller multiway utifrån detta prov. Det gemensamma providergränssnittet bevaras
för en framtida betalmotor; ingen sådan är köpt, registrerad eller verifierad.

