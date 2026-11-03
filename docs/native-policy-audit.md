# Oberoende kontroll av native-strategin

Datum: 2026-11-03, Codex. **Inte ett generellt GTO-godkännande eller en ny appversion.**

## Vad som faktiskt kontrolleras

Native-kommandot `advisor-audit` exporterar den tränade medelstrategin från ett
avgränsat riverspel. Det använder native-spelmotorn och MCCFR, exakta privata
par på aktuell gata och den viktade gemensamma kortsamplern. Exporten omfattar
alla publika grenar, även handlingar med noll nuvarande policyvikt.

En separat TypeScript-kontroll bygger sitt eget publika spel, räknar alla
kompatibla privata givningar och använder sin egen JavaScript-handvärderare.
Den jämför exporterade stackar, insatser, potter, turordning och lagliga
handlingar vid varje publik nod. Den läser bara handlingsfrekvenser; native-
solverns EV, CFV, terminalutbetalningar och regret används inte som facit.

Bästa motstrategin väljs efter att dolda givningar summerats för varje egen
hand och offentlig historik. Den får inte se motståndarnas privata kort.
Adaptertestet kalibreras mot ett analytiskt känt tvåpersonersspel och avvisar
saknade grenar/handlingar, fel stackar/bräde samt felaktiga privata rader.

## Modellen i dessa mätningar

- Alla spelarantal **2–10**, tre frön: 395, 396, 397.
- River `Ah Kd 7c 4s 2h`; två exakta händer för de första tre platserna,
  en hand för övriga. Fyra kompatibla givningar för 2p, sex för 3–10p.
- Varje spelare har investerat 100 marker och har 90 kvar. Check/all-in är
  hela den lagliga handlingsmenyn i native-fixturen, inte efterhandsprunade råd.
- Ingen rake, lika stackar. Trepersonersfallen körs också med 0,2/0,8-vikter
  i första spelarens range.
- Enkel tråd, 100 000 uppdateringar i grundserien; 1 000 000 i en separat
  serie för 3/10 spelare. Varje rapport anger faktiskt slutförda iterationer.

Detta är små specificerade ranger och en kort beslutsgata. Det mäter inte
preflop/flop/turn, breda ranger, större stackar eller hela livehistoriken.

## Observerat resultat över tre frön

NashConv nedan är **summan av förbättringarna vid bästa ensidiga avvikelse**,
som procent av startpotten. Det är inte samma mått som HU-solverns
exploaterbarhet. Intervallen är min/max mellan frön, inte konfidensintervall.

| Spelare / ranger | 100 000 uppdateringar | 1 000 000 uppdateringar |
| --- | ---: | ---: |
| 2 | 0,475–0,942 % | Ej körd |
| 3, lika vikter | 1,249–1,609 % | 0,524–0,634 % |
| 3, viktad första range | 1,225–1,339 % | 0,493–0,539 % |
| 4 | 1,660–1,929 % | Ej körd |
| 5 | 1,592–1,795 % | Ej körd |
| 6 | 1,557–1,859 % | Ej körd |
| 7 | 1,664–1,832 % | Ej körd |
| 8 | 1,553–1,744 % | Ej körd |
| 9 | 1,687–1,792 % | Ej körd |
| 10 | 1,875–2,389 % | 0,618–0,674 % |

Alla 39 fall passerade protokoll-/spelmatchning och oberoende kontroller av
nollsumman samt icke-negativ förbättring. Det betyder inte att strategin nått
ett förutbestämt generellt kvalitetsmål. Vid 10p och en miljon uppdateringar
saknade 2 211–3 008 av de efterfrågade informationsmängderna tränad medelpolicy.
De exporterades uttryckligt som otränade med uniform fördelning och ingår i
orakelns uppmätta profil; de doldes inte med standard-call.

Native-tiden för träning och byggande av exporten var 682–711 ms för dessa
miljonuppdateringsfall med 3p och 1774–1789 ms med 10p. Processstart, JSON-
serialisering till fil och den separata kontrollen ingår inte i dessa tider.
Det är inte end-to-end-latens eller en fullrange-benchmark.

[Sammanställning](evidence/native-policy-quality-summary-2026-11-03.json),
[grundseriens 30 fall](evidence/native-policy-quality-2026-11-03.json) och
[längre seriens 9 fall](evidence/native-policy-quality-long-2026-11-03.json).
Riktiga indata och profiler för frö 395 sparas i evidenskatalogen för båda
trepersonersmodellerna och båda budgetarna. Större råprofiler finns lokalt
under ignorerade `artifacts/native-policy-quality/` och kan återskapas.

## Exportprotokoll och reproduktion

JSON-inmatningen anger `board`, `ranges` med exakta `cards` och positiva
`weight` högst 1, `investment`, `stack`, `iterations`, `timeBudgetMs` och `seed`.
Auditprotokollet kräver river, 2–10 spelare, 1–16 händer per plats, tidigare
investering 2–1 000 000 marker, positiv stack högst denna investering,
högst två miljoner iterationer och 120 s.
Input är begränsad till 1 MiB och export till 20 000 publika noder.
Sökningen efter en första kompatibel giv är begränsad till 100 000 prefixbesök.
Det är ett forskningsgränssnitt, inte appens generella liveadapter.

