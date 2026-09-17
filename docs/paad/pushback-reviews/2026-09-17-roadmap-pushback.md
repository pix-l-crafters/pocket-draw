# Pushback Review: docs/product-design/Roadmap.md

- **Date:** 2026-09-17
- **Spec:** `docs/product-design/Roadmap.md`
- **Commit:** 8685dc8

## Source Control Conflicts

One conflict, surfaced mid-review: commit `8474033` ("docs: add challenge UI") landed on this branch while the roadmap was being written, adding a new line to `UI.md` — "the Challenge tab, when the challenge is accepted, launches the game instructions screen in full screen... From that screen, the gameplay starts."
Checked the current pipeline (`DrawCalibrationScreen.tsx` etc.) and confirmed no such screen exists — its instructional copy is calibration-specific, not general game rules.
Resolved by adding it as a new Phase 2 issue.

## Issues Reviewed

### [1] Missing full-screen game-instructions step

- **Category:** Omission (source control conflict)
- **Severity:** Serious
- **Issue:** A newly-committed `UI.md` requirement (a full-screen instructions step after challenge acceptance) had no corresponding roadmap issue and no existing implementation.
- **Resolution:** Added as Phase 2 item 10.

### [2] Fire mechanic and scoring implement Gameplay v1, not the now-canonical v2

- **Category:** Contradiction / Feasibility
- **Severity:** Critical
- **Issue:** `raiseGestureDetector.ts` auto-fires on an accelerometer threshold (v1's "auto shoots at shoulder position"), and `roundJudge.ts`/`RoundOutcome` only supports a binary win/tie/false-start model with no headshot/bodyshot scoring.
  The user declared Gameplay v2 canonical (v1 discarded) mid-review, which requires a manual fire trigger and height-zone-based scoring (bodyshot 1pt, headshot 2pt, miss 0pt) — neither exists today, and classifying shot height needs continuous position tracking the current sensor pipeline doesn't do (accelerometer drift risk).
- **Resolution:** User chose to build v2 as written (not fall back to the existing mechanic). Follow-up decisions made during resolution:
  - Round scoring: order shots by reaction time, classify the faster shot's zone; if it's a miss, fall through to the slower player's shot; if both miss, 0-0. `falseStart` stays a separate, orthogonal outcome kind.
  - Fire trigger: Android via native volume-key interception (reliable); iOS via on-screen tap-to-fire as the default, since Apple restricts volume-button capture to active-camera apps (`AVCaptureEventInteraction`) and the unofficial `AVAudioSession.outputVolume`-watching hack is fragile.
    Other iOS options (Action Button, the unofficial hack, `AVCaptureEventInteraction`) are documented in the roadmap for a teammate who wants a different tradeoff.
    The side/power button has no public API on iOS at all — ruled out entirely.
  - `Gameplay-v2.md` itself was updated with the clarified scoring/fallthrough rule so the ambiguity doesn't resurface for the next reader.
  - Split into Phase 1 items 3–6 (feasibility spike, Android trigger, iOS trigger, round-judge rewrite) plus the existing match-structure items.

### [3] Unauthenticated local signaling server on a network that isn't always private

- **Category:** Security
- **Severity:** Serious
- **Issue:** The planned local signaling server (host-side, for WebRTC SDP/ICE exchange) had no authentication. On the "existing shared WiFi" connection mode — one of the two modes the roadmap designs for — the signaling port is reachable by any other device on that network, not just the intended opponent.
- **Resolution:** Require the connecting peer to present the QR payload's `challengeToken`/`discoveryToken` before the host accepts an SDP exchange. Added as its own item (22) alongside the signaling server item (21).

### [4] `MatchResult` schema change has no migration path

- **Category:** Omission
- **Severity:** Moderate (contingent on data existing)
- **Issue:** `playerStatsRepository.ts`'s `isMatchResultDocument` type guard requires the old `winnerId` field; the planned schema change to a `results` map would silently exclude any existing Firestore documents from stats/leaderboards with no crash or warning.
- **Resolution:** Confirmed the `matchResults` collection is dev-only scratch data — clear it before cutover instead of writing a migration. Noted on item 7.

### [5] `ChallengeHandoff.roundCount: 3 | 5 | 7` contract not addressed by the round-count fix

- **Category:** Omission / contradiction
- **Severity:** Moderate
- **Issue:** Design decision #2 fixes round count at 3, and the item removing `RoundCountSelector`'s UI didn't say whether the shared contract type (which still allows 5 or 7, and flows through `App.tsx` into the duel session) changes too — leaving it as-is means TypeScript can't catch a stale caller.
- **Resolution:** Folded into item 9: narrow `ChallengeHandoff.roundCount` to the literal `3`.

### [6] Inconsistent item granularity for a doc meant to become individually-pickable GitHub issues

- **Category:** Scope imbalance
- **Severity:** Moderate
- **Issue:** Several items (fire trigger, hotspot host-side flow, signaling server) each bundled multiple GitHub-issue-sized pieces of work under one list entry, despite the doc's own framing that "anyone can pick up any item."
- **Resolution:** Split into finer-grained sub-issues at consistent granularity: fire trigger split by platform (items 4, 5); hotspot host-side flow split into existing-network detection, Android auto-create, and iOS manual flow (items 17–19); signaling server split from its auth requirement (items 21, 22).

## Discarded candidates

- "Removing the BLE debug tab loses a useful QA/debugging tool" — no defensible consequence, just a convenience tradeoff already implied by the design decision.
- "The leaderboard's 6 ranking types add UI complexity" — an opinion, not a named failure mode.

## Summary

- **Issues found:** 6 (plus 2 candidates dropped for lacking a defensible consequence)
- **Unresolved:** None — every issue was discussed and resolved in-session.
- **Status:** All findings are already applied to `Roadmap.md` and `Gameplay-v2.md` (commit `8685dc8`). The roadmap now has 27 items across 5 phases and is ready to convert into GitHub issues; no further pushback-review action is pending.
