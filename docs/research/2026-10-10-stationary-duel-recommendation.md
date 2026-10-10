# Recommendation: relative aiming for stationary duels

Date: 2026-10-10.
Status: recommendation, not an implemented or device-validated design. The user confirmed that duels are strictly stationary and requested this document and an agent handoff. Saving the recommendation is not approval to implement it.

## Decision proposed

Keep GPS for map discovery; remove GPS-derived bearing and compass quality from duel shot scoring. Before each round, capture the direction of the phone's top edge while the player points at the opponent. Compare subsequent orientation against this local reference.

This measures return to a calibrated direction, not opponent position. It trusts correct initial pointing and stationary players. It cannot independently detect translation or dishonest calibration.

Evidence and alternatives: [GPS and duel positioning research](2026-10-10-gps-duel-positioning.md). Execution context: [agent handoff](../../.agents/2026-10-10-stationary-duel-handoff.md).

## Player flow

1. Players stand in their final positions.
2. Each points the phone's top edge toward the opponent at shoulder level, using the intended firing grip.
3. A steady hold confirms the reference, reusing the existing pose-confirmation interaction where suitable.
4. Each lowers the phone into the ready pose.
5. Both confirm readiness, complete the countdown, and draw normally.

Capture the direction each round, including rematches. The existing shoulder step is the natural capture point, but today pose calibration runs at match setup rather than every round: integrating per-round recentering is required. Existing ready/shoulder pitch endpoints may remain reusable while valid; refreshing aim direction must not silently change pitch scoring.

## Shot rule

- Derive the physical top-edge direction from full device orientation in the same local frame as the captured reference.
- Compare horizontal projections for left/right aiming. Initially retain the existing inclusive ±30° tolerance as a playtesting knob, not a proven optimum.
- Retain existing calibrated pitch bands for bodyshot/headshot/vertical miss initially. These approximate draw height, not measured body regions.
- Do not use total 3D orientation difference as the aim error: that would penalize intended headshot elevation or rotation around the aim axis.
- Define behavior for a near-vertical top-edge vector, whose horizontal projection is too small to provide a stable direction. Such a vector must not become an arbitrary bearing or accidental hit. Preserve an already-valid pitch miss where appropriate; otherwise report aim unavailable.
- Preserve current reaction-time synchronization, firing controls, false-start rules, and round adjudication.

## Sensor choice and lifetime

Proposed native sources are Android game rotation vector and iOS Core Motion attitude in an arbitrary gravity-aligned frame. They support relative orientation without needing geographic north. Yaw can drift; fresh per-round references shorten the interval, but acceptable drift must be measured on actual phones.

Primary sources: [Android game rotation vector](https://developer.android.com/develop/sensors-and-location/sensors/sensors_position#sensors-pos-gamerot), [Apple arbitrary attitude reference](https://developer.apple.com/documentation/coremotion/cmattitudereferenceframe/xarbitraryzvertical).

Expo SDK 54's public DeviceMotion API does not expose these native reference-frame choices. Inspect its locked native implementation before deciding whether existing readings suffice or a small native bridge is necessary. Do not substitute magnetic-heading subtraction and claim magnetic interference has been removed.
[Expo SDK 54 DeviceMotion](https://docs.expo.dev/versions/v54.0.0/sdk/devicemotion/)

Keep the orientation stream and coordinate frame continuous from reference capture through firing. Current calibration stops its motion monitor and PreRound starts another; blindly attaching relative calibration to those separate lifetimes would be unsafe. A sensor restart, backgrounding, or tracking interruption invalidates the reference and requires recapture.

## Tracking failure and fairness

Proposed policy: a tracking failure is not a player miss. Before countdown, block readiness until reference and motion are usable. If tracking fails during a round, both peers must agree to invalidate and replay that attempt without awarding points.

The replay protocol is not designed or implemented yet. It needs attempt scoping, duplicate/late-message handling, and agreement so one phone cannot score a shot while the other replays. Keep this separate from ordinary off-target or pitch misses. Finalize and approve this policy before implementation; do not silently invent a local-only retry.

If players change position, recapture. Ordinary hand displacement during drawing remains possible even with stationary feet. [INFERENCE] A forgiving angular cone may accommodate it, but validate at the shortest intended duel separation.

## Cutover scope

Replace duel GPS/compass tracking and the obsolete aimPosition exchange, migrating callers, wire validation, tests, diagnostics, and instructions. Preserve map location, discovery, pairing, peer clock synchronization, and other consumers of location permissions.

Record reference/current orientation or aim vectors, horizontal error, sample age, tracking validity, and calibration generation in appropriately versioned analytics. Preserve historical analytics interpretation rather than relabeling old GPS fields. The research also identified stale privacy copy: current shot analytics include precise coordinate snapshots despite peer-only wording; align future
wording with actual collection.

No camera, UWB, BLE-ranging, Wi-Fi-ranging infrastructure, or moving-opponent tracking is needed for this stationary rule.

## Acceptance evidence

- Repeat capture → lower → countdown → draw toward the same target on Android and iOS, including rolled grips and intended separation extremes.
- Deliberate left/right aiming is judged consistently at and around the chosen cone boundary; intended headshot elevation is not rejected by the horizontal check.
- Rotation around the top-edge axis does not alone change horizontal aim.
- GPS denial or absence and magnetic-heading callback silence no longer veto duel shots.
- Stale motion, degenerate projection, backgrounding, and sensor reset do not produce hits from invalid references.
- A new round/rematch captures a fresh reference; interrupted rounds replay consistently on both peers without duplicate scores.
- Measure drift and sensor/input latency through real round durations. Unit checks of vector math do not replace physical-device proof.

## Implementation status

No gameplay changes were made. Prior research exercised seven synthetic-input scenarios against the existing GPS/compass implementation; those results do not validate this replacement. The next agent should resolve the native orientation/frame and synchronized replay design, obtain implementation approval, then implement and verify the complete cutover.
