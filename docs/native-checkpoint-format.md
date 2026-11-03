# Versionsbunden återupptagning av native-träning

Detta gäller den isolerade NoRegrets-kandidaten, inte appens solver eller
portable. Kandidaten är fortfarande inte godkänd för generella GTO-råd.
Den kumulativa patchen är `research/noregrets/advisor-checkpoint.patch` och
appliceras ensam på låst upstream `757f7692738069522195d2b486eec60a8b010c0c`.

## Reproducerat fel

Fyra nya regressioner föll med det tidigare checkpointformatet:

- En modell för sex spelare accepterades med tre spelare vid återläsning.
- Strategiska centroids sparades utan sitt nödvändiga tidigare blueprintberoende.
- Återläsning tappade CFR+, QRE, VR, RNR och den fasta motståndarmodellen.
- Ett saknat strategiberoende upptäcktes inte före överskrivning av målfilen.

Den sista punkten betyder att felet inte bara var saknade beskrivande metadata:
fortsatt träning kunde använda andra regler, uppdateringar eller kortbuckets.

## Formatets kontrakt

Filen börjar med åtta byte `PGTOCP01`. Därefter kommer schema 1 i bincode
1.3.3, explicit little endian och fixint, med en kodad storleksgräns på 8 GiB.
Gamla obundna filer avvisas. Ingen automatisk gissning eller migrering fyller
i deras okända stackar, blinds eller beroenden.

Checkpointen lagrar och kontrollerar:

- Hela `TrainConfig`: spelarantal, lika startstackar, SB/BB, seed, pruning,
  snapshotval, multiway-fokus och linjär viktgräns. Förväntad konfiguration
  vid återläsning måste vara identisk.
- Modellrevision för spelregler, kort-/handlingsnycklar och uppdateringsregler.
  Den måste höjas vid inkompatibla ändringar.
- Den fullständiga `Cargo.lock`, normaliserad till LF, för exakta beroendeversioner.
- Abstraktionskonfiguration och centroids. Ett strategiskt beroende sparas
  som den faktiska föregående policyn och dess rolloutantal, utan extern filväg.
  Endast upstreams stödda enda strategiska nivå tillåts.
- Regrets, medelvikter, iterationsräknare, CFR+, QRE, VR-baselines och RNR
  inklusive fast motståndarpolicy. Återläsning avvisar felaktiga numeriska
  värden, dubbla nycklar, saknade nödvändiga beroenden och extra slutbyte.

Sökningar med aktuell-gata-nycklar, leaf-context eller spine får inte sparas
som en generell checkpoint. De saknar ett sådant återupptagningskontrakt.
Validering sker före skrivning. En temporär fil i samma katalog flushas och
synkas innan rename ersätter målet; ett skrivfel ska inte lämna ett halvt
checkpointpayload i den tidigare målfilen.

CLI `train --resume` använder sparade VR/RNR- och abstraktionsberoenden.
Ersättningsflaggor för dessa avvisas i stället för att tyst ändra modellen.
Spel-/träningsflaggor som ingår i `TrainConfig` ska upprepas med samma värden.
Antalet nya iterationer och trådantal är körningsval, inte modellen själv.

## Verifiering och praktiska gränser

De fyra ursprungliga regressionerna har röd/grön-evidens. Ytterligare tester
täcker versions-/beroendemismatch, trasiga filer, förlorade sökkontexter och
exakt fortsatt enkeltrådig träning efter återläsning. Det senare jämför alla
regrets, medelvikter och VR-baselines efter 500 + 500 traversaler i en liten
trepersonersmodell. Det är inte ett löfte om bitidentiska parallella körningar.

Kör från projektroten med det lokala verktyget installerat:

```powershell
node scripts/native-research-cargo.mjs test --manifest-path .research/noregrets/Cargo.toml --release --locked -j 4 advisor_checkpoint -- --test-threads=1
node scripts/probe-native-training.mjs
node scripts/probe-native-checkpoint.mjs
```

Den sista proben tränar 40 syntetiska traversaler för varje antal 2–10,
återupptar med 20, kontrollerar återställt VR-läge och avvisar fyra felaktiga
anrop per antal. Den gör ingen strategikvalitetsbedömning.

Observerade resultat: sju checkpointtester passerade; nio CLI-återupptagningar
och 36 avvisningar passerade. Hela native-sviten gav **164 pass/1 fel**, det
tidigare pruningtestet med AA-call 63,0 % mot kravet över 80 %.
En separat omkörning av 30 små riverfall gav exakt samma 36 912 policyrader
och oberoende kvalitetsrapporter som före checkpointändringen. Se
[samlad evidens](evidence/noregrets-checkpoint-evidence.json),
[policyjämförelse](evidence/native-policy-checkpoint-quality-summary-2026-11-03.json)
och [CLI-resultat](evidence/noregrets-checkpoint-cli.json).

**Blueprint-exporten har fortfarande det gamla obundna formatet.** Denna
ändring löser återupptagning av träning, inte generell laddning av en policy
i appen eller spel mot andra stackar. Bred förträning, framtida gators
abstraktion och oberoende kvalitetsgrind återstår. Snapshoternas CLI-schema
utgår från varje begärd träningsetapp; exakt fortsatt löpningstest ovan använder
inte snapshot averaging. Checkpoint sparas mellan färdiga träningsetapper,
inte samtidigt som workers uppdaterar tabellerna.

Filerna är lokala forskningsartefakter, inte ett signerat distributionsformat.
Extern evidens binder källpatch och binär med SHA-256; modellrevisionen är ett
versionskontrakt, inte en automatiskt härledd kodhash.

## Officiella implementationskällor

- [Serde 1.0.228 Serialize](https://docs.rs/serde/1.0.228/serde/trait.Serialize.html).
- Bincode 1.3.3:s medföljande `src/config/mod.rs` i den låsta Cargo-registrykällan:
  `DefaultOptions` och root-funktionerna har olika heltals-/trailing-defaults.
  Den versionsspecifika docs.rs-sidan kunde inte hämtas i denna kontroll;
  implementationens egna dokumentationskommentarer kontrollerades lokalt.
- [Rust 1.99.1 BufWriter](https://doc.rust-lang.org/std/io/struct.BufWriter.html):
  explicit flush krävs för att observera buffrade skrivfel.
- [Rust rename och Windows-beteende](https://doc.rust-lang.org/std/fs/fn.rename.html).
