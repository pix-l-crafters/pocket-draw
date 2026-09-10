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

## Depends on / blocked by

- Win/ELO fields in the opponent popup are stubs until Mihir's 5.1/5.5 land
