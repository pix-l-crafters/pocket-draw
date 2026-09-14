# Tingyue He — Challenge: QR

See `README.md` in this folder for the full status catch-up.

## Already done (verified via git — merged to `dev`)

- [x] Rebased QR payload/validation work onto the design-system baseline (`tingyue/feat/qr-challenge`)
- [x] 3.1 — QR display screen (`src/features/challenge/QrDisplayScreen.tsx`), auto-regenerates on 1-minute expiry
- [x] 3.2 — QR scanner screen (`src/features/challenge/QrScannerScreen.tsx`, `expo-camera`)
- [x] 3.3 — Opponent popup on scan (`src/features/challenge/components/OpponentPopup.tsx`), built against the `playerStats` mock — worth swapping to Mihir's real `playerStatsRepository` now that it's landed (see below)
- Merged via PR #25, already on `dev` — the only one of the six task-split areas fully closed out

## Remaining

- [ ] **3.4–3.6 — round-count selector (3/5/7), send challenge request, incoming challenge popup (Accept/Decline).** Reassigned to you from Siheng (per his note, 2026-09-10) — no branch or commits found for this yet, so treat this as the current open item, not previously-started work.
- [ ] Your scanner already produces the `ChallengeHandoff` this consumes (`src/contracts/challengeHandoff.ts`) — `App.tsx` currently just logs it (`console.log("Challenge handoff created:", handoff)`) since no consumer existed. 3.5/3.6 replace that log line with the real send/accept flow.
- [ ] Siheng's 3.8 (`src/features/challenge/session/`, `ConnectingScreen.tsx`) is the BLE session layer that should receive the accepted challenge — it exists on his PR #28 (mock-transport-backed; real BLE is still a stub, see `README.md`). Check in with him on wiring the accept flow into it.
- [ ] Optional cleanup: swap `OpponentPopup`'s `playerStats` mock for Mihir's real repository now that PR #27's backend work exists (currently only wired for Siheng's map pin popup, per the 19:45 log entry — same swap applies here)
