# Alignment Review: Pocket Draw roadmap vs. product design

- **Date:** 2026-09-17
- **Commit:** b1eefc6

## Documents Reviewed

- **Intent:** `docs/product-design/README.md`, `docs/product-design/UI.md`, `docs/product-design/Gameplay-v2.md`, `docs/product-design/Leaderboards.md`
- **Action:** `docs/product-design/Roadmap.md` (27→28-item phased issue list)
- **Design:** `docs/superpowers/specs/2026-09-17-fire-mechanic-scoring-design.md`, `docs/superpowers/specs/2026-09-17-connectivity-rewrite-design.md`

## Source Control Conflicts

None — the 50 most recent commits are all this session's own work; nothing external landed on the branch that the documents don't already account for.

## Issues Reviewed

### [1] Reconnect state-preservation had no tracked task

- **Category:** Design gap (design doc not reflected in action doc)
- **Severity:** Important
- **Documents:** connectivity spec's "Files touched" section vs. `Roadmap.md` Phase 3
- **Issue:** The connectivity spec called for `disconnectRecovery.ts` to carry the in-progress `RoundLoopState` through a reconnect — the actual lever that makes reconnection feel seamless, decided earlier in this design conversation.
  No numbered Phase 3 item tracked it, so it was buried in one files-touched bullet rather than a deliverable anyone would see. It also implied but never stated that `disconnectRecovery.ts` needs porting from BLE-disconnection detection to WebRTC-data-channel detection.
- **Resolution:** Added as Phase 3 item 24 ("Port `disconnectRecovery.ts` to the WebRTC transport... and carry the in-progress `RoundLoopState`... through a reconnect"). Phase 3 now spans items 15–25; Phase 4 shifted to 26–28. Both specs' "Phase 4, item N" cross-references updated to match.

### [2] "Pointing at the opponent" is never sensor-verified

- **Category:** Requirements coverage (partial)
- **Severity:** Minor
- **Documents:** `Gameplay-v2.md`'s Sensors section vs. the fire-mechanic spec
- **Issue:** The doc describes calibrating with "the phone's upper edge... point[ing] towards the opponent," implying horizontal aim/bearing matters. Neither the existing implementation nor the fire-mechanic spec's zone classification checks bearing/yaw — only vertical pitch angle (ready→shoulder) is tracked, and this was true even in the original (superseded) v1 implementation.
- **Resolution:** Left open rather than decided — added to the fire-mechanic spec's Open Questions with both options documented for a teammate to weigh in on: (1) a disclosed simplification noting only raise height is measured, matching the existing fixed-`δ` headshot-zone disclosure, or (2) a real bearing check comparing phone compass heading against the opponent's live GPS bearing.
  The bearing option uses data already available from the map feature's presence data, and has real payoff, but is a meaningfully bigger scope addition than anything else in the spec, and was never built even in v1.

## Alignment Summary

- **Requirements:** Every requirement line in `README.md`/`UI.md`/`Gameplay-v2.md`/`Leaderboards.md` traces to at least one roadmap item or an already-implemented feature (verified against `docs/product-design/Roadmap.md`'s own "Current state" section).
  All 6 `Leaderboards.md` ranking types match roadmap item 12 exactly. `UI.md`'s WebRTC/Bluetooth wording explicitly anticipates dropping Bluetooth entirely ("We might end up not using bluetooth if WebRTC works better"), so the roadmap's full BLE removal is not a deviation.
- **Tasks:** All 28 roadmap items trace to either an explicit requirement or necessary infrastructure for one (e.g., the signaling-auth item isn't itself a stated requirement, but is required for the shared-WiFi connection mode `UI.md` describes to be safe). No scope creep found.
- **Design items:** Both specs' content is now fully reflected in the roadmap's numbered items, including the one design-gap fix from this review (item 24).
- **Status:** Aligned. No further gaps found on this pass; issue [2] is intentionally left open as a discussion point, not a defect.
