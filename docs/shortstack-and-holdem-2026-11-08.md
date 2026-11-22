# 40 BB cash och uppföljning av Holdem Solver

2026-11-08. Användaren har begärt fortsatt arbete utan frågor. Det fulla målet
gratis flop för 2–6 och komplett kortstackstrategi är fortfarande inte uppnått.

## Tillagd kortstackkälla

RangeConverters kostnadsfria 40 BB 6-max cash-PDF har hämtats och lästs lokalt:
https://rangeconverter.com/downloads/6-max-40bb-Poker-Charts-No-Limit-Texas-Holdem-Cash
5 142 816 byte, SHA256
`a1723be2a7ac0e61b7a1342e1ebe7e778747bb2197572bf8fb0a877610e18799`.
Det är cash med PokerStars 500z som referens, inte MTT med ante.

`scripts/install-shortstack.py` läser diagrammens inbäddade bilder. Källfilens
hash, sidantal, bildstorlek, färgmixar och handordning kontrolleras. En mörk,
icke ankommande hand i ett svar på 3-bet blir uttryckligen saknad täckning,
inte Fold100%. Betstorlekar binds till de visuellt granskade teckenförklaringarna.
Inga leverantörsskript körs och ingen solveralgoritm har skrivits om.

35 tabeller: fem RFI, femton svar på RFI och femton svar på 3-bet efter egen
öppning. De återger **diagrammens förenklade 50/50-mixar**. De numeriska
summeringsraderna i originalet kan avvika från de förenklade rutorna; exempelvis
SB:s RFI blir cirka46,00% höjning och7,69% limp i den importerade grafiken,
medan originalets summering anger42,00% respektive11,53%. Därför används inga
summeringsprocenter för att fylla i eller ersätta enskilda handfrekvenser.
Detta är en förenklad tabellreferens, inte exakt originalsolverdata eller
en oberoende2%-lösning.

Källans huvudstorlekar: öppna2BB, SB3BB; 3-bet IP5,5BB, SB8BB mot tidig öppning,
SB7BB mot BTN, BB8BB. UTG kan i vissa linjer 4-betta12 eller14,5BB och/eller
gå all-in. Alla faktiska källhandlingar valideras mot aktuell laglig handling.
Godtyckliga höjningar, limps och squeezes får inget ersättningsråd.

Appen väljer denna40BB-referens vid30–50BB effektiv startstack mot djupaste
kvarvarande motspelare; faktisk och modellerad stack visas separat. Detta är
en uttrycklig referensmarginal, inte separat lösta30/50BB-modeller. Därefter
finns tidigare ART/GTO100BB-referens vid50–150BB kvar. Vid50BB prioriteras40BB.
HU4–20BB använder tidigare HoldemMath push/fold. Andra korta cashdjup saknas.
2–5 utdelade spelare mappas till6-maxmodellens sena positioner; dessa är inte
separata HU/3/4/5-maxlösningar. Tidigare observerad position, handlinje och
storlek styr uppslaget. Topp50%-rangordningen används inte för dessa beslut.

Installerad kompilerad JSON SHA256:
`04f03ee2f184b5869d5b610e66fdce28edebe519743932d1d31ac05710539bf4`.
Backend kontrollerar både denna hash och att handordningen motsvarar biblioteket;
klient och router binder resultatet till rätt källa och40BB-modell. Original-PDF,
manifest och data ligger endast i användarens lokala preflopinstallation.
Ingen permissiv vidarelicens antas och ingen källdata paketeras i Git/bundlen.

## Holdem Solvers verkliga minnesorsak

En mer detaljerad läsning av våra syntetiska jobbs status visar att nattprovet
stoppades av **2GB reserverat checkpointminne** när Windows hade1117,6MB ledigt.
Processen använde då49,2MB. Vi hade därför inte visat att själva trädet var för
stort. Minnesvakten var fortsatt påslagen.

Samma projekt återupptogs via den redan inloggade officiella UI-vägen när mer
fysiskt minne var ledigt.200 nya iterationer slutfördes:202 totalt, UI/server
4s, numerisk träning0,134s, cirka444MB RSS och2188MB ledigt vid sista mätningen.
Ingen minnesvakt utlöstes. Det är en fungerande liten beräkning under bättre
belastning, inte en permanent lösning för ett belastat system eller verifierad
3–6-täckning.995/1176 rotkombinationer saknar ännu samples efter detta lilla prov.

Den importerade gamla treeprofilen hade dessutom `allow_donk:false` trots
`allow_oop_bet:true`. Därför var första SB-nodens enda modellhandling Check.
Det är inte ett bevis på100% optimal check i det verkliga bordet. Försöket
med9s9h via combo-API visade visits0 och `unvisited_uniform_initialization`.
Ingen sådan rad får bli ett användbart appbeslut. Ingen Holdem-provider har
aktiverats och leverantörens kod har inte ändrats.

