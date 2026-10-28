# Decision engine: all streets, multiple players

The active goal is automatic Fold/Check/Call/Bet/Raise advice for every new valid decision, preflop through river, including multiway. Existing capture/recognition is authoritative and must remain unchanged. Earlier river-only scope is not completion of this goal.

## Architecture

Consume LiveSnapshot through a decision-state adapter. Maintain betting context and range assumptions in the decision layer only. Use integer chip units for legal call amounts, minimum raises, short all-ins, reopening rights, pending players and sidepots. Separate observed facts from inferred context. No automated poker actions.

An asynchronous provider router runs a real sampled CFR solver for the finite betting model on every street and 2–10 players; its public information sets cannot contain hidden opponent or future cards. Full-range defaults remove mandatory manual range entry. Bounded computation and showdown rollouts are explicit approximations, never certified Nash/GTO. Existing exact HU river DCFR can replace an approximate result only when the model and current node match. Every result binds to decision identity and range revision; stale work is cancelled.

Outputs contain every legal modeled action, total/incremental sizing, mixed frequencies, recommended action, numerical evidence, range assumptions, model limitations and solver provenance. Equity alone is not a decision provider. Missing/inconsistent observations must be distinguished from unsupported strategy coverage; no narrower player-count/street gate may remain in the automatic route.

## Validation

- Betting mechanics: every street, 2–10 players, checking/free option, calls, full/short all-ins, raise increments/reopening, folded/dead money, uncalled excess, main/sidepots and split pots.
- Information hiding: own hand/public history only; no opponent-card/future-board leakage.
- Solver: independent small-game Nash/best-response checks, deterministic seeds, valid frequencies, hand-dependent strategies, deadline and memory bounds.
- Integration: automatically produce advice for fresh decision fixtures at each street and player count; invalidate on action/hand/cards/stacks/ranges changes. Preserve capture files byte-for-byte.
- Quality remains unproven until actual model scope is verified; a functioning approximation is progress, not a claim that full no-limit GTO is solved.

## Implementation sequence

1. Shared decision/game/provider contracts and independently tested legal betting engine.
2. External-sampling CFR over sampled private deals and hidden runouts, including bounded continuation and sidepots.
3. Observation adapter and automatic range/context management; worker cancellation/router.
4. Automatic advisor integration, native decision matrix and calibrated solver validation.
5. Broaden strategy quality/verified coverage until the original objective passes its completion audit.

Algorithm reference inspected: OpenSpiel external_sampling_mccfr.py and mccfr.py (Apache-2.0), including its documented multiway simple-averaging limitations. Implementation must retain proper notices if code is adapted.
