# Gratis flop och kortstack: integrationsplan

Användarens fortsatta uppdrag: få faktiska beslut för vanlig NLHE,2–6 spelare,
inklusive flop och kortare stackar. Träning med låtsaspengar,0kr. Användaren
har delegerat rutinval och begärt fortsatt konkret arbete utan fler designfrågor.

## Tekniskt val

1. Prova den redan pinnade b-inary-källans riktiga flopstöd mot användarens
   monotona JQK-flop. Mät minne/tid/rotpottsnormaliserat bästa-svarsfel före
   produktaktivering. Inga nya egna solveralgoritmer eller ranger som bara
   valts för att få ett grönt prov. HU-källan får aldrig användas som multiway.
2. Hämta officiella Holdem Solver0.93-beta och kontrollera dokumenterade
   exporter/gränssnitt samt konto-/licenskrav. Detta är en ny kandidat för
   alla gator och2–6,inte en redan godkänd eller hastighetsverifierad provider.
   Multiwaymåttet är stabilitet,inte exploaterbarhet. Gratis endast under beta.
3. Separat granskning av fri kortstackdata. ART100BB får inte döpas om till
   en40BB-lösning. HU-push/fold får inte bli en full multiwaylösning. Undvik
   datakällor vars fria tillgång inte omfattar lokal export.

## Genomförande och bevis

- [x] Källspår: primära dokument,licens,version,exportgränssnitt,felmått.
      Extern autentiserad drift och återläst export är fortfarande inte verifierade.
- [x] Kör begränsade verkliga flopprov och spara råutfall,även negativa.
      b-inary missade minne/tid/kvalitet; Holdem Solver3p stoppades under initiering.
- [ ] För användbar kandidat: rött kontraktprov för modell,handling,hand,
      stack,range och cancel; därefter adapter utan numeriska solverändringar.
- [ ] Kör installerad motor genom provider/router och appen. Skilj
      syntetiskt funktionstest från en faktisk aktuell Edgehand.
- [ ] Dokumentera faktiskt tillagd täckning och exakt kvarvarande blockerare.

Historisk status2026-11-08 natt: ingen ny täckning tillagd. Faktiska blockerare och negativa
råutfall finns i `../holdemsolver-qualification-2026-11-08.md`. De återstående
adapter-/appstegen är inte uppnådda genom att dokumentationen är färdig.
Användaren har själv hanterat konto och inloggning; inga fler frågor önskas.

Ingen köp-,konto-,villkorsacceptans-,publicerings- eller pushauktorisering
infereras av denna plan. Kontoskapande/avtalsacceptans hanteras först om
kandidaten visar ett användbart gränssnitt och kräver det för nästa test.

## Uppföljning2026-11-08 förmiddag

- [x] Gratis40BB cashreferens importerad från pinnad RangeConverter-PDF:
      35 tabeller, förenklade50/50-mixar, källkontroller och saknad-hand-mask.
- [x] Installerad data genom provider/router och Windows-UI:40,5BB,AA iCO,
      sex utdelade, synlig höjning till0,04EUR100%. Beslut döljs efter stoppat
      syntetiskt flöde.2–6 positionsmappningar testade;2–5 är referensmappning.
- [x] Holdem-minnesorsak preciserad:2048MB checkpointreserv utlöstes vid1118MB
      fritt systemminne, inte bevisad trädexhaustion.20000 nya iterationer
      gick utan stopp när mer RAM var ledigt, men tog19s till färdig export.
- [x] Autentiserad läsning av status och faktisk per-combostrategi fungerar.
- [ ] Nya automatiska API-jobb:403compute_not_granted kvarstår.
- [ ] Kvalificerat brett flopstöd för2–6, minnesstabilitet under låg-RAM-last,
      få sekunder till beslut och verifierat kvalitetsmått saknas.
- [ ] Fullständig kortstacktäckning; ny källa täcker endast40BB-referensen
      vid30–50BB och sina35 matchande linjer.

Se `../shortstack-and-holdem-2026-11-08.md` och dess råevidens. Fullmålet är
fortsatt inte uppnått.56riktade tester och importprov passerar; fullsvit
421pass/20skip/1WASM-tidsgränsfel, isolerat återprov passerar; bygge passerar.
Senare komplett körning utan samtidig PDF-kontroll:422pass/20skip/0fel,
226,26s, oförändrade tidsgränser. Det tidigare negativa utfallet behålls.

## Senare fortsättning2026-11-08

Officiell login/diagnostik/CLI/frontend granskade ytterligare; allow_execute:true
men externt nytt jobb fortfarande403compute_not_granted. Vanlig Edgeöppning
av officiella gatewayn avvisas local_origin_required. Ingen extern legitim
grantväg verifierad; ingen identitet eller cookie kopierad.
Ett återupptaget3p-prov läste ärvd handrad3,780s och första observerade
uppdaterade rad6,752s före hel export25,118s. Ingen kall2–6-garanti eller
2%-grind uppnådd. Läs ../holdem-stream-2026-11-08.md. Adapter-/appmålet
för flop är därför fortsatt omarkerat. Oförstörande komprimering av gamla
beroendebyggfiler gav cirka0,85GBuppmätt plats; två raderingar avvisades av
automatisk verktygskontroll. Ingen produktkod ändrad denna fortsättning.
