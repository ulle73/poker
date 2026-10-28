# Poker Trainer Implementation Plan

> **For agentic workers:** Execute inline with superpowers:executing-plans. Finish with a fresh whole-change review.

**Goal:** Deliver an offline Windows river trainer with genuine solver-backed advice and DOM capture.

**Architecture:** React advisor and independent HTML training table communicate through a validated, source-bound DOM snapshot channel. A worker runs the upstream Rust solver WASM and supplies actual tree nodes and combo strategies.

**Tech Stack:** Electron 45, React 19, TypeScript, Vite 8, Vitest 5, upstream Postflop WASM.

**Spec:** docs/superpowers/specs/2026-10-28-poker-trainer-design.md

## Global constraints
River heads-up chip EV only, no rake; offline assets; no LLM strategies; no production betting actions; exact reach and blocker checks; strategy quality measured; preserve original project in research checkout.

## Review focus
- Hidden cards in DOM must not be treated as dealt cards.
- Stale/mismatched node snapshots must suppress recommendations.
- Raise sizing must use additional cost and street total correctly.
- Invalid ranges, blocked hands and zero-reach combos must never get uniform fallback advice.
- Offline packaged app must retain sessions across launches.

### 1. Validated poker domain and DOM adapter
- [x] Write failing tests for cards, configuration, duplicate cards, pot/stack conservation, DOM visibility, history order and state identity.
- [x] Implement src/core/{types,cards,config,session}.ts and src/table/dom-adapter.ts. Produce validated TrainingConfig and TableSnapshot.
- [x] Run tests and record passing output.

### 2. Actual solver bridge
- [x] Verify WASM in Node against analytical polarized river fixture; record exploitability and per-combo output.
- [x] Implement public/solver-worker.js and src/solver/client.ts; bounded tree preflight, cancellation, progress, exact node and combo reach checks.
- [x] Test action conversion, solver cache identity and unsupported states.

### 3. Working training product
- [x] Build independent table, advisor, practice/study modes, legal action traversal, full prefix history, configurable lab, session persistence and export.
- [x] Verify complete user flows, errors, history and DOM changes in a real browser. Inspect 1440/768/390 widths.

### 4. Windows package and handoff
- [x] Build portable executable, test the packaged desktop offline, save screenshots and test report.
- [x] Document research, limitations, licenses, runtime artifact hashes and start instructions.
- [x] Review whole change, fix material findings, rerun affected checks, mark plan and goal complete only with evidence.

## Execution ledger

- User delegated architecture and implementation without further design questions.
- Original repository history used as the base; legacy documents archived.
- Runtime WASM came from upstream deployment; reviewed source and hashes preserved, no local Rust rebuild claimed.
- Independent reviewer found no P1/P2 issues; unit, build and solver checks passed.
- Actual packaged Windows runtime passed all six drills, persistence and offline checks; portable wrapper verified separately in evidence.
- Reusable project knowledge documented locally in README, architecture, research, provenance and verification; no company-specific knowledge was discovered and no Notion update is appropriate for this personal poker project.
