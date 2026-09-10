# Tanachat Mongkolporn (hbeat) — Backend (ELO) + Duel (pre-round ritual)

Source: Section 9; backlog Epics 5 and 4. You also own the Epic 0.7 BLE spike. See `README.md` in this folder for shared notes.

## Status check on the BLE spike

Ticket 0.7 ("pass/fail spike: BLE host/guest session, Android↔iPhone") is yours to record the outcome on. `BleScreen.tsx` (using `react-native-ble-manager`) is already merged into `dev`, which suggests the spike passed — but the plan document still describes it as "in progress." Worth closing that ticket out explicitly, one way or the other, before others build further on top of BLE.

## Design decisions to raise with the team first (Section 11)

These block the tickets below — flag them for resolution before writing the code, per the plan's own risk mitigation:

- Separation-confirmation method (4.2) — GPS is too imprecise at 5m; likely a BLE RSSI proxy or a manual "confirm you're in position" step
- Buzz/countdown sequencing (4.6) — does the buzz precede the countdown, or count as part of it?
- ELO formula (5.4) — win/loss only, or does reaction time factor in? Starting rating and K-factor?

## Tasks (backlog refs)

- [ ] Close out 0.7 (BLE spike outcome)
- [ ] 4.1 — "Move apart to 5m" instruction screen
- [ ] 4.2 — Separation confirmation check (after the design decision above)
- [ ] 4.3 — "Face phone down" instruction screen
- [ ] 4.4 — Face-down orientation detection (accelerometer)
- [ ] 4.5 — Synchronized random-delay haptic buzz
- [ ] 4.6 — Buzz/countdown sequencing (after the design decision above)
- [ ] 4.7 — 3-2-1 countdown UI/audio, synced on both phones
- [ ] 5.4 — ELO calculation & update (after the design decision above)

## Likely files

`src/features/duel/` (new: pre-round ritual, countdown, buzz), `src/features/backend/` (elo logic)

## Suggested branches

`tanachat/feat/duel-pre-round-ritual`, `tanachat/feat/elo-calc`

## Building in parallel

- The pre-round ritual (4.1-4.7) talks to the BLE session through `src/contracts/duelChannel.ts` — use `mocks/mockDuelChannel.ts` (an in-memory loopback pair) instead of waiting on Siheng's 3.8. Swap in the real channel once it lands.
- You're a co-producer of `src/contracts/roundOutcome.ts` (via 4.15, tie handling) alongside Tianze — keep its shape in sync with him rather than each assuming different fields.
- See `src/contracts/README.md` for the full pattern.
