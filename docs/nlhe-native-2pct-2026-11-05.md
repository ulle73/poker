# Vanlig NLHE: native-turn och användarvald 2 %-gräns

**Historisk baslinje, ersatt:** den långsamma native-motorn nedan har ersatts av
b-inary. Aktuell installation, kvalitetskontroll och mätt tid omkring tre
sekunder i Windows-provet finns i [snabböverlämningen](nlhe-fast-2026-11-05.md).
19,5-sekundersresultatet och den gamla 25-sekundersbudgeten bevaras som historik.
Det gamla byggskriptsnamnet vidarebefordrar nu till den nya byggvägen.

Datum: 2026-11-05, Europe/Stockholm. Checkout C:\dev\poker,
branch codex/free-solver-providers. Ändringar är lokala, ingen commit/push gjord.

## Aktuellt resultat

Användaren begärde uttryckligen: ”sätt inte för hårda krav, teta på 2%”.
Vanlig NLHE använder nu 2 % maximal uppmätt exploaterbarhet av rotpotten.
Samma gräns används vid solve och provider/router-godkännande, och visas som
”Solverstrategi · 2 % felgräns”. Det är en approximerad jämvikt i det valda
trädet och rangerna, inte full no-limit-GTO eller 98 % vinstchans.
6+ har kvar sin separata 0,2 %-gräns. Okända leverantörer har fortfarande
0,2 % som standard; inga experimentella reservråd har återaktiverats.

Läget från bilden återskapades: Td 8s Ts 7c, hero Qd 4h, pott 0,14 EUR,
effektiv stack 1,86 EUR, två aktiva och fyra foldade vid sex säten, fullrange.
Det kompletta Windows-testet gav ett råd i UI med uppmätt fel **1,924 %**
efter 125 iterationer och **19 519 ms**. Direkt nativeprov tog cirka 23 s.
Detta är en syntetisk återspelning av det rapporterade läget. Det är inte ett
råd som observerats färdigt inom tidsfristen på en ny riktig hand.

Den vanliga appen är omstartad (PID 67884/fönster 1117178 vid kontroll) och
visar 2 %-gränsen. Pokerfliken visade då lobbyn, utan pågående bord. Ingen
spelhandling utfördes och ingen extra läsarsensor anslöts. Riktig ny hand med
denna gräns återstår att verifiera. Den äldre installerade bordsläsaren kan
fortfarande läsa vanlig NLHE; ny variantmetadata är ett separat öppet ärende.

## Rotorsak och ändring

WASM-trädet för den rapporterade handen har 5 547 noder, 1 128 kombinationer
per range och 44 650 752 byte uppskattad CFR/chance-lagring. Det avvisades av
träningsvägens 5 000-nodsgräns trots att det låg under minnesbudgeten 64 MiB.
Att tillfälligt tillåta större graf i ett isolerat prov löste inte tidsproblemet:
WASM nådde inte den gamla 0,2 %-gränsen inom 25 s. Inte heller den först byggda
native-CLI:n nådde 0,2 %; efter 125 iterationer låg felet på cirka 1,924 %.

Efter användarens val av 2 % kvalificerar samma strategi. Turn i Electron
använder nu en fyrtrådad native-version av **samma oförändrade Postflop-motor**.
Den har en separat JSON-adapter i native/postflop-bridge. Ingen CFR-, kortvärderings-
eller bästa-svarsalgoritm har skrivits om. Ranger eller ordinarie satsningsstorlekar
har inte minskats för att få detta prov godkänt. Native räknar 64 MiB som faktisk
lagringsbudget och tillåter högst 10 000 exporterade offentliga noder. Alla
grenar granskas fortfarande av den befintliga heltals-/regelkontrollen.

En tidig hypotes om bråkdelar av ören avfärdades vid källgranskning: leverantören
avrundar redan beloppen till 0,01. Det var inte orsaken till bildens fel.
Tillfälliga smalare actionträd i felsökningen gav inte en godkänd snabb lösning
och ingår inte i den installerade modellen.

## Motor, bygge och installation

