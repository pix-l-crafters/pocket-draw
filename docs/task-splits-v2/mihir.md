# Mihir Rabade — Backend (match results) + Device pipeline (Android)

See `README.md` in this folder for the full status catch-up. This file is your v2 remaining-work list; v1's checkboxes in `docs/task-splits/mihir.md` are stale.

## Already done (verified via git)

- [x] 5.1 — Match-result data model (`src/features/backend/types.ts`)
- [x] 5.2 — Write match result to backend on completion (`matchResultsService.ts`, `matchResultsRepository.ts`)
- [x] 5.3 — Offline queue (`matchResultQueue.ts`, `connectivity.ts`) — optimistic + enqueue-on-Firestore-error, since `@react-native-community/netinfo` isn't installed (your own 18:20 log note — worth revisiting if the optimistic approach misses real offline transitions during device testing)
- [x] `playerStatsRepository.ts` (wins/losses from `matchResults`; ELO defaulted until Tanachat's 5.4 — that's now landed too, on `tanachat/feat/duel-pre-round-ritual`)
- All of the above are on PR #27, currently CI-red for the two systemic reasons in `README.md` (not your code's fault — see there)

## Extra note

**Your integration branch** (`mihir/chore/merge-branches-2026-09-10`) turned out to be the clean one — its merges of PR #28 and #29 didn't drop any files, unlike Mobark's `moby/chore/merge-2026-09-10`.

`moby/chore/merge-2026-09-10-v2` is now based on your branch, with Mobark's backend wiring, `roundLoop.check.ts`, and the tie-scoring fix layered on top.

It also fixes `app.json`'s `bundleIdentifier` (it had picked up `com.sihengm.pocketdraw`, Siheng's personal signing ID, from a merge-conflict resolution on `sihengma/map` that went the wrong way — now back to the shared `com.anonymous.pocketdraw`). That's the branch everyone's building on now — see `README.md`.

## Remaining

- [ ] 7.1 — Android physical-device full-loop test (map → QR → BLE → duel → result), once the reconciled integration branch lands on `dev`
- [ ] 7.3 — Cross-platform permission QA, pair with Tianze (iOS)
- [ ] Reconcile `mihir/feat/secrets-setup-rebased`'s `.config/` tooling layout against what's already on `dev` (still flagged from v1 — hasn't been touched)
- [ ] Consider swapping the optimistic-connectivity approach in `matchResultQueue.ts` for a real `netinfo`-backed check if device testing shows missed offline transitions

## Building in parallel

Nothing left blocking on contracts for your area — 5.4 (ELO) landed on Tanachat's branch, so `playerStatsRepository.ts` can consume the real formula instead of a default once the reconciled branch merges.
