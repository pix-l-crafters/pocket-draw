# Mobark Walid O Bacran — Duel (result/round-loop) + Map coordination + integration

See `README.md` in this folder for the full status catch-up. This file is your v2 remaining-work list; v1's checkboxes in `docs/task-splits/mobark.md` are stale (they show nothing done — actually all coded and in PR #26).

## Already done (verified via git, not just checkboxes)

- [x] 4.17 — Round loop / match-decided logic (`src/features/duel/roundLoop.ts`, self-check in `roundLoop.check.ts`), including the same-day tie-scoring fix (`6ead567`: ties award both players a point; a simultaneous-majority tie round doesn't end the match, requires a strict lead)
- [x] 4.16 — Per-round result screen (`src/features/duel/RoundResultScreen.tsx`)
- [x] 6.1 — Match summary screen (`src/features/postmatch/MatchSummaryScreen.tsx`)
- [x] 6.2 — Rematch offer (always shown, per your own note in the 17:24 log entry — the ticket's "particularly after a tied match" read as motivation, not a gating condition)
- [x] 6.3 — Return-to-map flow
- All of the above are on PR #26, currently CI-red for the two systemic reasons in `README.md`

## Remaining

- [x] **Branch reconciliation** — done. `moby/chore/merge-2026-09-10-v2`, based on Mihir's clean merge branch, with your backend wiring, `roundLoop.check.ts`, the tie-scoring fix, and the corrected `bundleIdentifier` layered on top, plus a newly-found `bleRssi.ts` type bug fixed along the way. Pushed to origin — see `README.md` for full detail.
- [ ] Open the PR from `moby/chore/merge-2026-09-10-v2` into `dev`, then close #26–#30 against it
- [ ] Wire `RoundResultScreen` / `MatchSummaryScreen` into the actual duel flow once the reconciled branch has a real entry point (they were built presentational-only, per your own 17:12/17:24 log notes, since no duel screen existed yet at the time)
- [ ] Swap `mockRoundOutcome` for Tianze's real `resolveRoundOutcome`/`roundJudge.ts` now that 4.15 has landed (flagged as a direct handoff to you in the 18:55 log entry)
- [ ] Device-verify the prod-readiness checklist items in `README.md` that touch your code (offline queue flush, disconnect retry) once the reconciled branch is on `dev`

## Building in parallel

Contracts are mostly moot now — the real implementations of `roundOutcome.ts` (Tianze/Tanachat) and `matchResult.ts`/`playerStats.ts` (Mihir) all exist. Swap remaining mock imports for the real thing per `src/contracts/README.md`'s swap pattern rather than continuing to build against mocks.
