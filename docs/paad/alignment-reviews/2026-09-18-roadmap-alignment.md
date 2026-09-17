# Alignment Review: Pocket Draw roadmap vs. product design (second pass)

- **Date:** 2026-09-18
- **Commit:** 2ac0a98

## Documents Reviewed

- **Intent:** `docs/product-design/README.md`, `docs/product-design/UI.md`, `docs/product-design/Gameplay-v2.md`, `docs/product-design/Leaderboards.md`
- **Action:** `docs/product-design/Roadmap.md` (28-item phased issue list)
- **Design:** `docs/superpowers/specs/2026-09-17-fire-mechanic-scoring-design.md`, `docs/superpowers/specs/2026-09-17-connectivity-rewrite-design.md`

## Source Control Conflicts

None — the recent commit history is entirely this session's own documentation work.

## Issues Reviewed

### [1] "Extend expiresAt to cover the match duration" was ambiguous about which code path it touches

- **Category:** Design gap / ambiguity (introduced by this session's own second pushback pass)
- **Severity:** Minor
- **Documents:** connectivity spec's "Token freshness on reconnect" note
- **Issue:** `expiresAt` is a field on `QrInvitePayload` that `QrDisplayScreen.tsx` already uses to auto-regenerate the _displayed_ QR code.
  The pushback-pass resolution to "extend `expiresAt` to cover the match duration" didn't specify whether that meant changing the QR display component's own regeneration timer, or just the reconnect-auth validation window on the token already captured into `ChallengeHandoff` at scan time.
  Only the latter is actually needed — the QR screen is dismissed well before a mid-match reconnect could happen.
- **Resolution:** Clarified in the connectivity spec that this only affects the reconnect-auth validation window on the already-captured token, not `QrDisplayScreen.tsx`'s regeneration behavior.

### [2] Roadmap's own "Fire mechanic & scoring" subsection was stale after the false-start resolution

- **Category:** Design gap (roadmap summary out of sync with spec)
- **Severity:** Minor
- **Documents:** `Roadmap.md`'s "Fire mechanic & scoring" subsection vs. the fire-mechanic spec
- **Issue:** The roadmap's own summary still said `falseStart` is "untouched... not folded into the zone system," without mentioning the point-value resolution made during this session's second pushback pass (the non-offending player scores normally rather than getting a flat bonus) — the same staleness pattern caught twice already in the first alignment pass.
- **Resolution:** Updated the subsection to state the resolution and point to the fire-mechanic spec's "False-start point value" note for the alternatives considered.

## Alignment Summary

- **Requirements:** No change from the previous pass — full coverage confirmed, no new gaps against `README.md`/`UI.md`/`Gameplay-v2.md`/`Leaderboards.md`.
- **Tasks:** No scope creep found in this session's three pushback resolutions (reconnect-auth timing, false-start scoring, item 24's corrected description) — all are internal engineering necessities of already-in-scope items, not new features.
- **Design items:** Both specs are now fully synced with the roadmap's own summary subsections; no other stale duplication found on this pass.
- **Status:** Aligned. Two minor clarity issues found and fixed; nothing substantive remains open from either alignment pass.
