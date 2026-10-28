# Research och tekniska beslut — 28 oktober 2026

## Befintliga projektet

[ulle73/poker](https://github.com/ulle73/poker), granskat vid `bf442999dbcd45afeee52e8560bd01498f02a383`.

Källan innehöll åtta C#/XAML-filer och dokumentation men ingen `.csproj` eller lösning. README krävde att användaren själv skapade WinUI-projekt, installerade paket, byggde kortmallar och kopierade filerna. `DecisionEngine.CalculateSimpleEquity` räknade ett värde från högsta kortets valör, suitedness och antal bordskort; det var inte Monte Carlo och inte en GTO-strategi. OCR-klassen fanns, men ingen verifierad fullständig tillståndsavläsning. Beslut: ersätt med en byggbar, paketerad tränare. Originalhistoriken bevaras i Git och dokumenten i `docs/legacy/`.

## GTO Poker Overlay

[hellomate2/gto-poker-overlay](https://github.com/hellomate2/gto-poker-overlay), granskat vid `e4b8791dc1bbbfcf4c92fff79a83821ee0194fc3`.

Användbara idéer: separata speltyper och handhistorik, DOM-baserad table scraper, frekvenser per handling, tydliga strategikällor, lokal träning och mätning. Projektet kombinerar flera källor: explicita preflopcharts, abstrakt MCCFR-blueprint, subgamesolver och regler. Källfilen `preflop-charts.ts` säger uttryckligen att dess deterministiska chartstrategi är en etablerad approximation, inte en ny solve. Att blint kopiera alla dess rekommendationer hade inte uppfyllt kravet på tydlig lösningskvalitet.

Vi återanvänder idéerna, inte autoplay, kommersiella sajtkopplingar eller den stora blueprintfilen. Ingen kod från overlayprojektet ingår i MVP:n.

## MCPoker

[LittleHalf/MCPoker](https://github.com/LittleHalf/MCPoker), granskat vid `d026db04bf5bb33fa588bd74ffb4a565ae325c84`.

Användbara idéer: en separat capture-brygga, full action history mellan gator, skilja state extraction från beslut och visa osäker avläsning. `src/tools/adviser.ts` skickar skärmbilder till Claude, parsa JSON och efterbehandlar med regelbaserade GTO/exploit-signaler. Detta ger inte en uppmätt Nash-lösning. I vårt val ligger inga solverbeslut hos en språkmodell. Ingen kod eller molnkomponent kopierades.

## Postflop

[ucsandman/postflop](https://github.com/ucsandman/postflop), granskat vid `5fc7ee3d92b823b6c58e4f58cbee7d50d5e9e6de`.

Rust-baserad range-mot-range-DCFR, egna card-removal-tabeller, action-major strategier, tree nodes och separat best response passar uppgiften. WebAssembly-API:t exponerar exakta kombinationer, räckvidd, per-combo EV och handlingsstorlekar. Vi kontrollerar räckvidd och kompatibel motståndarmassa innan någon rekommendation visas; oåtkomliga kombinationers uniforma fallback är inte en löst strategi.

De medföljande upstream-WASM-artefakterna är lokalt låsta med SHA-256 i `solver-provenance.json`. Rustkällan och MIT-licensen finns i `vendor/postflop/`. Binären hämtades från upstreams publicerade workbench, inte från en egen Rustkompilering. Vi påstår ingen byteidentisk reproducerbarhet mellan källrevision och deploy. Förbättring nästa steg: reproducerbar WASM-build i CI från låst source, verktygskedja och Cargo.lock.

## Faktisk Edge-inspektion av Svenska Spel

User-authorized, read-only inspection of the already-open client at approximately 01:36 Europe/Stockholm. No game entry, buy-in, bet, fold or other gambling action was performed.

Den undersökta klientens version i URL var `26.7.1.26_2`. Följande element observerades:

| Data | Observerad struktur | Verifieringsnivå |
|---|---|---|
| Bord | `.cash-table-view.table-view-container`, `.table.table-2-players` | Finns i vänteläge |
| Säte/hero | `.player-area.player-seat-*`, `.my-player` | Finns i vänteläge |
| Namn | `.nickname .target` | Synlig text fanns; personuppgifter sparas inte här |
| Stack | `.table-player .text-block.amount` | Synlig text fanns |
| Pott | `.total-pot .total-pot-amount`, `.main-pot .amount` | Element finns; tomma/dolda i vänteläge |
| Satsning | `.player-bet-* .amount` | Element finns; tomma/dolda i vänteläge |
| Bräda | `.community-cards .cardset-community .card` | Element finns; kort dolda |
| Kort | `.card-rank`, `.card-suit`, `.card-image` | Dold 5♣-platshållare observerad |
| Knapp | `.game-position .dealer` | Finns; synligheten måste kontrolleras |

Inga `canvas`-element hittades i den inspekterade DOM-vyn. En iframe finns också i klienten; en produktionsadapter behöver korrekt frame-behörighet och källa. DOM-åtkomsten bevisar att en adapter är tekniskt lovande, **inte** att korrekt och komplett avläsning under en hel hand redan fungerar.

Avgörande risk: ett dolt kort fanns i HTML trots att inget kort var delat. En läsare får därför aldrig bara samla all `.card-rank`-text. Den måste kontrollera dolda föräldrar, `display`, `visibility`, rätt kortzon, hand-ID, aktör och färskhet och avvisa ofullständiga snapshots. Det lokala träningsbordets adapter implementerar dessa grundregler och har tester för dolda platshållare.

## DOM jämfört med OCR/AI

| Metod | Styrka | Begränsning | Beslut |
|---|---|---|---|
| Lokal DOM-adapter | Exakta tal, låg latens, observerbara ändringar, deterministiskt testbar | Sajtspecifika selektorer, frame-gränser, dolda animationselement | MVP, färdig i träningsmiljö |
| MV3-tillägg för extern DOM | Isolerad content script, user-owned browser session | Kräver explicit sajtstöd, full-hand fixtures, behörigheter och synkprotokoll | Nästa separat integrationsarbete |
| Lokalt OCR/template matching | Fungerar för native/canvas och kan hålla bilder lokala | Kortmallar, scaling, färger, överlapp, decimaler och frame-timing | Fallback efter kalibrering och state-validering |
| Molnvision | Kan tolka många visuella layouter | Nätverk, kostnad, integritet, hallucinering och svag upprepbarhet | Inte grund för MVP-avläsning eller GTO |

En framtida OCR-adapter ska lämna samma TableSnapshot-kontrakt och kvalitetsmarkera varje fält. Okända insatser eller kort måste förbli okända; ingen LLM får fylla luckor till en skenbart exakt solve.

## Officiell dokumentation som styrde implementationen

- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security): sandbox, context isolation, ingen Node i renderer, CSP och begränsade behörigheter.
- [Electron protocol](https://www.electronjs.org/docs/latest/api/protocol): registrerat standard/secure-origin som kan hämta lokala WASM-/workerresurser och behålla samma storage-origin vid omstart.
- [Electron BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window) och [session](https://www.electronjs.org/docs/latest/api/session): fönster, webPreferences, permissions och request-blockering.
- [MDN MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver): samlad observation av attribut, text och childList; 25 ms debounce och separat färskhetsheartbeat.
- [MDN postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage): exakt targetOrigin, kontrollerad source och validerat payload.
- [React](https://react.dev/learn) och [Vite](https://vite.dev/guide/): oberoende komponentstate, två entry points och en statisk produktionsbuild.
- [electron-builder Windows](https://www.electron.build/win/): portabel Windows x64-distribution.

Paketversionerna är de faktiskt installerade versionerna i lockfilen. Ändringens risk begränsas genom offlinekörning, explicit riverscope och oberoende matematiska tester.

## Tillägg 1.1: aktivt bord

Den efterföljande avläsningen under pågående spel bekräftade hålkort via rank/suit eller SVG-filnamn, bräda, EUR-belopp, handnummer, sex säten, två och senare tre upptagna säten samt handlingsknapparna Fold/Syna/Höj Till. Authentiserade snapshots kvitterades av den lokala appen. Inga spelhandlingar utfördes. Se docs/live.md för aktuell täckning; tabellen och väntelägesiakttagelserna ovan är historik från den första researchfasen.
