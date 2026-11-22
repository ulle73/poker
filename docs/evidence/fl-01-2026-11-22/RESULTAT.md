# FL-01 · Trevägsflop efter två checkar

22 november 2026. De två modellerna börjar när båda motspelarna har
checkat till knappen på Q♥ 8♦ 6♥. Potten är 12 BB och minsta bet är 1 BB.
Bettingträdet använder halvpott, höjning med en halv pott efter syn och
all-in enligt de lagliga valen, med högst två höjningar per gata. Båda
modellerna antar jämnt viktade lagliga kombinationer vid beslutet och
ingen rake.

Den återspelade handen innehåller rätt position, bräda, chipbelopp och en
sammanhängande historik från preflop. Med tre kvar, oförändrad pott och
knappen bekräftad att agera kan de två tidigare checkarna härledas även
om deras övergående etiketter inte lästes av. Den automatiska
efteranalysen använder samma fördröjning på tre handbyten som övriga lägen.
Satsningsraderna visar beloppet i BB när stora mörken är bekräftad, med
bordets valuta bredvid. Profilerna matchas mot exakta chipbelopp.

## Första modellen med 8 BB

Knappen kunde välja check, bet 6 BB eller all-in 8 BB. Sex miljoner givar
tog 381,80 s att träna offline. Trädet har 425 noder,
varav 14 beslut på flop, 62 på turn och 122 på river. Uppslagsprovet
kontrollerade att alla 1 176 rotkombinationer har tränade rader och att
en avvikande pott avvisas. Det första uppslagsprovet stannade vid en
assertion som fortfarande förväntade höjningsmodellens handlingsmeny.
Uppslaget passerade efter att provet fick den fixerade checkmodellens
explicita meny som förväntat utfall.
[Träningsrapport](training.json) · [Uppslagsprov](lookup.json) · [Arkiv](profile.zip)

Med 20 dolda givar per eget kortpar och ordnad bräda blev de övre
gränserna 4,773 %, 5,424 % och 5,186 % av potten. Kvalitetsgrinden
på 2,1 % uppfylldes för inget säte. Alla rapporter skrevs efter att
Vitests förvalda tidsgräns på 900 s passerat. Granskningskörningarna
tog 1 328–1 393 s per säte. Ett väntande byggsteg gick också över
sin 15-minutersgräns. Appen fick ingen strategi från den modellen.
[Säte 0](card-grid-seat-0.json) · [Säte 1](card-grid-seat-1.json) · [Säte 2](card-grid-seat-2.json)

## Snävare modell med 6 BB

Knappen kan checka eller satsa 6 BB. Halvpott är samtidigt
all-in när 6 BB återstår. Om knappen checkar fortsätter spelet med
check eller motsvarande all-in-meny på turn och river.

Fyra miljoner givar tog 50,12 s. Trädet har 57 noder. Alla 1 176
rotkombinationer har en tränad rad. Med åtta dolda givar per par och
ordnad bräda gav de oberoende kontrollerna övre gränser på 3,907 %,
4,579 % och 4,243 %. Alla tre körningarna passerade tekniskt efter
258–264 s. Gränserna räckte inte för att kvalificera strategin och
ett exportförsök stoppades av kvalitetskontrollen. [Träningsrapport](6bb/training.json) · [Uppslag](6bb/lookup.json) · [Arkiv](6bb/profile.zip) · [Säte 0](6bb/card-grid-seat-0.json) · [Säte 1](6bb/card-grid-seat-1.json) · [Säte 2](6bb/card-grid-seat-2.json)

## Windows

Paketerad Electron 45.1.0 på Intel Core i5-11300H. Testet skickade
syntetiska snapshots till mottagaren. Handen frigjordes först vid tredje
handbytet. På 6 BB i EUR, 6 BB i SEK med färgbytt bräda och 6,1 BB i EUR
visades täckningsbeskedet efter 223, 124 respektive 100 ms. Ingen av
händerna gav en strategitabell. Tiderna gäller från frigivning till
målat täckningsbesked. [FL-01-rådata](checked-flop-windows.json)

De befintliga kvalificerade tre- och fyrvägsprofilerna efter check → bet
→ raise visades inom 100 ms i respektive exempel. De visade bland annat
`Syna 18 BB (1,8 EUR)` och `Höj till 36 BB (3,6 SEK) (all-in)`.
Windows återspelade också det tidigare heads-up-stödet, all-in-fallen
och den avbrutna satsningshistoriken. [Regressionsprov](windows.json)