Ett större återprov via samma officiella UI-väg kördes därefter med20000 nya
iterationer och en tråd. Jobb `20261108T093406_continue_ee783d` slutfördes med
20202 kumulativa iterationer,5,061s träning och19s inklusive full återupptagbar
export. Minnesvakten var påslagen och utlöstes inte; sista RSS459,1MB och
3348,9MB fritt systemminne. Rotens1176 kombinationer hade nu alla behållen
tränad strategi;9s9h hade17besök och `retained_native_exact_average`.
Det tidigare påståendet om995 osamplade händer gäller alltså200-iterationsprovet,
inte detta senare prov. UI markerade ändå `DRAFT QUALITY`, iterationsgräns och
`NASH GAP PROXY 16.87 BB/SEAT`. Detta proxyvärde är inte2% exploaterbarhet.
Den gamla profilens check-only-rot kvarstår också.19s till färdig export,
utkastkvalitet och API-spärren uppfyller inte appens flopmål.

## Anslutningen: läsning fungerar, nya jobb kräver separat tillstånd

Leverantören genererar en lokal API-specifikation under runtimekatalogen.
Runner är127.0.0.1:8807 med Bearer-autentisering. Den redan existerande lokala
API-nyckeln användes endast i headers till samma loopbacktjänst, utan att skrivas
till rapporter eller klientkod. Health, jobbstatus och per-combostrategi lästes
framgångsrikt. Detta är ny faktisk läsverifiering, till skillnad från nattens
enbart kartlagda API.

Ett normalt POST /solve med egen syntetisk begäran gav däremot HTTP403,
`compute_not_granted`: inget compute grant från kontotjänsten presenterades.
Den befintliga runnernyckeln autentiserar klienten men ger inte detta separata
beräkningstillstånd. Gatewayns /app/session visade inte den externa klienten
som inloggad. UI:s egen inloggning fungerar och kan skapa nya tillåtna jobb.
Inga kontocookies, lösenord eller kontotillstånd kopierades, ändrades eller
kringgicks. Sessionsdatabasen har inte öppnats. Varken en stödd extern
grantförfrågan eller permanent automatisk jobbstart har verifierats.

`ultra_light` är leverantörens befintliga strategi-sparläge, men ett nytt sådant
API-jobb kunde inte startas utan grant. Ingen minnesvinst för detta läge har
därför mätts. Det får inte beskrivas som en levererad minnesfix.

## Verifiering

* Nya routingprov skrevs och observerades först fallera på40,5BB-stackgränsen.
  Efter implementation:21pass i routing-/historikproven.
* Importprovet upptäckte först en felavläst golden-förväntan förK6s. Förstorad
  källruta och direkt pixelrad visade50%, förväntan rättades. Inga frekvenser
  justerades för att få testet grönt. Slutligt importprov passerar.
* Installerad katalog, provider,2–6 positionsmappningar, storlekar, all-in och
  källgrind/UI:56 riktade tester passerar. 40,5BB kommer från40BB-källan.
* Fullsvit:421pass,20skip,1fel,254,86s. Felet var befintliga
  `postflop-wasm.test.ts:87`, oberoende kontroll genom river-chanssteget:
  testet tog6400ms mot5000ms tidsgräns. PDF-importprovet kördes samtidigt;
  belastningspåverkan är en möjlig orsak, inte fastställd rotorsak.
* Samma WASM-test separat, utan ändrad gräns:1pass,16skip,9,31s totalt.
  Fullsviten redovisas fortsatt som ett misslyckat körningstillfälle.
* Ny komplett körning utan samtidigt PDF-importprov:422pass,20skip,0fel,
  40godkända/6överhoppade filer,226,26s. Ingen tidsgräns eller testlogik ändrad.
  Båda fullsvitskörningarna sparas; skillnaden bevisar inte ensam rotorsaken
  till det första tidsgränsfelet.
* Första bygget hittade TS7022 på en lokal aktörsvariabel. Explicit
  `actor:string` rättade typinferensen; efterföljande `npm run build` passerade.
* Omstartad riktig Windows-app, installerad datakatalog och syntetiskt flöde
  genom den parade lokala mottagaren:sex utdelade säten, CO medAA,40,5BB,
  UTG/HJ foldade. UI visade RangeConverter40BB, faktisk40,5BB och höjning till
  0,04EUR100%. Rent tabelluppslag avrundades till0ms. Detta är inte total
  ende-till-ende-latens. Skärmbild och AX-text har sparats.
* När det syntetiska flödet stoppades doldes beslutet och UI visade
  `Inväntar färsk avläsning`. Ingen riktig pokerhandling utfördes.

Råunderlag: `docs/evidence/shortstack-2026-11-08/`. Ingen aktuell Edgehand är
verifierad genom dessa syntetiska prov. Fullt automatiskt Holdem-flopstöd och
fullständig kortstacktäckning återstår.

## Fortsättningspunkt

Kortstackdelen ovan är installerad och fungerar i appen för matchande linjer,
inte samtliga korta djup. Den dyraste obevisade förutsättningen för Holdem är
fortfarande att breda2–6-vägs flopmodeller kan få användbar kvalitet och färdig
export inom några sekunder på denna dator. Ett större prov tog19s redan med3p.
Extern jobbstart behöver dessutom en leverantörsstödd väg som tilldelar ett
giltigt compute grant till klienten. Runnerns egen API-nyckel räcker inte.
Läsning av färdig strategi fungerar; det får inte beskrivas som automatisk
nyberäkning eller aktiv flopprovider. Inga kontocookies eller grants ska
hämtas ur kontodatabasen för att kringgå detta. Ingen garanti om permanent
gratis beta eller verifierad multiway2%-kvalitet finns.
