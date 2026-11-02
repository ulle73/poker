# Granskning av möjliga strategikällor — 28 oktober 2026

Ingen av de granskade källorna ger en verifierad, fritt återanvändbar generell
NLHE-strategi för 2–10 spelare. Det motiverar inte att märka den underkända
experimentmotorn som färdig. Tabellen beskriver kontrollerade begränsningar,
inte en fullständig inventering av allt som kan finnas på marknaden.

| Källa | Verifierad leverans / begränsning | Beslut |
|---|---|---|
| [TexasHoldemAoFGTO](https://github.com/CARL-JOSEPH-LEE/TexasHoldemAoFGTO) | Faktiska binärstrategier för 2/3/4 spelare, lika 10 bb, all-in/fold, med separat provenance och MIT. | Relevant referens för en strikt matchad träningsmodell; får inte användas som vanlig NLHE-strategi. |
| [poker-practice](https://github.com/jensbaagaard/poker-practice/blob/main/data/openSourcePokerData/README.md) | Nedladdningsbara JSON-ranger, men README beskriver extraktion ur en annan apps JavaScript. Ursprunglig solverkonfiguration och datarättigheter är inte verifierade. | Importeras inte som verifierad GTO. |
| [CFR-NLHE-6max v0.6.0](https://github.com/dberweger2017/CFR-NLHE-6max/blob/main/docs/releases/v0.6.0/MODEL_CARD.md) | Tränade modeller för tre lika 100 bb-stackar, utan rake/ante, begränsad meny. Modellkortet redovisar negativa tester, uniform fallback, avsaknad av Nash-bevis och olöst originallicens. | Arkitekturreferens; inte en godkänd generell ersättning. Stora modellfiler har inte laddats ned. |
| [gto-open](https://github.com/zwarag/gto-open) | README beskriver en plan för en databas, men inget strategidataset är levererat i repot. | Ingen importerbar data. |
| [GTOpen](https://github.com/star7js/gtopen) | Dokumenterar HU-postflop och en approximativ preflop-fortsättningsmodell. Förklarar själv att full multiway genom river inte löses. | Ingen grund för att hävda generell GTO-täckning. |

## Den befintliga solverns verkliga gräns

Upstream-Postflops WASM-källkod har chance-noder och stöd för större postflopträd.
Till och med 1.3.1 krävde vår konfigurationsvalidator fem kort och JavaScript-
adaptern avvisade chance-noder. Det var en adapterbegränsning, inte bevis för
att upstream matematiskt bara kan river.

Version 1.4 har en separat begränsad HU-turnväg med korrekt chance-/reach-
mappning, oberoende best-response-kontroll och uppmätta minnes-/tidsbudgetar.
64 MiB behålls och den vägen tillåter 5000 publika noder; riverträningslägets
250-nodsgrind är kvar. Flop avvisas före preflight. Se
[turn-evidensen](evidence/turn-solver-verification.json). Detta löser inte
multiway eller automatiskt härledda ranger.

Officiell implementationsreferens för symmetrier och exakta postflopträd:
[Postflop Solver](https://b-inary.github.io/postflop_solver/postflop_solver/).
Färg-isomorfism kan minska arbete när rangerna tillåter den; det är ingen
konvergensgaranti eller ersättning för en validerad fortsättningsmodell.

## Fortsatt kvalitetsarbete

1. Behåll mätbara egna regressioner och experimentgrinden.
2. Utvärdera symmetrier/abstraktioner och offline träning med fristående
   strategikvalitetskontroller; fler rotbesök räcker inte.
3. Villkora ranger på faktiskt observerade handlingar med en strategimodell.
4. Utvidga verifierad solver-/datatäckning endast när den matchar verkligt
   spelarantal, stackar, regler, sizing och historik.

Källor har endast lästs. Ingen extern modell, osäkert extraherad range eller
kommersiell tjänst har importerats eller köpts.

## Ny granskning 2 november 2026

Ytterligare primärkällor kontrollerades eftersom kall onlineträning fortfarande
ger otillräcklig strategitäckning:

| Källa | Aktuell kontrollerad begränsning | Beslut |
| --- | --- | --- |
| [NoRegrets](https://github.com/conorarmstrong/noregrets) vid `757f769` | MIT-kod för förträning och sökning, publikt 2–6 spelare. Tränade modeller ingår inte. Granskningen fann regel-, sampling- och artefaktbindningsfel samt grov kortabstraktion. | Isolerad lokal Windows-kandidat med rättade bettingregler och tester för 2–10. Ingen inkoppling i appen eller kvalitetscertifiering. [Detaljer och reproduktion](../research/noregrets/README.md). |
| [GTO Wizard partner-API](https://developers.gtowizard.com/) | Dokumenterade API:er är handhistorikbedömning och FairPlay för partners; sidan tillhandahåller ingen generell automatiskt tillgänglig strategileverans för detta bord. | Ingen ersättning har identifierats via dessa dokumenterade gränssnitt. |
| [Pokerai](https://pokerai.bet/docs) | Realtidssolverns dokumenterade indata är OOP/IP-ranger. Flop anges kunna ta cirka 70 sekunder. API-nyckel och kvoter krävs. | Löser inte den granskade flerparts- och latensluckan. Ingen nyckel eller tjänst har beställts. |
| [pokerapi.ai](https://pokerapi.ai/) | Marknadsför bred täckning men beskriver uttryckligen AI-genererad analys för bland annat flerpartshänder utanför solverdatabasen. | Uppfyller inte kravet på riktiga strategier i dessa lägen. |
| [MonkerSolver](https://monkerware.com/solver.html) | Leverantören anger alla gator och valfritt spelarantal, GUI samt fullversion för 499 euro; gratisversionen är begränsad till turn/river. | Potentiell separat solver, men automatiserbar integration och faktiska modell-/prestandagränser är fortfarande inte verifierade. Ingen licens har köpts. |

Kandidatens regelrättningar och byggbarhet är verifierade separat från dess
strategikvalitet. Dess större testsuite har kvar två fallerande strategitester.
En lyckad kompilering får inte användas som stöd för att visa generella GTO-råd.
