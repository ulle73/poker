# Monker Free 10114: fristående exportkontroll

Detta är testverktyg, inte en ny solver eller en produktionsadapter. Läs
`../../docs/monker-free-test-2026-11-06.md` för verklig omfattning och negativa resultat.
Den ursprungliga arkivinspektören nedan mäter inte strategikvalitet. De senare
policyverktygen gör separat exakt kvalitetskontroll för begränsade modeller;
de innebär ännu ingen app-provider eller generell multiway-täckning.

## Aktuell turnkontroll 2026-11-07

`MonkerCoreProbe.java` kör den hashbundna, oförändrade numeriska FREE10114-kärnan
utan GUI/controller. `MonkerPolicyExport.java` avkodar policyn och bucketarna.
`audit-file.mjs` räknar sedan profilvärden och bästa svar med oberoende evaluator.
Arkivets iterationsantal och samplade EV används aldrig som felintyg.

```powershell
.\scripts\monker-audit\run-kernel.ps1 -InputArchive C:\task\model.mkr -VendorDirectory C:\task\runtime -OutputDirectory C:\task\result -JavaDirectory 'C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot\bin'
node scripts/monker-audit/audit-file.mjs C:\task\decoded.json C:\task\quality.json average max-unilateral
```

CLI:ns fjärde argument väljer explicit mått: `nashconv` är historisk standard,
summan av avvikelsevinsterna. `max-unilateral` är användarens nu valda ε-Nash:
ingen spelares avvikelsevinst överstiger 2 % av rotpotten. Båda värdena finns
i rapporten. Ett medelvärde över spelare accepteras aldrig som ersättning.

`auditPairSymmetry` är en exakt, villkorad rangreduktion: komplett likaviktade
parklasser, åtskilda valörranger mellan spelare, fyrfärgad turn och policyns
suitoberoende bucketar för varje egen valör/offentlig rivervalör. Också chansen
grupperas efter rivervalör; att bara välja konkreta representanthänder ger
felaktig dold information och avvisas. När villkoren saknas används full
enumeration, vars budget kan ge **okänd kvalitet**. Rangerna kapas inte.

`MonkerCoreCheck` kontrollerar tre numeriska jobb i samma JVM (3→6→3 spelare).
`MonkerKernelBench` värmer processen och räknar sedan sex helt nya strategier;
den skriver separata tider för solve+decode. `crosscheck-payoffs.mjs` kontrollerar
kernelns terminalutbetalningar med den oberoende kortvärderaren.
`run-kernel.ps1` mäter i stället hela kalla processkedjan, inklusive två JVM-
starter och Node, efter kompilering/hashkontroll. Ingen av tiderna är UI-latens.

Rådata och negativa resultat: `../../docs/monker-turn-2026-11-07.md`.
Obfuskerade numeriska fält är versionsbundna. Proben är ett diagnostikverktyg,
ingen stabil kommersiell API-integration; hård processtidsgräns och fullständig
modellbindning krävs innan anslutning till appen.

`MonkerArchiveInspect.java` kräver endast JDK17. Kompilera till en separat arbetsmapp:

```powershell
javac -d C:\task\helpers scripts\monker-audit\MonkerArchiveInspect.java
java -Xmx768m -cp C:\task\helpers MonkerArchiveInspect C:\task\example.mkr
```

Läsaren gör ingen nätverks-/solver-/GUI-start. ObjectInputFilter tillåter endast
primitiva arrayer och nödvändiga JDK-typer. Resultatet är JSON med headers, skalärer,
arrayformer, ändlighetskontroll och trädhash; det är inte normaliserade policies.

`MonkerProbeInputs.java` är `package c` och kräver exakt testad vendorbinär på
classpath. Kontrollera först SHA-256:
`f66d7f2b5d8b35393577a39abfc0325215f26dd5102355e1ae49be477318e652`.
Programmet är headless och använder bara rena spelövergångar för att skapa de
åtta små kontrollträden. Det anropar aldrig GUI, solverträning eller åtkomstkontroller.

```powershell
javac -cp C:\task\runtime\MonkerSolverFree.exe -d C:\task\helpers scripts\monker-audit\MonkerProbeInputs.java
java -Djava.awt.headless=true -cp 'C:\task\helpers;C:\task\runtime\MonkerSolverFree.exe' c.MonkerProbeInputs C:\task\generated-inputs
```

Trevägsturnträdet måste bli byteidentiskt med GUI-exportens sparade kontrollfil,
SHA-256 `4b062d2d3e21e19ee0f97bfed684c1ebcfb7c724151e72ee84abad0b4fc3ca0b`.
Använd inte de obfuskerade vendorklasserna som ett stabilt app-API. Byt inte bort
appens kvalitetsgrind för att dessa formatkontroller passerar.

## Prestandaprov 2026-11-06

`Measure-MonkerExports.ps1` läser faktiska arkiv och starttider från en provmapp.
Den kräver samma sexvägsträd, fulla ranger, board, avg/EV2, ändliga data och minst
ratio10:s 7768320 iterationer. Ett billigare ratio1-resultat avvisas uttryckligen.
Den mäter till arkivfil; den intygar ingen GTO-kvalitet eller tid till appbeslut.

```powershell
.\scripts\monker-audit\Measure-MonkerExports.ps1 -RunDirectory C:\task\monker-perf -InspectorClassPath C:\task\helpers -JavaPath 'C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot\bin\java.exe' -ReferenceTree C:\task\generated-inputs\monker-6p-turn-control.tree
```

`Start-MonkerStudy.ps1` startar den hashkontrollerade vendorbinären med separat,
explicit Java. Den ändrar inga globala Java-/systeminställningar. PS7 krävs för
`ProcessStartInfo.ArgumentList`. Välj **Threads8, Keep avg2, Keep EV2 i GUI:t**;
vendorns main ignorerar CLI-argument och dessa GUI-fält sätts inte av skriptet.
Använd den faktiskt testade Adoptium17.0.16.8; GraalVM och ändrad inlining gav
ingen ytterligare prestandavinst i denna mätning. Full rapport finns i
`../../docs/monker-performance-2026-11-06.md`.
