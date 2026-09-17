# Pushback Review: docs/product-design/Roadmap.md (second pass)

- **Date:** 2026-09-18
- **Spec:** `docs/product-design/Roadmap.md` + `docs/superpowers/specs/2026-09-17-{fire-mechanic-scoring,connectivity-rewrite}-design.md`
- **Commit:** 12073c1

## Source Control Conflicts

None — the 50 most recent commits are all this session's own doc work; nothing external landed on the branch that the documents don't already account for.

## Issues Reviewed

### [1] Reconnect auth could reject a legitimate mid-match reconnect

- **Category:** Omission / contradiction (between items 22 and 24)
- **Severity:** Serious
- **Issue:** Item 22 requires the signaling connection to present the QR payload's `challengeToken`/`discoveryToken` before accepting an SDP exchange. Item 24's reconnect flow re-runs that same handshake.
  Neither specified whether the reconnect's auth check re-validates the token's original `expiresAt` (the QR's 60-second display-validity window, `INVITE_LIFETIME_MS`) — if it did, a disconnect happening minutes into a match would fail to reconnect even for the legitimate opponent.
- **Resolution:** Given the mid-October deadline, selected extending `expiresAt` to cover the whole match duration rather than the more correct but heavier session-local-secret approach.
  Documented all three options in the connectivity spec's new "Token freshness on reconnect" note, explicitly flagged as a deadline-driven call for whoever implements item 24 to raise with their team before treating as final.

### [2] False-start point value was undefined under the new sum-of-points model

- **Category:** Ambiguity
- **Severity:** Serious
- **Issue:** `roundLoop.ts`'s existing false-start penalty is a hardcoded `+= 1`, which only worked because every round win was worth exactly 1 point under v1. Under the newly-resolved sum-of-points match tally, a false start needed an explicit point value with nothing deciding it.
- **Resolution:** Selected: the non-offending player still fires and is scored normally by their own zone accuracy, rather than receiving a flat bonus. Two alternatives (flat 2 points, flat 1 point matching the old code) documented in the fire-mechanic spec's "False-start point value" note for a teammate to discuss with their team.

### [3] Item 24 described the wrong work

- **Category:** Scope accuracy
- **Severity:** Moderate
- **Issue:** Item 24 said to "port `disconnectRecovery.ts` to the WebRTC transport." Reading the actual file showed `DuelDisconnectRecovery` already takes its transport as an injected `DuelChannel` + `reconnect` callback — it's already transport-agnostic.
  The real, previously-uncovered work is extending `DisconnectContext`/`DisconnectRecoveryState` to carry `RoundLoopState`, which the class genuinely doesn't support today.
- **Resolution:** Reworded item 24 to describe the actual state-carrying work and note that item 23's WebRTC `DuelChannel` simply supplies its own `reconnect` callback — no separate porting task exists.

## Summary

- **Issues found:** 3 (0 candidates dropped this pass — one considered-and-rejected hunch, calibration staleness over a multi-round match, was raised and dismissed inline during analysis for lacking a defensible consequence, not carried as a formal discard)
- **Unresolved:** None — all three were discussed and resolved in-session.
- **Status:** All findings applied to `Roadmap.md` and both specs (commit `12073c1`).
  Two of the three resolutions (reconnect token freshness, false-start point value) were explicitly deadline-driven or team-preference calls, documented with alternatives for the implementing teammate to raise with their human before finalizing — not settled engineering answers, just the fastest defensible path given the mid-October deadline.