- [Officiell källa](https://github.com/ucsandman/postflop), revision
  5fc7ee3d92b823b6c58e4f58cbee7d50d5e9e6de, MIT (Wes Sander 2026).
- Leverantörens [bettingträd](https://github.com/ucsandman/postflop/blob/5fc7ee3d92b823b6c58e4f58cbee7d50d5e9e6de/engine/src/tree.rs)
  och [separata bästa-svarskontroll](https://github.com/ucsandman/postflop/blob/5fc7ee3d92b823b6c58e4f58cbee7d50d5e9e6de/engine/src/br.rs).
- Rust 1.99.1, MSVC, release/LTO, target-cpu=native, fyra rayon-trådar.
  Cargo.lock i native/postflop-bridge låser adapterbyggets beroenden.
- Binär SHA-256: 972bff3d194bf64be6fdcb551935b8394683a02e15951ccd94c63d66e1c9ce17.
- Installerad separat i
  C:\Users\ryd\AppData\Roaming\Poker GTO Advisor\solvers\postflop-native,
  med manifest.json och MIT-notis. Binären ligger inte i Git eller gamla portable-exe:n.
- Bygg-/installationsrecept: scripts/build-native-postflop.ps1 -Install.
  Kräver officiell Rust minimal MSVC-toolchain och befintliga MSVC Build Tools.
  Skriptet avvisar ändrad eller felrevisionerad motorkälla. Skriptets syntax har
  kontrollerats; denna session byggde med motsvarande explicita Cargo-kommando.
- Bygget är CPU-specifikt: bygg och verifiera på nytt på annan dator. Ingen
  byte-för-byte-reproducerbarhet på andra datorer påstås. Kostnad: 0 kr i licens/API.

Electron startar fast binär med argv och shell:false i en unik lokal jobbmapp.
Ingångar valideras med samma kompilerade config-validator som renderer använder.
Binärhash och källrevision kontrolleras. Total jobbtid begränsas till 25 s,
stderr till 256 kB och JSON-export till 8 MB. Renderaren har ingen Node-åtkomst.
Avbrott dödar processen; även cancel som kommer före solve-start minns sitt ID.
En äldre cancel får inte stoppa ett nytt jobb. Cache är bunden till exakt config/linje.
Om native inte är installerad finns den äldre WASM-vägen kvar med sina gränser.
Native-fel eller underkänd kvalitet får inte maskeras av en experimentmotor.

## Verifiering

- Nytt test som accepterar 1,92 % men avvisar 2,01 % var rött före ändringen.
- Native-provet med den rapporterade djupa fullrange-turnen passerar genom
  process, export, hela trädets laglighetskontroll och provider/router till ready.
- Ett mindre native-turnfall jämförs mot den låsta WASM-motorn vid **samma
  iteration**: frekvenser, hand-EV, rot-EV och kvalitetsmått stämmer inom tolerans.
- npm test -- --maxWorkers=1 --testTimeout=15000 med POKER_POSTFLOP_SOLVER_DIR:
  361 pass, 4 opt-in skip, 159,28 s. Därefter två ytterligare snabba service-
  regressioner för cancel före start respektive gammalt jobb-ID: 2 pass.
- npm run build: godkänt. Befintliga direkta orakelprov behåller sina tidigare
  strängare mål; live-testernas förväntade gräns följer användarens 2 %-val.
- npm run smoke:desktop med båda native-solvermapparna angivna:
  godkänt, verifiedNativeTurnAt2Pct=true, verifiedSixplusRiver=true och tidigare
  färskhets-/kort-/tur-/täckningskontroller. 6+-grinden ändrades inte.
- node scripts/verify-native-postflop.mjs --cancel: cancelled=true, activeJob=null.

Evidens i docs/evidence/nlhe-2pct-desktop-2026-11-05.json,
nlhe-2pct-tests-2026-11-05.log och nlhe-turn-2pct-2026-11-05.png.
Reproducerbart tungt prov: sätt POKER_POSTFLOP_SOLVER_DIR och kör
node scripts/verify-native-postflop.mjs. Det är en syntetisk hand, inte livekoppling.

## Kvarstående gränser och nästa AI

2 % gör inte preflop, flop eller multiway stödda. Modellen är fortfarande två
aktiva på matchad turn/river, utan rake och med uniforma rangepriorer om inget
annat anges. Ett större bord går att läsa, men kan inte lösas som sex aktiva.
19,5–23 s kan vara för långt för bordets beslutstimer. Appen släcker/cancelar
fortfarande svar efter tur-/hand-/rangebyte; ett gammalt råd får inte visas för
att påstå bättre latens. Fullmålet 2–6 på alla gator är inte uppnått.

Nästa verifiering är en faktiskt tillgänglig stödd hand med den omstartade appen.
Om lägre latens krävs: undersök återanvändning av samma lösta native-träd och
profil över flera beslut eller en källa med förberäknade strategier. Hitta inte
på snävare motståndarranger och sänk inte gränsen ytterligare utan användarens
instruktion. Gratisstandard och framtida valfri betalmotor är fortsatt separerade.