Samma frö ska ge samma kortdragningar vid kontrollerad enkeltrådskörning.
En regression visade att subgame-koden tidigare ignorerade `TrainConfig.seed`;
det är rättat. Olika frön är nu faktiska olika körningar.

Från projektroten efter byggning enligt
[native-instruktionen](../research/noregrets/README.md):

```powershell
$env:POKER_NATIVE_POLICY_PROBE='1'
npx vitest run tests/native-policy-quality.test.ts --maxWorkers=1
$env:POKER_NATIVE_POLICY_LONG='1'
npx vitest run tests/native-policy-quality.test.ts --maxWorkers=1
Remove-Item Env:POKER_NATIVE_POLICY_LONG
Remove-Item Env:POKER_NATIVE_POLICY_PROBE
```

Proben skriver delresultat med `complete=false` tills hela serien avslutats.
Ingen kvalitetsgrind får använda ett ofullständigt körningsunderlag.

## Kvar före generella råd

Den enkla multiway-medelstrategin behöver jämföras med en härledd korrekt
averagingmetod och aktuell strategi. [OpenSpiels primärimplementation](https://github.com/google-deepmind/open_spiel/blob/master/open_spiel/python/algorithms/external_sampling_mccfr.py)
beskriver begränsningar hos enkel averaging för fler än två spelare och erbjuder
en separat full uppdatering. Den enkla varianten används ändå där som standard
av empiriska skäl. Detta är ett skäl till kontrollerad jämförelse, inte ett
bevis för att just denna återstående NashConv orsakas av averaging.

Framtida gators abstraktion, modell-/beroendeidentitet, faktiskt tränade breda
blueprints och strukturerad appintegration återstår. De nuvarande native-
rapporterna är märkta `eligibleForAdvice=false` och `goalReady=false`.

## Efterföljande jämförelse: medelstrategi och aktuell policy

`advisor-policy-comparison.patch` var den kumulativa forskningspatchen för jämförelsesteget.
Varje exporterad rad innehåller nu både `frequencies` (medelstrategi) och
`currentFrequencies` (regret-matching från sista träningstillståndet).
Båda läses efter avslutad träning ur samma tabell; ingen andra träningskörning
eller nytt slumpfrö skiljer dem åt. Appens standardval har inte ändrats.

De två vyerna kalibrerades med ett analytiskt känt spel där den uniforma
medelpolicyn har NashConv 1,5 marker och en separat optimal aktuell profil 0.
En regression som förväxlade vyerna föll före rättningen och passerar nu.
Native-gettern testades separat mot olika regret-/medelvikter.

Samma 39 fall och budgetar kördes om. Alla **57 024 medelstrategirader** matchar
föregående profiler inom 1e-12; NashConv matchar inom 1e-10. Medelstrategin gav
lägre NashConv i **38 av 39** fall. Enstaka aktuell-policy-fördel vid 10p/100k
motiverar inget generellt metodbyte.

| En miljon uppdateringar | Medelstrategi | Aktuell policy |
| --- | ---: | ---: |
| 3p, lika vikter | 0,524–0,634 % | 4,252–7,080 % |
| 3p, viktad första range | 0,493–0,539 % | 3,176–4,644 % |
| 10p | 0,618–0,674 % | 1,780–4,265 % |

[Hela jämförelsen](evidence/native-policy-view-summary-2026-11-03.json) och
[de längre parade körningarna](evidence/native-policy-view-quality-long-2026-11-03.json).
Intervallen är min/max över de tre fröna och avser samma lilla spel som ovan.
Detta visar inte att enkel averaging är teoretiskt korrekt för alla
flerpartsspel; det visar att ett direkt byte till aktuell policy inte löser
det uppmätta kvalitetsgapet i denna kontrollserie.

Täckningsflaggorna har olika betydelse: `trained` kräver positiv medelmassa,
medan `currentVisited` bara betyder att regret-noden finns. Det senare är
inte bevis på konvergens eller tillräcklig träning. Båda vyernas saknade rader
ingår som uttrycklig uniform policy i orakelvärderingen.

Senaste fulla native-sviten gav **157 pass/1 fel**: det tidigare observerade
pruningtestet fick AA-call 74,1 % mot kravet över 80 %. Fyra isolerade
upprepningar med en/fyra Rayon-trådar passerade; den fallerade breda körningen
behålls. Den online-sökning som jämförs här kör utan pruning. Detta fel får
inte döljas eller användas för att kvalificera framtida pruning-blueprints.
Modell-/beroendebindning och en pruning-fri träningspilot prioriteras nu;
större modellträning ska inte utgå från att den vägen är kvalitetsgodkänd.

Implementationen följer projektets låsta Serde 1.0.228/serde_json 1.0.150 och
befintliga clap 4.6.1-mönster. Referenser för
[strikt Serde-inläsning](https://serde.rs/container-attrs.html) och
[JSON från bytebuffer i rätt version](https://docs.rs/serde_json/1.0.150/serde_json/fn.from_slice.html).

Det efterföljande [checkpointsteget](native-checkpoint-format.md) använder den
nya kumulativa `advisor-checkpoint.patch`. Tidigare mätningar ovan behålls med
sina egna källhashar. En ny 30-fallsserie för varje antal 2–10 finns i
[checkpointens policykontroll](evidence/native-policy-checkpoint-quality-2026-11-03.json).
Det nya checkpointformatet ger inte blueprint-exporten generell spelbindning.
