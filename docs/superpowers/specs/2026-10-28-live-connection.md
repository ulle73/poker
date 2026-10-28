# Live connection

User explicitly requests using the currently seated Svenska Spel table. Add a read-only connection to that exact browser tab; no calls, folds, bets, joins, cashier actions or account changes. The previous delegation of technical decisions remains in force.

## Architecture
Bundle a small DOM reader, install it for the current document through the browser's supported developer CDP capability, and stream allowlisted fields to an authenticated loopback-only Electron endpoint. The desktop displays the stream under Livebord; no screen images, cookies, credentials, full page HTML or lobby balances are collected. The reader stops when the tab reloads or the user disconnects. A permanent extension is a later installation choice, not required for this session.

The reader must distinguish hidden placeholder cards, active vs occupied seats, dealer/positions, hand ID, pot and currently displayed player bets. History starts at connection, carries a partial-history flag, and does not fabricate missed actions. Amounts retain their observed currency; no assumed bb conversion.

## Strategy boundary
Only show actual solver output for a fully matching supported heads-up river spot with explicit range assumptions and a reconstructable legal betting line. Preflop, flop, turn, multiway and missing/inconsistent fields must have a clear unavailable reason; never substitute a training drill or an invalid reference chart. In particular, the reference's headsup-solved chart reports negative NashConv and is not an acceptable live strategy certificate.

## Acceptance
- Live current-tab data appears and refreshes in the desktop and stale data is marked.
- Exactly one authenticated source session is accepted; sequence, hand identity, currency and numeric constraints validated.
- Loopback server rejects invalid tokens, unapproved origins, oversized bodies and invalid snapshots.
- Existing training behavior and smoke suite still pass.
- A source reader installed in the live document performs no poker actions and is explicitly disclosed in the handoff.
