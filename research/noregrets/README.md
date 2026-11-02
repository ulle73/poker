# Isolerad native-kandidat — inte appens beslutsmotor

Denna katalog innehåller en reproducerbar forskningspatch och lokal
Windows-byggning för [NoRegrets](https://github.com/conorarmstrong/noregrets),
låst till `757f7692738069522195d2b486eec60a8b010c0c`. Källkodens MIT-licens
finns i [LICENSE](LICENSE). Inga kommersiella modellfiler har hämtats.
Kandidaten är inte inkopplad i Electron-appen och har inget kvalitetsgodkännande.

## Varför den granskas

Den befintliga onlinemotorn når sin informationsmängdsgräns innan den hinner
träna fulla flerpartsranger. Kandidaten skiljer lång förträning från sökning
vid ett beslut. Den publika koden har sexmannagräns; dess kortabstraktion är
grövre än appens exakta kortnycklar. En färdig modell från projektets författare
ingår inte i det öppna repot. En egen modell behöver tränas och mätas separat.

## Vad patchen ändrar

- Spelmotorns maximala antal säten höjs från 6 till 10.
- En tidigare agerande spelare får inte höja igen efter en ensam kort all-in.
  Flera korta all-in får återöppna när den sammanlagda ökningen räcker.
- Ingen höjning erbjuds när samtliga återstående motståndare redan är all-in.
- Udda marker delas ut med start till vänster om knappen, separat per pott.
- Fem regressioner samt två befintliga slumpade testloopar täcker 2–10 spelare.

Fyra nya regressioner fallerade före ändringen. Efteråt passerar samtliga
18 motortester, inklusive 18 000 slumpade händer med varierande stackar och
4 500 händer med det abstrakta handlingsutbudet i den större sviten.

## Kvarvarande hinder

Den kompletta kandidatkörningen gav **139 passerade och 2 fallerade testfall**:
trepersonerssökningen foldade den absoluta nutshanden 10,64 % i ett riverfall;
ett fokus-samplingtest gav 27,4 % call med 72o där testet kräver under 20 %.
Se [hela körningen](../../docs/evidence/noregrets-full-test.log).
Trösklarna har inte ändrats för att få ett grönt resultat.

Ytterligare granskade brister är ännu inte rättade:

- VR-korrigeringen är biased när den kombineras med fokus-/spinesampling.
- Checkpoint/blueprint binder inte alla stackar, blinds och träningsinställningar.
- Strategiska checkpointar saknar återställning av sin beroendemodell.
- Nyckeln använder aktuell kortbucket och publik handlingstokenhistorik och
  glömmer tidigare privat information. Den är inte en exakt kortisomorfi eller
  ett spel med bevarat perfekt minne.

Ingen av dessa luckor får kringgås genom att låta en kandidatmodell ersätta
verifierade råd. Nästa kvalitetsarbete behöver bland annat särskilja de exakta
korten på aktuell gata och binda varje artefakt till rätt spelkonfiguration.

## Windows-byggningen som användes

Rust 1.99.1 (`x86_64-pc-windows-gnu`) och Zig 0.17.0 ligger endast under
`.research/tools`. Ingen global PATH eller systeminstallation har ändrats.
Rusts medföljande `rust-lld` länkar mot dess egna GNU-runtimebibliotek;
Zig används för C, `ar` och `dlltool`. Datum-/tidsvarningar i mimalloc tillåts
som varningar; de påverkar diagnostisk byggtext. Övriga befintliga varningar
finns kvar i loggarna.

Den officiella Rust-installationen följer
[rustups Windows/GNU-instruktioner](https://rust-lang.github.io/rustup/installation/other.html).
Vid den här körningen sattes `CARGO_HOME` till `.research/tools/rust/cargo`
och `RUSTUP_HOME` till `.research/tools/rust/rustup`, med
`--no-modify-path --profile minimal --default-host x86_64-pc-windows-gnu`.
Kontrollera nedladdad `rustup-init.exe` mot dess officiella `.sha256` före körning.
Verktygens observerade versioner och hashvärden sparas i
[kandidatauditen](../../docs/evidence/noregrets-candidate-audit.json).

[Tränings-/filproben](../../docs/evidence/noregrets-training-smoke.json) skapar
och läser en syntetisk modell för vart och ett av spelarantalet 2–10. Den
kontrollerar faktisk sparad spelaridentitet och 20 traversaliterationer.
Modellerna är enbart IO-testdata och får inte användas som råd. Proben binder
sitt underlag till upstream-revision, forskningspatch och binärens SHA-256.
Det är inte en rättning av kandidatens generella artefaktformat.

I en ny checkout, från projektroten och med dessa lokala verktyg installerade:

```powershell
git clone https://github.com/conorarmstrong/noregrets.git .research/noregrets
git -C .research/noregrets checkout 757f7692738069522195d2b486eec60a8b010c0c
git -C .research/noregrets apply ../../research/noregrets/advisor-engine.patch
node scripts/native-research-cargo.mjs build --manifest-path .research/noregrets/Cargo.toml --release --locked -j 4
node scripts/native-research-cargo.mjs test --manifest-path .research/noregrets/Cargo.toml --release --locked -j 4 engine::tests -- --test-threads=1
node scripts/native-research-cargo.mjs test --manifest-path .research/noregrets/Cargo.toml --release --locked -j 4 -- --test-threads=2
node scripts/probe-native-training.mjs
```

Den breda testkörningen ovan är inte ett påstående om att alla tester
passerar. Hjälpskriptet kopierar sina kompilatormallar till den lokala
verktygskatalogen och begränsar Rayon till fyra trådar. Kör inte det
interaktiva `play` eller externa testmotståndare som ersättning för validering.

Applikationens kvalitetsgrind, liveavläsning och paketerade Windows-version
har inte ändrats i detta experiment.
