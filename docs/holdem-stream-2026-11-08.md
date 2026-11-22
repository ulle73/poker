# Holdem Solver: officiell åtkomst och strömprov

Fortsättning 2026-11-08. **Ingen aktiv flopprovider har tillkommit.**
Produktkod, solveralgoritmer, källans inloggning och dess skyddsgrindar är
oförändrade. Användaren har begärt automatisk integration för2–6 utan frågor.

## Officiell åtkomst kontrollerad

Den officiella skrivbordsappen visar inloggat konto, FREE BETA, aktiv egen
workstation och ENGINE READY. Kontosidan har kontohantering och Workstations,
men ingen synlig funktion för externa API-klienter. Diagnostics visar frisk
motor, inga pågående jobb och beredskap att räkna. Detta återkontrollerades
även efter den senare fortsättningen genom Refresh all data.

Den befintliga lokala runnernyckeln autentiserar läsanrop på127.0.0.1:8807.
Färsk kontroll: health200, normalt nytt syntetiskt POST/solve403 med
`compute_not_granted`. Extern klient till gatewayns /app/session får
authenticated:false. Skrivbordsinloggningen tilldelar inte automatiskt denna
separata klient en kontosession eller ett compute grant.
Runnerns officiella specifikation anger allow_execute:true och auth_required:true;
det är alltså inte en identifierad avstängd lokal execute-inställning.

Ett normalt öppnande av samma officiella gateway i Edge på127.0.0.1:8900
avvisades med `local_origin_required` och `Open NLHE Solver from its desktop
window.` Ingen user-agent, Origin-header, kontocookie, sessiondatabas eller
compute-grant-fil har använts för att passera detta skydd.

Granskade även den officiella startarens levererade frontend och runtime-CLI:
ingen publicerad deep-link-/extern inloggningsväg hittad. CLI `runner launch
--help` och `gateway --help` visar serviceadress, lokal API-nyckelfil och
serverinställningar. `--browser-host-alias localhost` anges uttryckligen för
lokal browserutveckling; det har inte aktiverats som en produktlösning eller
för att ändra åtkomstkontrollen. Detta är granskade ytor, inte ett bevis att
leverantören aldrig kan erbjuda ett SDK.

Det finns alltså två skilda fakta: officiell UI-jobbstart fungerar, men en
avsedd autentiserad nyjobbsväg för Poker Advisor är fortfarande inte verifierad.
En adapter som bara läser gamla jobb uppfyller inte automatiska nya flopbeslut.

## Strömgränssnitt: faktiskt mätt före färdig export

Leverantörens genererade API-spec dokumenterar:

- GET /solve/{id}/strategy-snapshot
- POST /solve/{id}/strategy-watch med street och history
- GET /solve/{id}/combo-strategy

Två syntetiska prov startades i den officiella inloggade UI-vägen. Båda
återupptar samma tidigare tränade3p-modell:JhQhKh,40,5BB,4,5BB-pott,fulla
ranger,50000ytterligare iterationer,1tråd. Noden efter SB-check ägs av BB
och har check,bet60%pott,all-in. Testhand9s9h. Den gamla check-only-roten
har inte misstagits för en allmän optimal checkpolicy.

| Prov | Första nygenererade snapshot | Vald hands API-rad | Färdig export |
| --- | --- | --- | --- |
| Tidig engångs-watch |4,489s,fel vald nod |23,987s |24,523s |
| Verifierad watch |3,780s,rätt vald nod |4,012s |25,118s |

Tiderna börjar när vår polling upptäcker det nya jobbet, **inte** vid UI-klick.
API-polling och nätanrop ingår. Andra körningens serverstatus anger25,717s
total och8,485s träning. Ingen minnesvakt utlöstes.

Viktig begränsning: den andra körningen började från70202 redan tränade
iterationer. Första handraden hade fortfarande59besök och exakt samma
frekvenser som föräldern. Första observerade uppdaterade handrad hade70besök
efter6,752s. Detta är inte ett kallt nytt flopbeslut på3,8s.

En200-acknowledgement på strategy-watch räckte inte: strömmen kunde ändå
visa entry_flop i stället för entry_flop.check. Den officiella UI-vyn och
extern klient delar enligt kontraktet en vald public node. I andra provet
återställdes watch efter faktisk träningsstart och återlästa snapshots
kontrollerades. Vilken komponent som skrev över första valet är inte
isolerat bevisat; det ska inte beskrivas som en fastställd kärnbugg.

För integration måste klienten kontrollera jobbidentitet, modell, gata,
historia, spelare, handidentitet, samples och kvalitets/proveniensfält.
En färsk jobbid eller ny global iterationsräknare bevisar inte en ny handrad.
En tidig fel nod eller ärvd strategi får inte bokföras som kallt beslut.

Slutligt UI:120202iterationer,full rotcoverage,fortsatt DRAFT QUALITY och
iterationsgräns. `NASH GAP PROXY 5.41 BB/SEAT` är uttryckligen ett opålitligt
proxyvärde, inte2%-exploaterbarhet. Ingen garanti för bred2%-kvalitet,
2/4/5/6-spelartid eller faktisk Edgehand har tillkommit.

Strömvägen kan alltså undvika att invänta hela exporten i det provade fallet.
Den gör inte själva exporten snabbare och löser inte tillståndet för nya jobb.

## Diskåtgärd och verktygsavslag

Inventerade40node_modules-mappar underC:\dev, cirka21,9GB logiska byte;
aktiv pokerinstallation och reparse points undantogs. C:\dev\indexreglering
var oanvänt av processer och dess node_modules ospårad i Git, med låsfil kvar.
Inga gamla tradingdata behövde väljas eller ändras.

Automatisk verktygskontroll avvisade två borttagningar med `blocked by policy`:

1. C:\dev\indexreglering\node_modules
2. Det snävare C:\dev\indexreglering\node_modules\react-native-reanimated\android\build

Inga av dessa raderingar utfördes. Ingen annan raderingsmekanism användes.

Som icke förstörande alternativ användes Microsofts compact.exe /C /Q på
167exakt inventerade gamla Android-buildfiler över5MB, endast inom första
mappen. Inga kataloger komprimerades rekursivt och inga reparse points följdes.
Alla167SHA256kontrollsummor jämfördes före/efter och var oförändrade.
Logisk storlek6,228GB; uppmätt ledigt utrymme1812930560→2664955904byte,
ökning852025344byte (cirka0,85GB). Samtidig annan diskaktivitet kan påverka
globalt fritt utrymme; hela den logiska storleken har inte räknats som frigjord.
Senare kontroll visade cirka3,19GB fritt, utan att hela ökningen tillskrivs oss.

Primär dokumentation:
https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/compact

## Evidens och reproduktion

`docs/evidence/holdem-stream-2026-11-08/` innehåller båda mätserierna,
avmaskerad AX-text, färsk HTTP-kontroll, disköversikt och reproduktionsskript.
Fullständig hashlista finns även i chattens outputs/diskutrymme-komprimering-
2026-11-08.json. Kontonycklar ingår inte. Se evidensmappens README.

Produktkod ändrades inte; föregående422pass/20skip och gröna bygge är tidigare
resultat, inte nykörda denna fortsättning. Reproduktionsskriptet har syntax-
kontrollerats med node --check. Riktiga källprocesser och API har faktiskt
körts i proven ovan. Ingen ny provider, permanent minnesfix eller komplett
2–6-flopfunktion påstås vara levererad. Inga köp, kontoförändringar, externa
meddelanden, commits eller pushar gjorda.
