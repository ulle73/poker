# Third-party notices

## OpenSpiel MCCFR sampling algorithms (Apache License 2.0)

The traversals and averaging in `src/decision/mccfr.ts` are adapted to TypeScript
from Google DeepMind OpenSpiel's external- and outcome-sampling algorithms.
Copyright 2019 DeepMind Technologies Limited. Source:
https://github.com/google-deepmind/open_spiel/blob/master/open_spiel/python/algorithms/external_sampling_mccfr.py
https://github.com/google-deepmind/open_spiel/blob/master/open_spiel/python/algorithms/outcome_sampling_mccfr.py

Changes include integer-chip hold'em states, sampled ranges, importance weighting,
exact suit isomorphism, complete outcome update cycles, optional experimental
passive external-sampling continuation, cancellation and result provenance. These additions
are application code; this is not a bundled or certified OpenSpiel poker solver.
The complete Apache License 2.0 is in `docs/licenses/OpenSpiel-APACHE-2.0.txt`.

## Postflop solver (MIT)

This application bundles the Postflop WebAssembly runtime and JavaScript bindings distributed by the upstream Postflop workbench, and preserves the reviewed Rust engine, CLI and WASM source in `vendor/postflop/`.

Repository: https://github.com/ucsandman/postflop

Reviewed source revision: `5fc7ee3d92b823b6c58e4f58cbee7d50d5e9e6de`.

Runtime artifact URLs and exact SHA-256 digests are in `docs/solver-provenance.json`. These deployment artifacts were downloaded, not rebuilt from Rust on this machine. Their API and behavior were checked against the reviewed source; byte-for-byte reproducibility from that source has not been established.

The optional native NLHE bridge is separately built locally from the same pinned
engine revision, without changing the solver algorithms. Its transport adapter
is in native/postflop-bridge; JSON presentation follows the upstream WASM API.
The installed native artifact is CPU-specific and is not bundled in the app.
Its hash, compiler and reviewed source are recorded separately in the provenance
file. Build/install with scripts/build-native-postflop.ps1 after installing the
official Rust/MSVC tools. The MIT notice below also applies to that native engine.

The complete upstream MIT notice is reproduced below and in `vendor/postflop/LICENSE`.

MIT License

Copyright (c) 2026 Wes Sander

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## DM Sans (SIL Open Font License 1.1)

Bundled offline through `@fontsource/dm-sans`. Font copyright and full license are in `docs/licenses/DM-Sans-OFL.txt` and included in the distribution.

## React and React DOM (MIT)

Copyright (c) Meta Platforms, Inc. and affiliates. Bundled via npm; complete notice is included in `docs/licenses/React-LICENSE.txt` in the distribution.

## Electron

Electron and Chromium license notices are shipped by Electron alongside the Windows runtime (`LICENSE.electron.txt` and `LICENSES.chromium.html`).

## Optional native TexasSolver

TexasSolver v0.2.0 is an optional separately installed native dependency for
personal 6+ heads-up river analysis: https://github.com/bupticybee/TexasSolver .
No TexasSolver source or binary is bundled in this application. The vendor
README describes free personal binary use/integration and AGPL source terms,
with additional commercial wording. Retain the vendor's package and notices;
commercial use or redistribution requires a separate license review.
Pinned artifact hashes and integration scope are recorded in
docs/solver-provenance.json and docs/shortdeck-solver-2026-11-05.md.

## Optional native b-inary Postflop (AGPL-3.0-or-later)

The locally built HU NLHE turn solver uses Wataru Inariba's
https://github.com/b-inary/postflop-solver at revision
9d1509fe5077d019825f833eed04b16d342dfda1. Its separate transport/model wrapper
is in native/binary-postflop-bridge and is also AGPL-3.0-or-later. The complete
license is native/binary-postflop-bridge/LICENSE.txt and is copied alongside
the installed executable. The only vendor-source patch is the three explicit
Rust references in native/binary-postflop-bridge/rust-compat.patch; no solver,
best-response, or card-evaluation algorithm is patched.

No native binary is bundled in the current application package. Corresponding
source, dependency lockfile and local build/install recipe are provided in
native/binary-postflop-bridge and scripts/build-binary-postflop.ps1. This
component is separately licensed from the MIT application and historical MIT
UCSandman bridge. Review AGPL obligations before redistributing an integrated
product; the current work builds and installs it locally. Source pin, binary
hash, exact quality normalization and measured scope are recorded in
docs/solver-provenance.json and docs/nlhe-fast-2026-11-05.md.

## Reviewed reference projects

- https://github.com/ulle73/poker — existing project reviewed, replaced by this buildable trainer. Original history is preserved in Git.
- https://github.com/hellomate2/gto-poker-overlay (MIT) — architectural reference for explicit strategy provenance, action mixtures and local training; no overlay, autoplay, blueprint assets or source copied into this product.
- https://github.com/LittleHalf/MCPoker — architectural reference for capture/context separation and multi-street history; no source, cloud service or LLM advice copied into this product.

