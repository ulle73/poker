# Förberäknad trevägsflop efter check, bet och raise

22 november 2026. Samma spel som i [föregående trevägsprov](../expanded-three-way-flop-2026-11-22/RESULTAT.md). Floppen är `Qh 8d 6h`, efterfrågade hålkort `Ah Kh`, och alla tre har likaviktade lagliga ranger vid beslutet. Linjen är check → bet 60 → raise till 180. Rotpotten är 360 marker och fortsättningen erbjuder samma satsningsstorlekar på alla gator. Rake ingår inte. Målet är en övre gräns **under 2,1 % av rotpotten för varje spelare** och leverans inom tio sekunder.

## Förberäkning och uppslag

En offlinekörning av outcome-MCCFR med jämn givsampling tränade i **50,33 s**. Den utförde 1 773 971 träningsiterationer och nådde tabellgränsen vid 1 249 854 informationsmängder, utan passiva avkortningar. Exporten sparade **514 532 rader med tränad genomsnittsstrategi** i 50 tabeller. De 721 färgisomorfa raderna vid roten representerar alla lagliga hålkortskombinationer. Otränade rader i fortsättningen använder ett likafördelat reservval. Exporten tog 0,90 s och råtabellerna upptar 12 366 072 byte. [Träningsdata](training.json)

Det första uppslaget i en separat Node-process tog **1,48 ms** från start av uppbyggnaden av beslutet, inklusive inläsning och kontroll av rotfilen. Tjugofem upprepade uppslag med ny inläsning i samma process tog 0,14–0,36 ms. Fold, syn till 180 och all-in till 360 kom tillbaka med exakt samma frekvenser som i träningsprocessen. Arkivet bevarar den exporterade strategin. Windows-vyn, bordets liveavläsning och uppackning ingår inte i tiderna. [Uppslagsdata](audit.json)

Det sparade arkivet innehåller manifest och 50 binärtabeller. Modellen binds till bräda, ranger, säten, bettingtillstånd och regelsamling med SHA-256. Inläsningen kontrollerar varje tabells innehållshash. Den uppackade kopian jämfördes med alla 51 originalfiler. [Fryst profil](profile.zip)

Ett separat prov från det uppackade arkivet fann en tränad rad för var och en av de 1 176 lagliga fysiska hålkortskombinationerna. Ändrad pott avvisades vid modellkontrollen. Det första uppslaget i den processen tog 1,50 ms. [Uppslagsprov från arkivet](archive-lookup.json)

```text
Profilarkivets SHA-256
bc84ed625bc01bf5642643a9ff1bb9889f9d1d43d754bd4e2328f08ebc678b62
Manifestets SHA-256
d178eda83fb26465fdd785c7f4926aa821030581b637db86f9611c7696d58000
```

## Oberoende kvalitetsprov av filen

Den undre gränsen per spelare utgår från en konkret, laglig avvikelse. Provet väljer en alternativ första flopphandling för spelarens egna kort och offentliga historik i 240 000 givar och mäter förbättringen i 160 000 nya givar. Alla framtida beslut följer den frysta strategin. Spelaren har samma information som i riktigt spel. En undre gräns över målet räcker för att underkänna profilen.

Den första övre gränsen låter den avvikande spelaren se alla privata kort och hela runouten. Provet räknar igenom alla 104 offentliga noder för var och en av 40 000 givar. Endast den avvikande spelarens handlingar maximeras. Motståndarnas beslut följer den frysta profilen och deras egen tillgängliga information. Utökad information kan bara öka bästa responsens värde. Provets 5 % felbudget delas över tre undre och tre övre gränser. [Information relaxation](https://doi.org/10.1287/opre.1090.0796) · [Empirisk Bernstein, sats 4](https://arxiv.org/pdf/0907.3740)

Den snävare övre gränsen räknar bästa respons i ett stickprov av givar med samma egna hålkort. Två givar som spelaren ser som identiska måste då leda till samma handling. Beräkningen går bakåt genom hela trädet och väger varje giv med sannolikheten att motståndarna når beslutsnoden. För varje säte används 768 oberoende stickprov om 256 givar. Varje fast laglig strategi ryms i varje stickprov, så det förväntade värdet av de optimerade stickproven är en övre gräns för den bästa responsen. Olikheten för empirisk Bernstein ger en ensidig marginal, med 5 % total felbudget över tre säten. Underlaget bygger på pseudorandomiserade dragningar ur den angivna modellen, behandlade som oberoende.

| Spelare | Uppmätt avvikelse vid första beslutet | Undre gräns | Övre gräns med full kortinformation | Snävare övre gräns |
|---|---:|---:|---:|---:|
| Hjälten som checkade | 0,68 % | 0,31 % | 49,32 % | **15,76 %** |
| Spelaren som satsade | 0,93 % | 0,52 % | 43,38 % | **20,98 %** |
| Spelaren som höjde | −0,12 % | 0,00 % | 32,89 % | **18,95 %** |

Ingen testad enstegsavvikelse räckte för att underkänna profilen. Båda övre gränserna är för vida för att godkänna den. Sista kolumnen visar konservativa tak för bästa respons. Den faktiska exploaterbarheten kan vara lägre. Uppslaget klarade tidskravet. Den första kvalitetskontrollen tog 82,19 s utanför uppslagstiden och den snävare 67,23 s. [Lagliga avvikelser och full information](audit.json) · [Snävare gränser](tight-upper.json)

Kvalificering på turn och river, följd av 4–6 spelare, väntar på godkänd trevägsflop. Nästa steg är en väsentligt snävare oberoende övre gräns för den arkiverade profilen, eller en laglig avvikelse över 2,1 % som underkänner den. Det är främst de glesa turn- och riverbesluten i stickproven som kan ge den stickprovsanpassade bästa responsen extra information om den specifika dragningen.

## Kör om från den sparade profilen

```powershell
$evidence='docs/evidence/precomputed-three-way-flop-2026-11-22'
$profile='artifacts/precomputed-three-way-flop-reproduced-2026-11-22'
Expand-Archive -LiteralPath "$evidence/profile.zip" -DestinationPath $profile
$env:POKER_RAISED_POSTFLOP_PROBE='1'
$env:POKER_RAISED_POSTFLOP_STREET='flop'
$env:POKER_RAISED_POSTFLOP_PROFILE=$profile
foreach ($mode in @('lookup','audit','tight')) {
  $env:POKER_RAISED_POSTFLOP_OFFLINE=$mode
  $env:POKER_RAISED_POSTFLOP_OUTPUT="$evidence/$mode-reproduced.json"
  npm.cmd test -- tests/decision-raised-postflop-probe.test.ts
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```

För att träna på nytt, välj en ny katalog i `artifacts/` för `POKER_RAISED_POSTFLOP_PROFILE`, sätt `POKER_RAISED_POSTFLOP_OFFLINE=train`, ange en fil för `POKER_RAISED_POSTFLOP_OUTPUT` och kör samma testkommando.
