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
