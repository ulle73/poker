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
