# Automatic Decision Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatic legal, numerically computed decision recommendations on every street and in multiway pots, with explicit verified/approximate quality.

**Architecture:** Existing snapshots feed an integer-chip betting state and explicit range priors. A cancellable worker solves the finite game using sampled CFR, with exact river providers where matched; the advisor shows sizes, frequencies and limitations.

**Tech Stack:** Existing TypeScript/React/Electron, Web Workers, PHE, existing Postflop WASM.

**Spec:** ../specs/2026-10-28-decision-engine.md

## Global constraints
- Do not modify capture, recognition, bridge, or existing snapshot contract.
- No automated poker actions. No LLM-generated strategy.
- All numeric/state uncertainty is explicit; approximation must never masquerade as measured Nash/GTO.
- Preserve the all-street/multiway objective; incomplete quality remains active work.

## Tasks
- [x] Implement/test `src/decision/betting.ts` legal actions/transitions and `payoffs.ts` sidepot settlement, consuming shared types. Verify random legal sequences conserve chips and close rounds.
- [x] Implement/test `src/decision/sampler.ts` legal joint range/runout sampling, parser and root-hole importance sampling.
- [x] Implement/test `src/decision/mccfr.ts` sampled-regret solver with hidden information, budgets, actual action values and provenance. Verify independent small games and no hidden-card leakage.
- [ ] Implement/test `src/decision/adapter.ts` and `context.ts`: existing snapshots/history to game state, defaults and observed range context.
- [x] Implement worker/client/router and `DecisionAdvisor.tsx`; replace river-only automatic gate in LivePanel, preserve training UI.
- [x] Run end-to-end decision matrix across all streets/counts and stale/range/card/hand changes. Review findings, fix and rebuild actual Windows artifact.
- [ ] Audit quality and remaining strategic gaps against original full objective before marking achieved.

## Current audit

All-street native functionality passes. The generic strategy failed reliability
review: sparse opponent training and passive continuation bias produce systematic
extreme shove recommendations at 100bb. Approximate output is therefore hidden
by default, with an explicit study-only opt-in. Matched HU river trees retain
independent exploitability checks and now verify complete path legality. Blind
and ambiguous-seat regressions were fixed and independently re-reviewed.

Range conditioning from observed strategies and validated generic continuation
values remain open. Do not mark the full goal complete on the basis of functional
matrix tests. Reproducible diagnostic: `tests/decision-quality.test.ts` (opt-in),
results: `docs/evidence/decision-quality.json`.

Version 1.3.1 replaces the default generic traversal with complete outcome-
sampling cycles. Exact suit symmetry, root-class importance sampling, weighted
small-game equilibria and finite-number guards are tested and independently
reviewed. The Windows portable passes all 16 native street/count cases; 237 unit
tests pass. Capacity is reserved before drawing chance and every started cycle
finishes, removing the former passive continuation mechanism. Full-range
reliability still fails: `docs/evidence/decision-quality-outcome.json`. The gate
remains and neither unchecked task above is complete.

Version 1.4 adds an exact HU turn-to-river path with unchanged 64MiB cap,
bounded 5000-node public graph and current-node-only strategy export. Independent
chance enumeration / private-information-correct best response matches the
actual WASM solver on the small turn fixture. A full-range turn fixture passes
the real native worker and displays certified advice with experiment mode off.
The range validator's missing offsuit `o` blocked automatic FULL_RANGE even on
river; this is fixed. Mandatory future check/fold/call and complete chance
coverage are now certificate requirements. Generic preflop/flop/multiway
quality and history-conditioned ranges remain open.
