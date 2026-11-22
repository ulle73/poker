# Holdem Solver 0.93: faktisk kvalificering, inte aktiverad provider

**Historisk nattkörning. Uppdaterad bild samma förmiddag:** se
[40BB och Holdem-uppföljningen](shortstack-and-holdem-2026-11-08.md).
Minnesstoppets konkreta checkpointreserv har identifierats; ett större3p-prov
slutfördes utan stopp på19s med20202iterationer, fortsatt utkast. Autentiserad
runnerläsning fungerar, nya externa jobb nekas403compute_not_granted.
Den nya40BB-preflopreferensen är installerad och UI-verifierad. Holdem-flop
är fortsatt inte en aktiv provider. Äldre råutfall nedan behålls.

2026-11-08, Europe/Stockholm. Uppdrag: gratis flop och kortare preflopstackar
för 2–6 spelare, beslut inom några sekunder. Användaren har bett om fortsatt
arbete utan fler frågor. **Uppdraget är inte slutfört. Ingen ny täckning har
aktiverats genom denna kandidat.**

## Installerad källa och åtkomst

Officiellt paket hämtades färdigt från
https://holdemsolver.com/NLHE-Solver-0.93.0-Windows-x86_64-setup.exe
efter användarens manuella rensning av den godkända VSIX-cachemappen.
Paketet är 1 913 825 101 byte, SHA256
`4f672103f5c07670e46a269f0bbb1507497a586f44a22a696afb7b418c93b9c8`.
Authenticode gav `NotSigned`. Officiell källa, ingen säkerhetsvarning kringgicks.
Programfiler packades upp under chattens `work/holdemsolver-0.93`; leverantörens
kod ändrades inte. Byggversion 0.93.0,
build SHA `0de6fe60b0acf0220aa7efa87b4b821cf81172ee`.

Användaren skapade/loggade in på sitt konto själv. Native UI visade därefter
ENGINE READY. Betan annonseras som gratis utan kort; framtida pris är okänt.
Den är inte en källa med garanterad permanent gratislicens.

## Verkligt trevägsprov på flop

Modell: vanlig NLHE, BTN/SB/BB, `JhQhKh`, startpott 4,5 BB,
effektiv stack 40,5 BB. Alla tre ranger är fulla: 1176 lagliga kombinationer
efter brädan. Låg handprecision, standard/lägsta visade brädprecision,
en aggressiv handling per gata. Max 10000 iterationer, stabilitetsmål 10.
Detta mål är **inte 2 % exploaterbarhet**.

1. Första körningen stoppades under abstraktionsinitieringen; UI visade cirka
   3,0 s och ett seedat träningsvarv.
2. Återupptagning med en arbetstråd stoppades också, cirka 5,0 s, totalt två
   iterationer. Att minska trådantalet gav inget användbart resultat.

Slutligt UI: `TREE TOO LARGE`, `STOPPED`,
`Tree too large for the memory currently available` och
`[3max] Stop arrived during abstraction initialization; seeding one iteration
before the complete browse export`.
1174 av 1176 ankommande kombinationer saknade samples; EV coverage 0,2 %.
**Check 100 % är här initial strategi, inte ett tränat råd.** Ingen sådan
strategi har importerats eller visats som beslut i Poker Advisor.

Maskinen har cirka 16 GB RAM, men bara cirka 0,9–1,34 GB fysiskt ledigt under
proven. Samtidiga användarprogram lämnades ifred. Detta är ett misslyckat prov
under den belastningen, inte ett bevis för att källan aldrig fungerar på
annan hårdvara. Tillgängligt virtuellt minne var betydligt större; vi har inte
visat att systemets commit-gräns nåddes. UI:s sparförlopp stannade länge vid
95 %; en färdig återläsbar export verifierades inte.

## Export och automatisk anslutning

Läsning av levererade frontendfiler identifierade ett lokalt runner-API:
`/api/runner/solve`, jobbstatus, `/result`, `/nodes`, `/convergence-history`,
stop/continue och biblioteksexport till `.nlhesolve`. Detta är kartläggning av
ett levererat gränssnitt, **inte verifierad extern integrationsåtkomst**.
Full ruttlista och källidentitet finns i evidensmappen.

Gateway är `http://127.0.0.1:8900`. Direkt GET av dess health-endpoint från en
extern lokal klient gav HTTP 401 `login_required` även när fönstret var
inloggat. En dokumentationsbegäran gav samma svar. Runtimehjälp visar roller
såsom `exact-flop`, `exact-turn`, `solve-6max`, `runner` och `gateway`.
Försöket `nlhesolver-runtime.exe --role exact-flop -- --help` stoppades med
`grant_missing`: ny beräkning kräver ett tillstånd från kontotjänsten.
Inga authcookies, lösenord eller tokens lästes, kopierades eller kringgicks.

