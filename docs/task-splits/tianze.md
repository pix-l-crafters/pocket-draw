# Tianze Wu (wutianze3) — Duel (fire/raise detection) + Device pipeline (iOS)

Source: Section 9; backlog Epics 4 and 0/7. See `README.md` in this folder for shared notes.

## Design decisions to raise with the team first (Section 11)

- Fire/raise gesture spec (4.9) — same raise-to-threshold as the original draw mechanic, or a distinct gesture? Exact detection thresholds?
- False-start handling scope (4.13) — voids just the round or the whole match? What movement threshold counts as "early"?
- Tie-window threshold and behavior (4.15)
- Mid-round/mid-match disconnect handling (4.18) — abort, pause, or retry?

## Tasks (backlog refs)

- [x] 4.8 — FIRE signal trigger & sync (both phones, after the countdown)
- [ ] 4.9 — Fire/raise gesture spec (after the design decision above)
- [ ] 4.10 — Raise/fire gesture detection (accelerometer, per the spec)
- [ ] 4.11 — "Test your draw" calibration step
- [ ] 4.12 — False-start detection
- [ ] 4.13 — False-start handling (after the design decision above)
- [ ] 4.14 — Reaction time capture (ms)
- [ ] 4.15 — Tie detection & handling (after the design decision above)
- [ ] 4.18 — Mid-round/mid-match disconnect handling (after the design decision above)
- [ ] 0.5 — iOS signing & TestFlight pipeline — the EAS project is already linked (`eas.json`, on `mobark/receive-branches`); finish the signing/distribution setup
- [ ] 7.2 — iOS physical-device full-loop test

## Likely files

`src/features/duel/` (new: fire signal, raise detection, calibration, false-start), `eas.json`, iOS signing config

## Suggested branches

`tianze/feat/duel-fire-detection`, `tianze/chore/ios-signing`

## Building in parallel

- Fire/raise/false-start code (4.8-4.13) talks to the BLE session through `src/contracts/duelChannel.ts` — use `mocks/mockDuelChannel.ts` instead of waiting on Siheng's 3.8. Swap in the real channel once it lands.
- You're the main producer of `src/contracts/roundOutcome.ts` — keep its shape in sync with Tanachat, who also writes to it (via 4.15, tie handling).
- 4.10 still genuinely depends on 4.9's design decision being settled first — contracts don't help with an undecided spec.
- 7.2 is sequenced last, after the rest of the duel loop is demoable.
- See `src/contracts/README.md` for the full pattern.