## PHE hand evaluator 0.6.0 (MIT)

Multiway Monte Carlo evaluation uses the published phe npm package: https://github.com/thlorenz/phe . Copyright 2017 Thorsten Lorenz. Complete MIT notice: docs/licenses/PHE-LICENSE.txt.

## NoRegrets research patch (MIT; excluded from the application)

The isolated candidate under `research/noregrets` references and patches
https://github.com/conorarmstrong/noregrets at revision
`757f7692738069522195d2b486eec60a8b010c0c`, copyright 2026 Conor Armstrong.
The full notice is in `research/noregrets/LICENSE`. Its source checkout,
compiled binaries and synthetic smoke models remain under ignored `.research`;
no engine, pretrained model or advice from it is included in the packaged app.

## Optional local Monker Free 10114

Monker Free is a separately installed proprietary dependency obtained from
the vendor package. No vendor executable, card-rank cache or Java runtime is
redistributed in the source handoff. The local adapter invokes the pinned
original numeric kernel without modifying its bytecode. Installation hashes,
adapter source hashes, numerical scope and limitations are recorded in
docs/solver-provenance.json and docs/monker-app-2026-11-07.md. This integration
does not imply permission to redistribute or commercially use vendor files.

## Optional personal ART/GTO preflop data

The separately downloaded ART/GTO Viewer range package contains 2,606 free
100bb six-max NLHE preflop range files for personal, non-commercial study/play:
https://artgto.com/learn/ranges/ . Its original LICENCE.txt is retained in the
local user-data installation. No vendor executable, HTML viewer or range data
is bundled in this source handoff. The importer reads the published numerical
sizing tables and frequencies; it does not execute vendor code. Terms and
provenance limitations are documented in docs/preflop-2026-11-07.md.

## HoldemMath HU push/fold data (CC BY 4.0)

Data source: HoldemMath — https://holdemmath.com/ . Pinned upstream repository:
https://github.com/Julian-cloud-max/holdemmath-data at
7c72b1261f08c63cf8366120dc531631935c21cd. Only the no-ante heads-up push/fold
data are used, not its approximate single-caller multiway tables. The original
LICENSE-DATA is retained alongside the local imported data. The upstream
license is CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ . No claim of
independent GTO verification or unrestricted NLHE coverage is made.

## Holdem-eval range ordering (ISC; explicit starting prior)

The explicit 50% starting range references apometta/holdem-eval at
`e0687e13ff0d780ec8134a33bdc17adfbc8fe606`, PercentageToRange.cpp:
https://github.com/apometta/holdem-eval . Copyright 2018 Andrew H. Pometta.
The complete ISC notice is preserved in
`docs/evidence/monker-turn-2026-11-07/holdem-eval-ISC-LICENSE.txt`.
This ordering is used as the stated default hero prior in the Monker training
integration. No evaluator runtime dependency or preflop GTO claim is introduced.

## RangeConverter 40 BB cash chart reference (personal local import)

Optional numeric chart data are read from the vendor's freely downloadable PDF:
https://rangeconverter.com/downloads/6-max-40bb-Poker-Charts-No-Limit-Texas-Holdem-Cash
SHA256 a1723be2a7ac0e61b7a1342e1ebe7e778747bb2197572bf8fb0a877610e18799.
The original PDF retains RangeConverter's copyright and branding. No permissive
redistribution licence is inferred: neither the PDF nor converted ranges are
bundled or committed here. The user imports their own local personal-study copy.
The importer reads 35 simplified 6-max 40 BB cash charts, including RFI, facing
RFI and facing a 3-bet. Rendered mixes use 50-percent steps. Printed aggregate
bars can differ from those simplified grids. This is a chart reference, with no
independent exploitability certificate, not an unrestricted 2–6 player solve.

### HoldemMath six-handed push/fold tables

HoldemMath (https://holdemmath.com). Data from the [pinned upstream release](https://github.com/Julian-cloud-max/holdemmath-data/tree/7c72b1261f08c63cf8366120dc531631935c21cd), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
The bundled push-fold.json retains hand-class membership and order for the seven six-handed no-ante tables. Aggregate coverage and EV columns were removed.

### PokerNow flop study

The optional [PokerNow sample](https://github.com/RubberDucke825/PokerNow-Analysis-and-Trainer/tree/3cffd72966c933949c253bfb24ee4de3e4d5d2db) contains TexasSolver strategies for personal study. The installer reads the publisher's archive directly and checks its SHA-256. Only the board catalogue and file hashes are bundled. Upstream documents separate terms for its preflop range sources.
