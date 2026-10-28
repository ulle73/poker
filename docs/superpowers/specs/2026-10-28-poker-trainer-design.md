# Poker GTO Advisor — MVP design

Jonas delegates research, architecture and implementation and requests a working Windows trainer overnight. No further design approval is needed. Product choices below are the implementer's decisions.

## Outcome
A portable, offline Windows desktop app: a visible HTML training table, a DOM observer, and genuine heads-up river DCFR solutions. Train with hidden recommendations or study with visible frequencies. Show exact hole cards, board, positions, remaining stacks, bets, pot, ordered hand history, range assumptions and solve provenance. Every number comes from the observed board or actual solver output. Export session results and solve configurations.

## Approaches
1. Repair WinUI/OpenCV skeleton: rejected; no build project, missing card templates, heuristic recommendations, unverified full-state extraction.
2. Electron + React/TypeScript + vendored Postflop WASM: selected. Deterministic DOM capture, real solver in a separate worker, offline distribution, single frontend shared by desktop and browser QA.
3. Cloud vision and LLM advice: rejected for the MVP; network latency, cost, incomplete information and no equilibrium certificate. OCR remains a researched future adapter, never a strategy provider.

## Scope and constraints
- Heads-up NLHE, chip EV, no rake, symmetric effective stacks, river only. User-defined board, ranges, pot, stack, sizing menu and iteration budget within explicit limits.
- Full imported/synthetic prefix history is retained but ranges at the river root are explicit assumptions; preflop/flop/turn are not solved or inferred. Never market this as full-game GTO.
- Opening decisions, facing bets and raises use actual nodes from the solved tree. Fold/call/check/bet/raise/all-in distinguish legality and additional chips versus total-to amounts.
- Frequency recommendations only for supported, reachable, compatible combos. Report measured exploitability relative to the configured root pot; reaching the iteration budget alone is not convergence.
- Default drills start with a complete solver configuration and real combos. No AI guesses, randomized heuristic advice or production-site automation.
- DOM is parsed from elements, not React state. MutationObserver publishes complete validated snapshots with hand ID, revision, source token, identity and timestamp. An iframe handshake binds the advisor to the exact training table. Invalid, stale, out-of-order or mismatched data cannot retain an actionable recommendation.
- Opponent metrics are computed only from observed synthetic training actions, labelled as training data and sample-size limited.
- Windows desktop: sandboxed renderer, context isolation, no Node integration, fixed local custom origin, CSP, no external navigation, no broad IPC. Assets including WASM/fonts bundled; no API keys or paid services.
- Session persistence, reset, export and import must be bounded and validated. Malformed input must produce inline errors without corrupting working state.

## Product design
Question: what should I play in this exact observed spot, and what supports that answer?
Use a neutral dark workspace for long evening study. Its own face is the poker board and three semantic traffic-light action lanes: fold red, call/check amber, aggression green. Text labels and exact percentages accompany colour. Table and advisor are primary; history and provenance sit immediately below. No invented win rate or EV-loss score.

## Acceptance
Launch a Windows executable; complete several drills; observe board mutations automatically; get actual per-combo solver frequencies and sizes; verify sums, blockers, legal actions, pot/stack conservation, provenance, stale rejection and saved progress; inspect desktop and narrow layouts. A mathematical river fixture must agree with known value/bluff behavior and measured best response. The delivered package must work without network access.
