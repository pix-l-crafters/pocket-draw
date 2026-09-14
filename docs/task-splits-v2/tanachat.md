# Tanachat Mongkolporn — Backend (ELO) + Duel (pre-round ritual)

See `README.md` in this folder for the full status catch-up. This file is your v2 remaining-work list; v1's checkboxes in `docs/task-splits/tanachat.md` are stale.

## Already done (verified via git — `tanachat/feat/duel-pre-round-ritual`, PR #29)

- [x] 4.1 — "Move apart to 5m" instruction screen
- [x] 4.2 — Separation confirmation check
- [x] 4.3 — "Face phone down" instruction screen
- [x] 4.4 — Face-down orientation detection
- [x] 4.5 — Synchronized random-delay haptic buzz
- [x] 4.6 — Buzz/countdown sequencing
- [x] 4.7 — 3-2-1 countdown UI/audio
- [x] 5.4 — ELO calculation & update (`a9594da`, `src/features/backend/playerStatsRepository.ts`) — this unblocks Mihir's stats repo (was defaulting ELO until this landed) and Siheng/Tingyue's stat-popup mocks
- Merged via PR #29, currently CI-red for the two systemic reasons in `README.md` (not your code's fault)

## Remaining

- [ ] **Close out issue #7** (the BLE spike, tracked in `pix-l-crafters/The-Plan`, currently still "In progress" on the board despite `BleScreen.tsx` being on `dev` for over a week, and real BLE session wiring now existing via Siheng's 3.8).
      This is the one board item worth touching directly even though `README.md` says to stop tracking against the board generally — it's a named deliverable in the plan doc's Section 8 and needs an explicit pass/fail recorded, not left ambiguous.
- [ ] Your `roundOutcome.ts` tie-handling is a co-production with Tianze (4.15) — his 18:55 log entry notes the real shape landed on his branch with your fields matching; just confirm nothing drifted once the reconciled integration branch is built.

## Building in parallel

Nothing left blocking here — the pre-round ritual and ELO are both done and merged. Consider picking up the unowned Product area (`README.md`) or helping with device testing once the reconciled branch is on `dev`.
