# Fire Mechanic & Scoring (Gameplay v2)

Covers roadmap items 3–6 (`docs/product-design/Roadmap.md`, Phase 1): the fire-trigger rebuild and the round-judge rewrite needed to match `Gameplay-v2.md`, now the canonical gameplay spec. Written as its own spec because independent implementers would otherwise have to re-derive several non-obvious decisions already made — and could plausibly land on different, conflicting answers.

## Why this exists

The current implementation matches Gameplay v1, not v2:

- `raiseGestureDetector.ts` auto-fires purely from accelerometer magnitude crossing a threshold (v1: "auto shoots when phone reaches shoulder position").
- `roundJudge.ts`/`RoundOutcome` only supports `"win" | "tie" | "falseStart"` — reaction time decides everything, no headshot/bodyshot scoring exists.

v2 requires a manual fire trigger and height-zone-based scoring: bodyshot (1pt), headshot (2pt), miss (0pt), with reaction time still gating who's eligible to score.

## Round scoring logic

Order both players' shots by reaction time.

- **Outside the tie window:** classify the **faster** shot's landing zone. If it's a hit (bodyshot or headshot), that player scores those points and the other scores 0 — round over. If the faster shot is a miss, classify the **slower** player's shot the same way; if valid, they score instead. If both are misses, the round is 0-0.
- **Within `TIE_WINDOW_MS`** (a near-simultaneous fire): classify **both** shots independently — each player gets their own zone score (0/1/2) regardless of the other's timing. Whoever scores higher wins the round. If both score the same (including a double-miss), the round is a tie and both players get their (equal) points.

This resolves the earlier open question about how the tie window interacts with the fallthrough rule: outside the window, only the faster shot's accuracy is ever eligible to decide the round on its own; inside it, both shots' accuracy is compared directly.

`falseStart` is untouched by any of this — it's a timing violation (firing before the buzz), orthogonal to where a shot lands, and stays its own `RoundOutcome` kind rather than being folded into the zone system.

Reaction time is still captured for every shot regardless of outcome — it gates who's evaluated first above, and separately feeds the leaderboard's average-reaction-time stat (Phase 4, item 26).

### Match-level tally: sum of points, not count of rounds won

`Gameplay-v2.md` carries forward v1's "the winner is determined by the highest score" — under v1 every round win was worth exactly 1 point, so that phrase was equivalent to "most rounds won."
v2's differentiated zone scoring (1 or 2 points) breaks that equivalence, so this had to be decided explicitly: **the match winner (and whether the tiebreaker round triggers) is the sum of each player's round points across the match, not a count of rounds won.**

This changes `roundLoop.ts`'s `tallyOutcome`: today it accumulates a flat `+= 1` on a win and `+= pointsEach` on a tie, which happened to be the same number under v1's scoring.
Under v2, the accumulator needs to add each round's actual zone point value (0/1/2) for whichever player(s) scored, including on the new independent-both-score tie case above.
`matchWinnerId`/`isMatchDecided` then compare summed points, not round-win counts.

## Zone classification — the feasibility question

**Ruled out: literal position/height tracking.** Double-integrating accelerometer data to get a position in centimeters is a well-documented dead end — integration of both a constant bias and of noise makes it "highly sensitive to bias noise," and error grows unbounded over time. This is not usable for a multi-second duel round.

**What actually works: pitch angle via sensor fusion.** The game doesn't need literal height — it needs "how far through the raise motion is the phone right now," which is an _orientation_ problem, not a _position_ problem.
`expo-sensors`' `DeviceMotion.rotation` is fused from accelerometer + gyroscope (+ magnetometer) by the OS itself (CoreMotion on iOS, the rotation-vector sensor on Android) — already an installed dependency, no new native module needed.
Gyroscope-only integration drifts, but the accelerometer/magnetometer continuously re-anchors the fused angle to true gravity/heading, so it stays stable over a duel round's timescale in a way raw double-integrated position never does.

### Calibration (extends `DrawCalibrationScreen.tsx`)

The existing calibration step already captures two poses. Add one pitch-angle reading at each:

- At the "ready" pose (arm down): record `θ_ready` from `DeviceMotion.rotation`.
- At the "shoulder" pose (arm raised): record `θ_shoulder`.

This produces a per-player calibrated arc, the same personalization principle the existing raise-gesture threshold already uses.

### At fire time

Read the current pitch `θ_fire` and normalize it into a fraction of the calibrated arc:

```text
f = (θ_fire − θ_ready) / (θ_shoulder − θ_ready)
```

- `f` near 0 → still close to "ready," barely raised → miss
- `f` near 1 → at the calibrated shoulder pose → bodyshot territory
- `f > 1` → raised beyond the calibrated shoulder angle → headshot territory

Zone boundaries are fractional thresholds against `f`, tuned by playtesting — e.g. bodyshot for `f ∈ [0.8, 1.0]`, headshot for `f ∈ (1.0, 1.0+δ]`, miss outside that range.

