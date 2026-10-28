# Verifiering — 28 oktober 2026

## Genomfört

Den gamla WinUI-skelettkoden har ersatts av en byggbar Windows-app. Leveransen innehåller ett portabelt `.exe`, ett uppackat alternativ, en startfil, källkod och dokumentation. Git-utgångspunkten är originalprojektets huvudgren; inget har pushats.

## Verifierat

| Kontroll | Resultat |
|---|---|
| TypeScript + produktionsbuild | Pass |
| Vitest | 11 tester passerar, 0 fel |
| Produktionsberoenden, `npm audit --omit=dev` | 0 rapporterade sårbarheter vid kontrollen |
| Riktig WASM-solver | Körs lokalt utan API-nycklar |
| Analytiskt polariserat pottbet | Bluff:värde 0,499869 mot teori 0,5 |
| Analytiskt mått på lösningskvalitet | 0,005825 % av rotpotten |
| Oberoende riveroracle mot Rust, större träd | EV och best response överensstämmer inom 0,0001 bb |
| Riktiga raises, positiva stackar, frekvenssummor och blockerade ranges | Pass |
| Faktisk paketerad Electron-app och portabel .exe | Båda startar; solver, DOM och samtliga sex övningar passerar |
| Interaktion | Call sparas; fortsättning går till terminalnod |
| Persistence | Beslut överlever återladdning och ny processstart i samma separata testprofil |
| Offlinegräns | Externt fetch blockerat; runtime har inga oväntade konsolfel |
| Sandbox | `window.require` saknas i renderer |
| 1440, 768, 390 px | Ingen horisontell overflow eller intern bordsscroll |
| Egen studie | Ogiltiga dubbla kort avvisas; giltig egen studie öppnas och får verklig strategi |
| Designlint | 0 fel, 0 varningar; kortsymboler uttryckligen behandlade som speldata |
| Fristående kodgranskning | Inga blockerande P1/P2-fynd inom river-MVP:ns scope |

Exempel från den oberoende kontrollen:

- JavaScript-oracle: exploaterbarhet **0,000834245109 bb**.
- Rust/WASM: exploaterbarhet **0,000834263861 bb**.
- JavaScript-oracle, OOP/IP-EV: **−0,090909316 / +0,090909316 bb**.

Testerna täcker card normalization, dubletter, riverkonfiguration och gränser, call/raise-kostnader, unsupported/zero-reach-händer, snapshotidentitet/färskhet, DOM-synlighet, sessionskorruption, validerad import, lokal backup och korrekta workerfel/avbrott. Den oberoende oracle har en egen 5-av-7-handvärderare och scalar traversal; den anropar inte Rusts evaluator eller best-response-kod.

Windows-smoke körs i en separat profil under TEMP. Den skapar därmed inte testbeslut i Jonas vanliga appsession. Rendererfel som uttryckligen kommer av testets blockerade `https://example.com`-anrop redovisas separat som förväntat säkerhetsbeteende.

Råbevis: `docs/evidence/` och aktuella körningar under `artifacts/`. Bilder: `docs/screens/`. Full data kommer från testkörningarna, inte från handskrivna UI-tal.

## Kvar utanför MVP:n

- Verifierad extern DOM-adapter och komplett live-handhistorik för Svenska Spel/PokerNow.
- OCR, automatisk kalibrering och skärmanalys.
- Preflop-, flop- och turnlösning samt range-estimering från en hel spelhistorik.
- Multiway, turnerings-ICM och rake.
- Verkliga motståndarprofiler och deras statistiska underlag.
- Kodsignering av Windows-distributionen.
- Lokal reproducerbar Rust→WASM-kompilering av den medföljande upstreamartefakten.

Dessa funktioner är inte dolda bakom kontroller eller presenterade som färdiga. Appens Metod & källor förklarar samma avgränsning.

## Visuell bedömning

Neutral mörk arbetsyta, lokalt laddad DM Sans, riktiga spelkort och bordet som produktens centrala arbetsyta. Trafikljusfärger används på handlingar och frekvenser och kompletteras med text. Vid smal bredd följer rekommendationen direkt efter bordet. Full historik och rangekontext ligger under arbetsytan för att hålla kort och handlingar läsbara; sidan får skrolla, bordet behöver inte det.
