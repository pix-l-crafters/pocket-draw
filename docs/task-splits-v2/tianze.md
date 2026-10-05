# Tianze Wu — Duel (fire/raise detection) + Device pipeline (iOS)

See `README.md` in this folder for the full status catch-up. v1's checkboxes in `docs/task-splits/tianze.md` were already accurate (you'd kept them current) — carrying them forward.

## Already done (verified via git — `tianze/feat/duel-fire-detection`, PR #30)

- [x] 4.8 — FIRE signal trigger & sync
- [x] 4.9 — Fire/raise gesture spec (1.8g sustained 80ms, 300ms debounce)
- [x] 4.10 — Raise/fire gesture detection (accelerometer, `expo-sensors`)
- [x] 4.11 — "Test your draw" calibration step
- [x] 4.12 — False-start detection (0.25g deviation threshold)
- [x] 4.13 — False-start handling (loses current round)
- [x] 4.14 — Reaction time capture
- [x] 4.15 — Tie detection & handling (100ms inclusive window, 1 point each) — this is the real `roundJudge.ts`/`resolveRoundOutcome` that Mobark's `roundLoop.ts` needs to swap in for the mock
- [x] 4.18 — Disconnect recovery (2 retries, 3s per attempt, then abort)
- Merged via PR #30, currently CI-red for the two systemic reasons in `README.md` (not your code's fault)

## Remaining

- [ ] 0.5 — iOS signing & TestFlight pipeline (EAS project already linked via `eas.json` on `mobark/receive-branches`/`dev` — finish signing/distribution setup)
- [ ] 7.2 — iOS physical-device full-loop test, once the reconciled integration branch is on `dev`
- [ ] 7.3 — Cross-platform permission QA, pair with Mihir (Android)

## Building in parallel

You're done producing `roundOutcome.ts` — flag for Mobark and Tanachat to confirm they've swapped their mocks for your real `resolveRoundOutcome`/`roundJudge.ts` rather than still building against the mock now that it exists.
