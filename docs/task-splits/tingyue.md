# Tingyue He (tingyueh) — Challenge: QR

Source: Section 9; backlog Epic 3. See `README.md` in this folder for shared notes.

## Extra note for you

Your QR payload work (`feature/payload-rebased`: `src/features/qr/types/qr.types.ts`, `qr.validation.ts`) is currently orphaned — it isn't merged into `dev` or into `mobark/receive-branches`.
Rebase it onto the current design-system baseline first; it predates the dark theme and shared components, and `App.tsx` has a history of picking up literal merge-conflict markers when two people touch it at once, so rebase early rather than at the end.

## Tasks (backlog refs)

- [ ] Rebase your existing QR payload/validation work onto the design-system baseline
- [ ] 3.1 — Generate & display player QR code (encode identity/session token)
- [ ] 3.2 — QR scanner screen (camera-based)
- [ ] 3.3 — Opponent details popup on scan (name, wins, ELO, win/loss — stub the stats until Mihir's backend lands)

## Likely files

`src/features/qr/` (yours already), `src/features/challenge/` (new: QR display screen, scanner screen, opponent popup)

## Suggested branch

`tingyue/feat/qr-challenge`

## Building in parallel

- 3.3 opponent popup: code the win/ELO fields against `src/contracts/playerStats.ts` + its mock instead of waiting on Mihir's 5.1/5.5.
- Your QR scan result is the producer side of `src/contracts/challengeHandoff.ts` — once you settle its real shape from 3.2, update that contract file as its own small PR (not buried in a long-lived branch) so Siheng can swap his mock for the real thing.
- See `src/contracts/README.md` for the full pattern.
