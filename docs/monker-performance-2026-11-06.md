# Monker Free: upprepad prestandakontroll och snabbare studieprofil

2026-11-06, Windows. Fortsättning på `monker-free-test-2026-11-06.md`.
**Reell tidsvinst uppmätt, men ingen kvalificerad multiway-liveintegration.**

## Resultat och vald profil

Samma sexvägs turnmodell räknades med bibehållen iterationsbudget och full
export på **14,030 och 14,819 s** med Adoptium17 och åtta solvertrådar.
Medelvärdet är14,4245s. Mot dagens varma fyrtrådsbaslinje21,778s är tiden
33,8% kortare, motsvarande1,51× genomströmning. Mot föregående separata
30,174s-prov är det52,2% kortare,2,09×. Den senare jämförelsen omfattar också
skillnader mellan mättillfällena; hela förbättringen får inte tillskrivas trådantal.

Vald profil: befintliga **Adoptium17.0.16.8**, `-Xmx2g`, vanliga JIT-standardvärden,
**Threads8, Keep average strategy2, Keep EV2**. Ingen ny Java behövs för denna
profil. Inga globala Java-, Windows-, säkerhets- eller ströminställningar ändrades.

Det tidigare30s-resultatet är inte längre bästa observerade tiden. Målet några
sekunder och verifierad2%-gräns är däremot fortfarande inte uppnått. Ytterligare
cirka2,9× respektive4,8× tidsvinst skulle behövas för5s respektive3s om samma
arbete och övriga villkor behålls. Det är en enkel tidskvot, ingen prognos.

## Tretton verkliga körningar

Alla tider är Start→färdigMKR-fil i en redan startad JVM, inklusive modellstart,
beräkning och export. ”Första” betyder första solve efter JVM-start, inte hela
Java-/GUI-starttiden. Samma dator; ingen isolering från övriga Windowsprocesser.

| Prov | Java/config | Trådar | Tid | Iterationer |
| --- | --- | ---: | ---: | ---: |
| profile4 |17, JFR-profilerad första solve |4|23,279s|7790592|
| threads1a |17, varm |1|46,404s|7782400|
| threads8a |17, varm |8|14,030s|7798784|
| threads8b |17, varm upprepning |8|14,819s|7798784|
| threads4plain |17, varm utan profilerare |4|21,778s|7790592|
| graal8cold |GraalVM CE25.4.4.1.1, första |8|17,329s|7782400|
| graal8warm1 |samma GraalVM, varm |8|14,066s|7798784|
| inline8cold |17, större inlining, första |8|20,265s|7790592|
| inline8warm1 |samma inlining, varm |8|17,941s|7782400|
| java11cold |medföljande AdoptOpenJDK11.0.7, första |8|16,004s|7782400|
| java11warm1 |sammaJava11, varm |8|15,226s|7798784|
| inline512cold |17, FreqInlineSize512/djup1, första |8|19,054s|7790592|
| inline512warm1 |samma isolerade flagga, varm |8|18,427s|7774208|

JFR-provet används för diagnos, inte som baslinje utan profileringsöverhead.
Skillnaden i iterationsantal är mindre än0,32%, eftersom Monker avslutar
trådarnas arbetsblock. Samtliga prov överstiger målbudgeten7768320iterationer.
GraalVM gav ingen tydlig vinst utöver vanligJava17/8trådar; inget systembyte gjordes.
Inliningprovet förkastades som långsammare. Java11 var också långsammare varm.

## Vad som hållits fast

52-korts NLHE, sex aktiva, turn`Ks7d2c8h`, pot4, stack200 per spelare, rake0,
alla1326startkombinationer med vikt1 per spelare. Samma lilla check/fold/call/all-in-
träd; inga vanliga halvpottssatsningar, olika stackar eller sidopottstester.
Kvalitetsgränsen har inte sänkts och inget nytt GTO-mått har påståtts.

- Vendorbinären är byteoförändrad, SHA256
  `f66d7f2b5d8b35393577a39abfc0325215f26dd5102355e1ae49be477318e652`.
- Samma exporterade trädhash i alla13fall:
  `1afa8d0809ad7b957a07053c1a2a00773f043a89d9bdd54263b00b360e0982d3`.