Den inbyggda Quickstart-sidan kunde senare visas via det inloggade fönstret.
Dess text påstår att solvevägen saknar konto/licenskontroll. Detta motsägs av
den faktiskt körda 0.93-binärens `grant_missing` och gatewayns 401. Manualtexten
är därför inte tillräckligt bevis för oautentiserad CLI-drift. Ingen publicerad
stödd tredjepartsautentisering eller SDK-anslutning har verifierats.

Multiwayresultat beskriver källan uttryckligen som samplad strategistabilitet,
inte exploaterbarhet. Ett eventuellt lyckat framtida exportprov får alltså inte
märkas som verifierat 2/2,1 %-Nashresultat på grund av stabilitetsmätaren.

## Andra konkreta källkontroller denna fortsättning

* https://pokerdata.io/api har riktiga cashdjup 20/30/40/50/70/100/150/200 BB
  och dokumenterat node-API. Livekontrollen visar att strategier kräver konto
  och nyckel. Gratis Starter ger 25 anrop eller 50 MB per månad; fria anrop
  utan nyckel avser upptäckt och konfiguration. Det fyller inte ett obegränsat
  gratis liveflöde. Inget konto skapades och inga strategianrop gjordes.
* https://github.com/jensbaagaard/poker-practice erbjuder cash bara vid 100 BB;
  40/20/10/5 BB gäller MTT med ante. Datans README beskriver extraktion ur en
  annan apps inbyggda JavaScriptdata. En MIT-etikett i det repot verifierar inte
  ursprungskällans rättigheter. Det fyllde därför inte 40 BB cashbehovet och
  importerades inte. Turneringsdata har inte döpts om till cashdata.

## Återställning och nästa verkliga steg

Provprogrammet höll kvar stängning medan lokal motoraktivitet kontrollerades.
Efter normala stängningsförsök avslutades endast de identifierade processerna
från vår egen uppackade provkörning, inklusive dess kvarvarande barnprocess.
Poker Advisor återstartades normalt med `electron C:\dev\poker --live`.
AX och skärmbild visar mottagaren redo, väntar på färsk Edgeavläsning.
Pokerklienten visade frånkoppling p.g.a. inaktivitet. Ingen återinloggning,
bordsanmälan, insats eller pokerhandling utfördes. Inget aktuellt livebeslut
är verifierat denna natt.

För att kvalificera just Holdem Solver återstår båda dessa oberoende hinder:

1. En leverantörsavsedd autentiserad integrationsväg för nya jobb och export.
   UI-inloggning ensam gav inte den externa klienten åtkomst. Ändra inte gaten.
2. Ett färdigtränat brett flop-/kortstackprov under relevant minnesbelastning,
   återläst export, faktiskt tidsmått till beslut och separat kvalitetspolicy.
   Nuvarande 3p-prov räcker inte för att påstå täckning för 2/4/5/6 spelare.

Ingen adapter byggdes mot en oåtkomlig eller okvalificerad kärna. Nuvarande
prefloptabeller, HU turn/river och Monker turn/river finns kvar med sina tidigare
begränsningar. Inga numeriska solverändringar, inga köp eller externa kontakter.
Råunderlag: `docs/evidence/holdemsolver-2026-11-08/`.

## Slutlig regression av de redan installerade motorerna

`vitest run tests/preflop-installed.test.ts tests/postflop-native.test.ts
tests/monker-service.integration.test.ts --pool=forks --maxWorkers=1`
med de installerade katalogerna i POKER_PREFLOP_TEST_DIR,
POKER_POSTFLOP_SOLVER_DIR och POKER_MONKER_SERVICE_TEST_DIR gav
**12 godkända test, 3 filer, 47,19 sekunder**. Exakt PowerShellkommando finns
i PROJECT_LOG. Ingen produktkod ändrades här; fullsviten och bygget kördes
därför inte om.

| Aktiva | Monker turn, ms | Monker river, ms |
| --- | ---: | ---: |
| 3 | 4351 | 2278 |
| 4 | 2686 | 2298 |
| 5 | 2855 | 2477 |
| 6 | 4314 | 2662 |

Top50 % för hjälten, fulla motståndarranger, olika stackar. Tiderna avser
tjänstekedjan, inte målad UIpixel. Kvalitet fortsatt `unknown`, fel `null`;
2,1 % är mål, inte uppmätt garanti. All-inmappning, cancel och nästa jobb
passerade också. HU-turn klarade sin befintliga 2 %-grind och tidsgräns på sex sekunder.
Pinnade preflopdata, observerade höjningar, positionsmappning och 10BB HU
push/fold passerade. Detta återtest tillför ingen ny täckning för flop eller
40BB cash. Testlogg och samtliga åtta Monkerutfall ligger i råevidensmappen.
