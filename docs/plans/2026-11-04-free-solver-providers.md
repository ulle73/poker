# Gratis solver med utbytbara leverantörer

**Mål:** Använd den befintliga fria, kontrollerade HU-motorn utan experimentella
livebeslut och gör nya fria eller uttryckligen aktiverade betalmotorer möjliga.
**Arkitektur:** Ett gemensamt providerkontrakt med täckningskontroll, beräkning och
avbrott. En router prioriterar fria motorer och granskar svar innan UI får dem.
Den befintliga motorns fullständiga träd- och kvalitetskontroll behålls.
**Teknik:** TypeScript, React, befintlig Postflop WASM, Vitest, Electron smoke.
**Underlag:** `docs/solver-selection-2026-11-04.md`; senaste användarstyrning
tillåter bästa möjliga gratisimplementation nu och valfri betalmotor senare.

## Avgränsning och viktig risk

Ingen funnen gratis källa ger verifierad 2–6-spelartäckning på alla gator.
Denna ändring utökar därför inte strategitäckningen. Att köpa en solver ger
inte heller automatiskt ett verifierat integrationsformat eller Nash-bevis.
Inga köp, externa kontakter, egen träning eller nya solverexperiment ingår.

## Genomförande

1. Skriv beteendetester i `tests/decision-hook.test.ts`: ingen experimentworker,
   korrekt väntan/fel/täckningsbesked och inga sena svar efter handbyte/avbrott.
   Kör `npm test -- tests/decision-hook.test.ts` och kontrollera röda krav.
2. Implementera `src/decision/providers.ts`: metadata, `supports`, `solve`,
   `cancel`, fria först, betalda avstängda, gemensam svarskontroll och avbrott.
   Lägg routing-/kontraktstester i `tests/decision-providers.test.ts` innan
   implementationen. Anslut via `src/decision/use-decision.ts`.
3. Uppdatera `src/live/LivePanel.tsx` och `DecisionAdvisor.tsx` så att faktisk
   täckning, källa och felorsak visas. Ta bort experimentvalet ur livepanelen.
   Behåll forskning isolerad. Testa verklig WASM med befintliga river/turntester.
4. Anpassa `electron/smoke.cjs`: verkliga HU-svar, explicit otillgänglig strategi
   för preflop/flop/multiway, oförändrad equity och säker rensning av gamla svar.
   Kör `npm test`, `npm run build` och `npm run smoke:desktop`.
5. Dokumentera exakt providerkontrakt, återstående integrationsarbete, källor,
   pris och osäkerheter för billigaste granskade betalkandidat. Uppdatera
   `PROJECT_LOG.md`, spara testresultat under `docs/evidence/` och kopiera
   användarens överlämning till chattens `outputs`.

Arbetet sker på `codex/free-solver-providers` i den befintliga checkouten där
användaren kör appen. Ingen publicering eller ändring av pokerklienten ingår.

## Genomfört

Alla fem implementationssteg ovan är genomförda. Slutlig verifiering och
kvarstående strategitäckningsluckor finns i PROJECT_LOG:s loggpost
”Gratis providerflöde, stopp för experimentella liveråd och betalspår”.
Utökat spelar-/gatustöd är fortsatt ej levererat och får inte bockas av.