### Known approximation — disclose this, don't hide it

`Gameplay-v2.md` defines the headshot zone in centimeters ("+15cm above shoulder height"), but arm rotation means the same 15cm maps to a _different_ angle depending on arm length (arc length = radius × angle — a shorter arm needs a larger angle for the same linear distance).
Without measuring arm length, using one fixed `δ` for every player is a deliberate simplification: fair in that both players get identical treatment, but not a literal centimeter match to the doc's wording.

**Stretch refinement, not required for v1:** a one-time arm-length estimate during calibration. A _short_ (~0.3s) double integration over just the raise motion accumulates far less drift than continuous tracking would, so it's plausibly feasible where continuous position tracking is not — untested, flag as a follow-up if the fixed-`δ` approximation proves unsatisfying in playtesting.

## Fire trigger (per platform)

- **Android:** volume-button key interception (`KEYCODE_VOLUME_UP/DOWN`), e.g. via `react-native-volume-manager` or a small custom native module. This project already runs `expo-dev-client`, so a native module is nothing new. Reliable, no caveats.
- **iOS, default:** on-screen tap-to-fire button. No API-misuse risk, no camera overhead, works on every device.
- **iOS, documented alternatives** (pick one only if you want a different tradeoff than the default):
  - `AVCaptureEventInteraction` for a native volume-button feel — Apple's only sanctioned API for this, but scoped to apps actively using the camera; a non-camera app risks its capture session being terminated, and would need an active (if hidden) camera session just to unlock the events.
  - The unofficial `AVAudioSession.outputVolume`-observation hack — works without a camera session, but is fragile: volume needs resetting between rounds, detection can be missed at min/max volume, and the system volume HUD flashes unless suppressed.
  - Action Button (iPhone 15 Pro and later only) via a user-assigned Shortcut — hardware-limited, requires manual per-player Settings setup, and whether it delivers a fast in-scene event to an already-foregrounded duel screen (vs. behaving like an app relaunch) isn't confirmed without device testing.
  - Ruled out entirely: the side/power button has no public API on iOS for any app to intercept.

## Files touched

- `src/features/duel/gestureSpec.ts` — add pitch-angle calibration constants alongside the existing acceleration-threshold spec
- `src/features/duel/raiseGestureDetector.ts` / new module for pitch-angle tracking and `f` calculation
- `src/features/duel/DrawCalibrationScreen.tsx` — capture `θ_ready`/`θ_shoulder`
- `src/contracts/roundOutcome.ts` — extend `RoundOutcome`'s `"win"` case (or add a new shape) to carry zone/points per player; `falseStart` stays unchanged
- `src/features/duel/roundJudge.ts` — implement the fallthrough/independent-scoring logic above
- `src/features/duel/roundLoop.ts` — `tallyOutcome`/`matchWinnerId`/`isMatchDecided` switch from counting round wins to summing round points (see "Match-level tally" above); this is also where item 7's strict 3+1-tiebreaker rewrite lands
- `src/features/duel/DuelScreen.tsx` — wire in the platform-specific fire trigger
- New: Android native module or library integration for volume-key interception; iOS on-screen fire button component

## Testing

- Unit-testable without a device: the `f`-to-zone classification function, and `roundJudge.ts`'s fallthrough logic (pure functions, same pattern as the existing `roundJudge.test`-style coverage).
- Needs real hardware: pitch-angle stability/noise over an actual raise motion, and fire-trigger latency on both platforms — not mockable, add to the existing prod-readiness device QA pass (Phase 4, item 28).

## Open questions

- Exact fractional thresholds for bodyshot/headshot zones and the `δ` headshot band — pick via playtesting, not fixed here.
- Whether the fixed-`δ` approximation is good enough, or whether the arm-length-estimate refinement becomes necessary.
- **"Pointing at the opponent" is never sensor-verified — open for discussion, not decided here.** `Gameplay-v2.md`'s Sensors section describes calibrating with "the phone's upper edge... point[ing] towards the opponent," implying horizontal aim/bearing matters.
  Neither the existing implementation nor this spec's zone classification checks bearing/yaw — only vertical pitch angle (ready→shoulder) is tracked. Two ways to resolve it:
  1. **Disclosed simplification (lower effort):** note in the spec that only raise height is measured, not aim direction — the same pattern already used for the fixed-`δ` headshot-zone approximation above. No new work.
  2. **Build a real bearing check (higher effort):** compare the phone's compass heading against the opponent's live GPS bearing (already available from the map feature's presence data) and require them to be roughly aligned at fire time.
     Real work with a real payoff — it would make "aim" mean something a player can actually fail at, not just "raise fast enough" — but it's never existed in this codebase (not even in the original v1 implementation) and is a meaningfully bigger scope addition than anything else in this spec.