Bygget passerade. Av de riktade automatiska testerna passerade 41 och
ett opt-in-prov hoppades över. En ny verklig avslutad Edgehand ingick
inte i körningen.

## Reproducera

Träning körs en gång för den fixerade modellen. Verifieringen använder
separata slumptalsströmmar och verifierar varje säte mot den frysta
strategin med den separata sju-kortsutvärderaren. Stickprovet stratifieras
över alla 1 176 egna hålkortspar och alla 2 162 kompatibla ordnade
runouts per par. Den övre gränsen är en gräns för bästa ensidiga avvikelse
i modellens bettingträd. Varje körning använder felrisk 0,05/6, vilket
reserverar felbudget för högst två kontroller per säte.
[CFR-metoden](https://proceedings.neurips.cc/paper/2009/hash/00411460f7c92d2124a67ea0f4cb5f85-Abstract.html) · [McDiarmids olikhet](https://doi.org/10.1017/CBO9781107359949.008)

```powershell
$env:POKER_RAISED_POSTFLOP_PROBE='1'
$env:POKER_RAISED_POSTFLOP_STREET='flop'
$env:POKER_THREE_WAY_CHECKED_FLOP='6bb'
$env:POKER_RAISED_POSTFLOP_PROFILE='artifacts/fl-01-6bb-profile'
$env:POKER_RAISED_POSTFLOP_OFFLINE='train-chance'
$env:POKER_RAISED_POSTFLOP_TRAIN_DEALS='4000000'
$env:POKER_RAISED_POSTFLOP_OUTPUT='docs/evidence/fl-01-2026-11-22/6bb/training.json'
npm.cmd test -- tests/decision-raised-postflop-probe.test.ts --environment node
$env:POKER_RAISED_POSTFLOP_OFFLINE='tight-card-grid'
$env:POKER_RAISED_POSTFLOP_AUDIT_ENGINE='compact'
$env:POKER_RAISED_POSTFLOP_AUDIT_FAMILY='6'
$env:POKER_RAISED_POSTFLOP_GRID_DRAWS='8'
$env:POKER_RAISED_POSTFLOP_TIMEOUT_MS='2400000'
foreach ($seat in 0..2) {
  $env:POKER_RAISED_POSTFLOP_AUDIT_SEAT=[string]$seat
  $env:POKER_RAISED_POSTFLOP_OUTPUT="docs/evidence/fl-01-2026-11-22/6bb/card-grid-seat-$seat.json"
  npm.cmd test -- tests/decision-raised-postflop-probe.test.ts --environment node
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
$env:POKER_RAISED_POSTFLOP_OFFLINE='lookup'
$env:POKER_RAISED_POSTFLOP_OUTPUT='docs/evidence/fl-01-2026-11-22/6bb/lookup.json'
npm.cmd test -- tests/decision-raised-postflop-probe.test.ts --environment node
```

För 8 BB, sätt `POKER_THREE_WAY_CHECKED_FLOP=1`, träningsgivar till
6 000 000 och profilkatalog till `artifacts/fl-01-qualified-profile`.
Använd 20 dolda givar per par och runout och skriv rapporterna direkt i
evidensmappen. Den första körningen hade Vitests förvalda 900 s som
tidsgräns.

Packa forskningsarkivet med filerna direkt i zip-roten. Använd en ny
temporär profilkatalog om den redan finns. Windows-provet läser bara
produktens befintliga kvalificerade modeller.

```powershell
Compress-Archive -Path 'artifacts/fl-01-6bb-profile/*' -DestinationPath 'docs/evidence/fl-01-2026-11-22/6bb/profile.zip'
npm.cmd run build
npm.cmd test -- tests/hand-review.test.ts tests/decision-providers.test.ts tests/decision-raised-postflop-probe.test.ts --maxWorkers=2
python -X utf8 scripts/verify-hand-review.py 'artifacts/ten-second-windows/Poker GTO Advisor.exe' docs/evidence/fl-01-2026-11-22 --checked-flop
python -X utf8 scripts/verify-hand-review.py 'artifacts/ten-second-windows/Poker GTO Advisor.exe' docs/evidence/fl-01-2026-11-22
```

Windows-provet använder ett ASAR-paket från aktuellt bygge med de filer
som anges i `package.json` under `build.files`. Start med `--verify-review`
gör mottagaren och användarprofilen isolerade från den vanliga appen.
