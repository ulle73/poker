# Isolerad native-kandidat — inte appens beslutsmotor

Denna katalog innehåller reproducerbara forskningspatchar och lokal
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

Den första kompletta kandidatkörningen gav **139 passerade och 2 fallerade testfall**:
trepersonerssökningen foldade den absoluta nutshanden 10,64 % i ett riverfall;
ett fokus-samplingtest gav 27,4 % call med 72o där testet kräver under 20 %.
Se [hela körningen](../../docs/evidence/noregrets-full-test.log).
Trösklarna har inte ändrats för att få ett grönt resultat.

En separat `advisor-sampling.patch` rättar därefter VR-estimatorn när
fokus-/spinesampling använder en annan fördelning än spelstrategin. Hela
residualen multipliceras med `sigma/q`, baselinen fryses före dragningen och
inlärningen använder det oviktade barnvärdet. Tre regressioner föll före
rättningen; en mellanversion visade att även inlärningsmålet var fel.
Efter rättningen passerar alla tre. Härledningen följer baselinemetoden i
[OpenSpiel](https://github.com/google-deepmind/open_spiel/blob/master/open_spiel/python/algorithms/outcome_sampling_mccfr.py)
och [Schmid m.fl.](https://arxiv.org/abs/1809.03057).

Den nya breda körningen gav **143 passerade och 1 fallerat testfall**:
`pluribus_prune_keeps_the_fixed_point`, AA-call 77,0 % mot kravet över 80 %.
De två tidigare fallerade fallen passerade nu, men använder inte VR och kan
inte räknas som lösta av denna ändring. Parallella träningskörningar varierar.
Se [nya auditen](../../docs/evidence/noregrets-sampling-audit.json) och
[hela nya körningen](../../docs/evidence/noregrets-sampling-full-test.log).
Detta är inte ett generellt strategigodkännande.

Pruning- och fokustesten passerade därefter två separata körningar vardera
med en Rayon-tråd och en testtråd, utan ändrad tröskel. Det är diagnostik av
känslighet för träningsordning, inte ett bevis för robust konvergens. Exakta
argument, exitkoder och testbinärens hash finns i
[upprepningsrapporten](../../docs/evidence/noregrets-sampling-repeatability.json).

Ytterligare granskade brister är ännu inte rättade:

- Checkpoint/blueprint binder inte alla stackar, blinds och träningsinställningar.
- Strategiska checkpointar saknar återställning av sin beroendemodell.
- Nyckeln använder aktuell kortbucket och publik handlingstokenhistorik och
  glömmer tidigare privat information. Den är inte en exakt kortisomorfi eller
  ett spel med bevarat perfekt minne.

## Senare steg: exakt identitet på aktuell gata

`advisor-current-street.patch` är den **aktuella kumulativa patchen från ren
upstream**. Den innehåller även de tidigare motor- och samplingrättningarna.
De äldre två patcharna behålls för historik; lägg inte den kumulativa ovanpå dem.

Sökningens `Trainer.card_key` använder nu den exakta privata kortkombinationen
på det fasta publika rotbrädet: 1176 lagliga par på flop, 1128 på turn och 1081
på river. Kortordning inom ett par eller på samma fasta bräde spelar ingen roll.
Nyckeln tar bara spelarens egna kort och publika bordskort. Blueprint-träning
och framtida bräden använder den tidigare abstraktionen.

Söknycklarna får varken exporteras som en generisk blueprint eller sparas i
det gamla checkpointformatet. Checkpoint avvisas innan en befintlig fil skrivs
över. Fyra beteenderegressioner föll före rättningen och passerar nu.

Detta har **inte löst strategikvaliteten**. Första breda körningen gav 147 pass
och ett trepersonersfel: nutshanden synades 58,38 %. Testet skärptes dessutom
med en avsiktligt foldande blueprint-fallback så en saknad sökstrategi inte
kan passera via standard-call. Även den körningen gav 147 pass/1 fel, med
57,58 % call i samma fall. Träningsbudgeten och kravet över 90 % behölls.
Se [aktuell audit](../../docs/evidence/noregrets-current-street-audit.json).

Finare identitet kräver fler användbara uppdateringar för just frågans hand
och linje. Nästa arbete är mätning och korrekt importance-viktad sampling;
att hålla spelarens faktiska kort fasta i motståndarnas hela modell skulle
läcka dold information och är ingen acceptabel genväg. Framtida gator har
fortfarande grov abstraktion och perfekt minne är inte löst generellt.

Ingen av dessa luckor får kringgås genom att låta en kandidatmodell ersätta
verifierade råd. Nästa kvalitetsarbete behöver bland annat förbättra viktad
sampling av aktuell hand och binda artefakter till rätt spelkonfiguration.

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

[Den första tränings-/filproben](../../docs/evidence/noregrets-training-smoke.json)
skapade och läste en syntetisk modell för vart och ett av spelarantalet 2–10.
Den kontrollerade faktisk sparad spelaridentitet och 20 traversaliterationer.
Modellerna är enbart IO-testdata och får inte användas som råd. Proben binder
sitt underlag till upstream-revision, forskningspatch och binärens SHA-256.
Det är inte en rättning av kandidatens generella artefaktformat.

Den [senare IO-proben](../../docs/evidence/noregrets-training-sampling-smoke.json)
binder båda patcharna, kontrollerar att inga andra spårade källfiler ändrats
och bygger binären från den kontrollerade källan innan modellerna skapas.
Det äldre resultatet behålls som historik. Alla modeller är fortfarande enbart
syntetiska 20-traversals testdata.

[Den aktuella IO-proben](../../docs/evidence/noregrets-current-street-training-smoke.json)
bygger från den kumulativa patchen och bevarar tidigare resultatfiler.

I en ny checkout, från projektroten och med dessa lokala verktyg installerade:

```powershell
git clone https://github.com/conorarmstrong/noregrets.git .research/noregrets
git -C .research/noregrets checkout 757f7692738069522195d2b486eec60a8b010c0c
git -C .research/noregrets apply ../../research/noregrets/advisor-current-street.patch
node scripts/native-research-cargo.mjs build --manifest-path .research/noregrets/Cargo.toml --release --locked -j 4
node scripts/native-research-cargo.mjs test --manifest-path .research/noregrets/Cargo.toml --release --locked -j 4 engine::tests -- --test-threads=1
node scripts/native-research-cargo.mjs test --manifest-path .research/noregrets/Cargo.toml --release --locked -j 4 advisor_vr -- --test-threads=1
node scripts/native-research-cargo.mjs test --manifest-path .research/noregrets/Cargo.toml --release --locked -j 4 advisor_current_street -- --test-threads=1
node scripts/native-research-cargo.mjs test --manifest-path .research/noregrets/Cargo.toml --release --locked -j 4 -- --test-threads=2
node scripts/probe-native-training.mjs
```

Den breda testkörningen ovan är inte ett påstående om att alla tester
passerar. Hjälpskriptet kopierar sina kompilatormallar till den lokala
verktygskatalogen och begränsar Rayon till fyra trådar. Kör inte det
interaktiva `play` eller externa testmotståndare som ersättning för validering.

Applikationens kvalitetsgrind, liveavläsning och paketerade Windows-version
har inte ändrats i detta experiment.
