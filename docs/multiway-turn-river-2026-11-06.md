# Gratis 3–6 aktiva på turn/river: aktuell kvalificering

Datum: 2026-11-06, Europe/Stockholm. Beställningen gäller träning med
låtsaspengar. Gratis källa, några sekunders svarstid och verkligt uppmätt
2 %-fel i den lösta modellen kvarstår. Äldre egna solverexperiment ska inte
återstartas. **Utökningen är inte levererad.**

## Resultat

Ingen granskad kandidat kan kopplas in som verifierat gratis stöd för hela
3–6-spelarkravet på båda gatorna med aktuell kvalitetsgräns och styrkt latens
på denna dator. Detta är granskningsresultatet, inte ett bevis för att en
sådan motor omöjligen kan finnas eller byggas. Befintlig HU-integration är
oförändrad. Ingen okvalificerad ersättare har aktiverats.

| Källa | Verifierat och kvarstående hinder |
| --- | --- |
| [Zeta CLI](https://github.com/lewismj/zeta/blob/acd8f042b1271cd16ecdff3c4fbd5f11105450e5/doc/holdem/cli_usage.md) | Ren ny shallow-checkout vid aktuell HEAD `acd8f042b1271cd16ecdff3c4fbd5f11105450e5`. Multiway river finns; turn avvisar N != 2. Multiway ger normaliserad regret och `exploitability_available=false`, inte 2 %-kontrollen. Dokumenterad multiway-EV-normalisering ignorerar dessutom kortkollisioner mellan motståndare. |
| [MonkerSolver Free](https://www.monkerware.com/solver.html) | **Faktiskt testad FREE10114:** alla åtta 3–6 × turn/river exporterade i små check/all-in-träd, 1,136–4,460 s till fil vid ratio1. Sexvägs turn ratio10 tog30,174 s. Binärt arkiv läsbart; komplett policy-/EV-kontrakt och uppmätt2%-mått saknas fortfarande. Ingen appanslutning aktiverad. Se [fullt test](monker-free-test-2026-11-06.md). |
| [NoRegrets](https://github.com/conorarmstrong/noregrets#licensing) | Fri MIT-kod för 2–6 med resolver; förtränade blueprints publiceras enligt utgivaren aldrig och licensieras bara kommersiellt. Självträning skulle återstarta stoppat forskningsspår. Ingen gratis kvalificerad policy hämtad. |
| [donksolver](https://pypi.org/project/donksolver/) | MIT och Windowsstöd. Utgivaren anger ingen NLHE best response eller uppmätt färdig multiwayblueprint. Standardpresets avslutar multiwayflop med checkdown; alternativ kräver träning. Rot-EV-stabilitet är inte ett 2 %-Nash-gap. |
| [Holdem Solver](https://holdemsolver.com/) | 2–9 spelare annonseras, gratis endast under beta med framtida pris okänt och konto krävs. Multiway ger uttryckligen strategisk stabilitet, inte exploaterbarhet. Ingen konto-/installationsåtgärd utförd. |
| [Prism](https://prismsolver.com/pricing) | Gratis Viewer löser inte egna modeller; solve/CLI kräver betallicens. Produktsidan anger dessutom minuter för laptop-postflop och inget stöd för liveintegration. Inte en kvalificerad gratis kandidat här. |

Zetas sökindex innehöll bredare text om multiway på alla gator än faktisk
Git-HEAD och CLI-dokumentation. Slutsatsen följer den hämtade låsta koden.

## Reproducerbar källkontroll

Lokal kopia: `.research/zeta-multiway-review`, ignorerad av Git, oförändrad.
Faktiskt körda kommandon:

```powershell
git ls-remote https://github.com/lewismj/zeta.git HEAD
git clone --depth 1 https://github.com/lewismj/zeta.git .research/zeta-multiway-review
git -C .research/zeta-multiway-review rev-parse HEAD
git -C .research/zeta-multiway-review status --short
```

HEAD är revisionen ovan; status är tom. I
`zeta/holdem/src/cli/solve_cli.h:2562` avvisas andra spelarantal än två i
multi-street-solven. Rad 1537 har också `static_assert(N == 2)`.
`doc/holdem/cli_usage.md:115` anger HU-only turn/flop. Rad 189–193 skiljer
HU best response från multiway-regret; rad 278–279 beskriver EV-normaliseringen.
Filhashar och källor sparas i `evidence/multiway-candidates-2026-11-06.json`.
Inget nytt Zeta-bygge eller benchmark gjordes: täckning/kvalitet kvalificerar
inte en liveanslutning. Äldre småmodellprov i multiway-research.md är historik.

Monkers officiella installer-URL kontrollerades med HTTP HEAD: 31 729 454 byte,
Last-Modified 2020-06-06 enligt servern. Detta bevisar inte releaseversion.
Denna inledande granskning gjordes före nedladdning och faktisk körning.
Den är nu kompletterad med [Monkerproven](monker-free-test-2026-11-06.md),
inklusive tio exporter, arkivläsare, faktiska tider och bevarade misslyckanden.

## Nästa konkreta steg

Fortsatt [prestandakontroll med 13 prov](monker-performance-2026-11-06.md) gav
14,030/14,819 s för samma sexvägs turn/ratio10, mot dagens fyrtrådsprov 21,778 s.
Det ersätter 30,174 s som bästa observerade tid, men inte behovet av verifierad 2 %.

Monkers beräkning och batcharkivexport är nu funktionstestade. Före automatisk
anslutning behövs verklig komplett export och dokumenterat anropssätt för samma
3-/6-spelarmodell: nodpolicyer, kombinationsfrekvenser, belopp och definierad EV.
Därefter krävs ensidiga bästa-svarsvinster (NashConv eller uttryckligt övre
felbound) och faktisk tid/minne. Iterationer, regret eller stabilitet kan inte
ersätta det beviset. Ett litet godkänt exempel kvalificerar endast exemplet.
En annan ny fri motor/strategileverans behöver motsvarande underlag.

Inga produktkodändringar, provideraktiveringar, egna träningsjobb, konton,
leverantörsmeddelanden, köp eller betalda anrop har gjorts. Tester kördes inte
om för enbart dokumentation; tidigare 371-pass-resultat är historik.

## Liveevidens hålls separat

Föregående kontroll 2026-11-06 verifierade nya Edge-flikens automatiska
överföring och handbyten, bland annat 12626626315, inte ett nytt solverråd.
Användaren har därefter rapporterat fungerande HU-river. Turnbilden med hand
12626640668 visar tre aktiva och avslag för saknad multiwaymotor. Det är
användarens bild, inte ett nytt självständigt GUI-test.
