# Poker GTO Advisor

En fungerande Windows-app för **heads-up riverträning** med automatisk DOM-avläsning och riktiga DCFR-strategier från [Postflop](https://github.com/ucsandman/postflop). Allt körs lokalt, även solvern och typsnitten. Ingen API-nyckel behövs.

**Aktuell status 1.2:** Windows-träning, liveavläsning och equity för 2–10 spelare fungerar. Den beställda automatiska GTO-beslutsmotorn för alla gator och antal spelare är **inte färdig**. Equity är tydligt skild från strategi. Se [multiway-utredningen](docs/multiway-research.md).

## Starta

Dubbelklicka **`Start-Poker.cmd`** i denna mapp, eller kör:

`release/Poker-GTO-Advisor-1.2.0-Windows.exe`

Den portabla Windows x64-appen behöver ingen installation. Den är inte kodsignerad. En uppackad version finns också i `release/win-unpacked/`. Flytta hela den mappen om du använder dess `.exe`.

## Använd appen

1. Börja med **Fånga bluffen**. Kort, pott, stackar och historik läses automatiskt från det inbäddade träningsbordets HTML.
2. I **Studera** visas trafikljus, exakta handlingsfrekvenser, sizing och EV. I **Öva utan facit** väljer du först och får sedan återkoppling.
3. Klicka Fold, Call, Bet, Raise eller All-in i bordet. **Fortsätt handen** går vidare i samma lösta spelträd. Motståndaren följer en rangevägd strategimix.
4. **Min session** sparar upp till 1 000 beslut lokalt, med export, validerad import och återställbar nollställning.
5. **Egen studie** låter dig ändra riverbräda, båda rangerna, pott, effektiv stack, sizing och lösningsbudget.

**Bet/Raise visar totalt satsat på river; Call visar ytterligare belopp. Träningsbelopp är bb; livebelopp behåller sajtens avlästa valuta.** All-in riskerar återstående effektiva stack. EV anges relativt början av solverns riverträd, med halva startpotten tilldelad respektive spelare.

## Vad som är klart

- Sex träningsövningar, egna riverscenarier, synlig historik och positions-/stackavläsning.
- En verklig range-mot-range-solver med kortblockering, blandfrekvenser och separat uppmätt exploaterbarhet.
- Mätbar avläsning: identitet, revision, kort, pott, stackar och färskhet måste stämma innan råden visas.
- En sandboxad Windows-app som blockerar externa nätverksanrop och bevarar sessioner mellan starter.

## Avgränsning

MVP:n löser heads-up **river**, chip EV, utan rake, med symmetrisk effektiv stack och högst en raise. En blandstrategi gäller bara de angivna rangerna och bettingträdet. Iterationsgräns är inte samma sak som konvergens; appen visar uppmätt fel och om målet nåddes.

Historiken före river är ett tydligt märkt syntetiskt träningsprefix. Den används inte för att låtsas härleda optimala river-ranger. Motståndaren är en träningsmodell, inte en profil av en verklig spelare. Inga fiktiva vinstsiffror räknas.

Version 1.1 har liveavläsning av Svenska Spels HTML-klient till fliken **Live · Edge**. Den aktuella Edge-fliken har anslutits med en läsande DOM-observer som stannar vid omladdning. Kort, valuta, pott, säten, positioner, stackar, insatser och observerade handlingar visas. Historiken är delvis observerad från anslutningstillfället. Se [liveanslutning](docs/live.md). Riveranalysen kräver två deltagare, bekräftad egen tur och explicit angivna ranger. Preflop, flop, turn, multiway och linjer med båda spelarnas riverinsatser ger ännu inga råd. OCR ingår inte.

## Utveckling och verifiering

Node.js 24 LTS rekommenderas. Låsta paketversioner finns i `package-lock.json`.

```powershell
npm ci
npm test
npm run verify:solver
npm run build
npm run smoke:desktop
npm run desktop
npm run package
```

`npm run dev` startar webbläsarversionen på loopback. Ingen backend behövs. `npm run package` bygger den portabla Windows-appen.

`verify:solver` prövar ett analytiskt polariserat riverfall och jämför hela det större trädet med en **oberoende JavaScript-handvärderare och best-response-traversering**. `smoke:desktop` testar den riktiga Electron-appen, DOM-synk, val, sparande, återladdning och nätverksblockering i en separat testprofil.

Rapporter finns i `artifacts/` och en sammanställd [verifieringsrapport](docs/verification.md). Se [arkitekturen](docs/architecture.md), [solverursprung](docs/solver-provenance.json) och [licenser](THIRD_PARTY_NOTICES.md).