- 776832informationslägen, ratio10. Offentliga trädet har769noder; dessa två
  nodbegrepp får inte blandas ihop.
- Alla13arkiv verifierade för6spelare, board, pot/stackar, version10114, speltyp,
  fulla ranger, avg/EV2, isoLevel0 och ändliga numeriska data.
- `qualityPct=null` i evidensen. Inga NashConv-/BR-resultat, inga appbeslut.

Prestandaprovet avser bara denna sexvägs turnmodell. Föregående åtta funktionsprov
för3–6 × turn/river kvarstår; deras tider generaliseras inte till alla bettingträd.

## Diagnos och prövade hypoteser

Datorn har Intel i5-11300H,4fysiska kärnor och8logiska processorer, cirka16GB RAM.
Profileraren var JDK17:s inbyggda Flight Recorder, enligt
[Oracle jcmd-dokumentationen](https://docs.oracle.com/en/java/javase/17/docs/specs/man/jcmd.html).
Körningen gav5217ExecutionSample-händelser. Heta toppframes var framför allt
`c.aE.i`2366, `c.aE.c`1033 och `c.v.a`755. Observerade solvertrådar använde CPU;
inga långvariga solvermonitorväntningar syntes i proven.

Under hela158s-inspelningen summerades GC-pauser till102,59ms. Sex rapporterade
monitorväntningar gällde AWT:s träd-lås. Detta pekade mot själva beräkningen som
huvudflaskhals; det är inte ett exakt mått på separat export-I/O. Sammanfattningen
är sparad utan miljövariabler eller andra orelaterade profileringsuppgifter.

Hypoteser prövades mot samma modell:

1. Färre trådar skulle kunna minska konkurrens om delade data. En tråd gav46,4s,
   åtta gav14,0–14,8s. Åtta är bättre bland de prövade värdena; ingen generell
   optimalitetsgaranti eller full parametergrid påstås.
2. Annan gratis JIT-körtid skulle kunna optimera de heta metoderna bättre.
   Officiella GraalVM Community-arkivet hämtades och hashverifierades mot release-
   metadatan. Varm tid14,066s gav ingen tydlig ytterligare vinst. Körtiden ligger
   endast i arbetsmappen, är inte installerad globalt och används inte i slutprofilen.
3. De rekursiva metodernas bytekod överskrider delvis standardens hot-inlininggräns.
   `-XX:FreqInlineSize=700 -XX:MaxRecursiveInlineLevel=2` testades tillsammans som
   en konfiguration. Varm tid17,941s var sämre. Effekten av respektive enskild flagga
   isolerades inte i det provet; konfigurationen förkastades. Därefter ändrades
   endast FreqInlineSize till 512 med normalt rekursionsdjup 1, båda verifierade
   genom jcmd VM.flags -all. Första solve tog19,054s, varm18,427s. Även den
   profilen förkastades som långsammare. Ingen vendoralgoritm ändrades.
4. Medföljande Java11 har biased locking på som standard;Java17 har det av.
   En varm körning medJava11 gav15,226s, ingen vinst överJava17/8trådar. Detta
   isolerar inte biased locking från övriga JVM-skillnader.

GraalVM-release:
[graal-25.4.4.1.1](https://github.com/graalvm/graalvm-ce-builds/releases/tag/graal-25.4.4.1.1).
Windowsarkiv344372728byte, SHA256
`2733ea1331f1a98b05dd55a768b07347051dad48f030dbbfa191b11a2ccf4144`.
Inga köp, konton, leverantörskontakter eller avgifter. Ingen egen solverträning.

## Återläsning och kvarlämnat läge

`threads8b...mkr` kopierades till Monkers egna savedRuns och valdes i dess Load-
dialog. Vendor-GUI:t bekräftade6platser, board, pot4, stack200, version10114,
7798784iterationer och776832informationslägen. Se skärmbilden med exportmetadata.

**Load återupptar beräkningen automatiskt** för Save-for-further-calculation-filer.
Det visade sig först efter inläsning och stoppades via Stop/OK. Den oschemalagda
återupptagningen nådde69967872iterationer och ingår inte i tidtabellen. Ingen ny
benchmarkexport skapades av den. Både ursprungsfilen och kopian behöll SHA256
`fb271e8084085a7e1229d1e2ca02d6997a780ce701cb8dd346739295e927542b`.
Detta är ytterligare funktionsevidens för återanvändbar export, inget kvalitetsmått.

Slutligen verifierades stoppstatus med0solvertrådar och Settings8/2/2 på vanlig
Java17. Efter det sista negativa JIT-provet återstartades standard-Java17 och Settings8/2/2
verifierades igen. Monker är kvar öppet och overksamt, PID21244/fönster3411048,
med sitt nya standardträd utan pågående benchmark. Den tidigare PID65744 är stängd. Övriga test-
JVM:er är stängda. Poker Advisor PID59988 fortsätter som tidigare. Inga poker-
handlingar, nya webbläsaranslutningar eller multiwayråd i appen gjordes här.

## Filer och reproduktion

- `scripts/monker-audit/Start-MonkerStudy.ps1`: hashkontrollerad start, separat
  explicit Java, inga globala inställningar. Kräver PS7. **GUI-fälten Threads8,
  Keep avg2, Keep EV2 väljs efter varje start**; skriptet sätter dem inte.
  Startskriptet har faktiskt körts och det startade den tidigare PID65744 och därefter slutliga PID21244.
- `scripts/monker-audit/Measure-MonkerExports.ps1`: klockmätning och oberoende
  kontroll av varje arkivs modell/iterationsbudget. Ett sparat ratio1-prov kördes
  genom samma kontroll och avvisades, så en sänkt budget inte kan ge falsk fartvinst.
- `docs/evidence/monker-performance-2026-11-06.json`: alla13tider, inputkontroller,
  filhashar, sparade former och slutsatser. Rådata under `monker-performance/`.
- Chattens outputs innehåller rapport, två framgångsrika råexporter, mätdata,
  mät-/startverktyg och skärmbilder i `monker-performance-2026-11-06.zip`.
  De övriga elva råexporterna ligger kvar i chattens work/monker-perf/exports;
  deras fulla metadata/hashar finns i paketet och repo-evidensen.

Utförda kommandon, med faktisk JDK17-sökväg:

```powershell
jcmd 61784 JFR.start name=monkerBaseline settings=profile maxsize=64m
jcmd 61784 JFR.dump name=monkerBaseline filename=<work>/monker-perf/baseline.jfr
jcmd 61784 JFR.stop name=monkerBaseline
jfr print --json --events jdk.ExecutionSample,jdk.GarbageCollection,jdk.JavaMonitorEnter,jdk.ObjectAllocationSample,jdk.FileWrite <work>/monker-perf/baseline.jfr
.\scripts\monker-audit\Measure-MonkerExports.ps1 -RunDirectory <work>/monker-perf -InspectorClassPath <work>/monker-free/helpers -JavaPath <JDK17>/bin/java.exe -ReferenceTree <work>/monker-free/generated-inputs/monker-6p-turn-control.tree
.\scripts\monker-audit\Start-MonkerStudy.ps1 -MonkerDirectory <work>/monker-free/runtime -JavaPath <JDK17>/bin/javaw.exe
git diff --check
```

De tretton solverjobben startades via verkliga GUI:t, inte via en påhittad CLI.
Mätverktyg och evidens är tillagda. Appens runtimekod, kvalitetsgrind och
providerregistrering har inte ändrats. Ingen commit eller push. Tidigare371app-
tester är historik och kördes inte om för dessa fristående prestandaprov.

## Nästa AI: kvarvarande tekniskt hinder

Den dyra obesvarade frågan är komplett policy-/EV-mappning och oberoende
multiway-felmått. Kontrollera först det versionsbundna exportkontraktet på små
kontrollerade fall och precisera vilket normaliserat bästa-svarsmått 2 % avser.
Mät därefter tid till ett godkänt resultat. Ratio10 får inte användas som
kvalitetsbevis. Före provideraktivering krävs också verifierat anropskontrakt,
tidsgräns, avbrott, skydd mot gamla svar och end-to-end-prov. Inga av dessa
krav är styrkta av snabbare arkivexport.
