# Fire Mechanic & Scoring (Gameplay v2)

Covers roadmap items 3–6 (`docs/product-design/Roadmap.md`, Phase 1): the fire-trigger rebuild and the round-judge rewrite needed to match `Gameplay-v2.md`, now the canonical gameplay spec. Written as its own spec because independent implementers would otherwise have to re-derive several non-obvious decisions already made — and could plausibly land on different, conflicting answers.

## Why this exists

The original implementation matched Gameplay v1: automatic raise firing and reaction-only scoring. The current #81 implementation supplies manual fire, both players' calibrated pitch zones, actual reaction timing over `DuelChannel`, and enriched false-start outcomes. #50 adds a real compass-versus-live-GPS aim gate to that same fire path.

Bodyshot scores 1 point, headshot 2, and miss 0; reaction timing determines whose shot is eligible, as described below. Implementation supplied is not final-phone validation.

## Round scoring logic

Order both players' shots by reaction time.

- **Outside the tie window:** classify the **faster** shot's landing zone. If it's a hit (bodyshot or headshot), that player scores those points and the other scores 0 — round over. If the faster shot is a miss, classify the **slower** player's shot the same way; if valid, they score instead. If both are misses, the round is 0-0.
- **Within `TIE_WINDOW_MS` (100 ms)** (a near-simultaneous fire): classify **both** shots independently — each player gets their own zone score (0/1/2) regardless of the other's timing. Whoever scores higher wins the round. If both score the same (including a double-miss), the round is a tie and both players get their (equal) points.

This resolves the earlier open question about how the tie window interacts with the fallthrough rule: outside the window, only the faster shot's accuracy is ever eligible to decide the round on its own; inside it, both shots' accuracy is compared directly.

Round results explain equal scoring: two misses mean 0 points each, even with
a large reaction-time gap; equal bodyshots or headshots within 100 ms mean
1 or 2 points each. A tied round does not itself trigger sudden death.
The match summary preserves each tie's reason and both ordered reaction times,
and distinguishes a final draw as equal total points after the tiebreaker.
For two-phone reports, record both reaction times, both shot zones, and whether
the tie appeared on the round result or the final match summary.

`falseStart` remains a timing violation and its own enriched `RoundOutcome` kind. Early countdown tap, volume input, or movement disqualifies the offender. The countdown still reaches the normal FIRE cue; the non-offender can fire and receives their actual calibrated, aim-gated zone score (0/1/2), with shot timing retained. There is no flat bonus. Inputs outside countdown/FIRE are ignored.

Reaction time is still captured for every shot regardless of outcome — it gates who's evaluated first above, and separately feeds the leaderboard's average-reaction-time stat (Phase 4, item 26).

### Match-level tally: sum of points, not count of rounds won

`Gameplay-v2.md` carries forward v1's "the winner is determined by the highest score" — under v1 every round win was worth exactly 1 point, so that phrase was equivalent to "most rounds won."
v2's differentiated zone scoring (1 or 2 points) breaks that equivalence, so this had to be decided explicitly: **the match winner (and whether the tiebreaker round triggers) is the sum of each player's round points across the match, not a count of rounds won.**

`roundLoop.ts` accumulates each round's actual zone points (0/1/2), including independent tie-window scores and the non-offender's false-start shot. `matchWinnerId`/`isMatchDecided` compare summed points, not round-win counts.

## Zone classification — the feasibility question

**Ruled out: literal position/height tracking.** Double-integrating accelerometer data to get a position in centimeters is a well-documented dead end — integration of both a constant bias and of noise makes it "highly sensitive to bias noise," and error grows unbounded over time. This is not usable for a multi-second duel round.

**What actually works: pitch angle via sensor fusion.** The game doesn't need literal height — it needs "how far through the raise motion is the phone right now," which is an _orientation_ problem, not a _position_ problem.
`expo-sensors`' `DeviceMotion.rotation` is fused from accelerometer + gyroscope (+ magnetometer) by the OS itself (CoreMotion on iOS, the rotation-vector sensor on Android) — already an installed dependency, no new native module needed.
Gyroscope-only integration drifts, but the accelerometer/magnetometer continuously re-anchors the fused angle to true gravity/heading, so it stays stable over a duel round's timescale in a way raw double-integrated position never does.

### Calibration (extends `DrawCalibrationScreen.tsx`)

Both players explicitly capture two fresh pitch poses before entering PreRound:

- Start calibration, then **Capture ready pose** with the arm down (`θ_ready`).
- Raise to shoulder height, then **Capture shoulder pose** (`θ_shoulder`).
- Continue after a valid calibrated arc is captured. Denied/unavailable motion exposes recovery, including retry and Settings/foreground recheck.

Calibration is retained for the accepted duel and reused by its rematches. Peer readiness is emitted only after the calibrated local ready ritual. Instructions disclose sensor use and peer-only precise location before “I'm Ready” mounts calibration/tracking.
Instructions are scrollable so all disclosures and “I'm Ready” remain reachable.
Calibration retains an Exit action through the existing duel leave path, including
when motion is denied or unavailable. The unused accelerometer calibration
producer is removed as part of the clean pitch cutover.

### At fire time

Read the current pitch `θ_fire` and normalize it into a fraction of the calibrated arc:

```text
f = (θ_fire − θ_ready) / (θ_shoulder − θ_ready)
```

- `f` near 0 → still close to "ready," barely raised → miss
- `f` near 1 → at the calibrated shoulder pose → bodyshot territory
- `f > 1` → raised beyond the calibrated shoulder angle → headshot territory

Current fixed thresholds are bodyshot for `f ∈ [0.8, 1.0]`, headshot for `f ∈ (1.0, 1.2]`, and miss otherwise. At fire time, sample the calibrated pitch zone first, then apply the aim gate below: failed aim overrides even a pitch hit to miss. Unavailable/stale pitch does not default to a bodyshot.

### Known approximation — disclose this, don't hide it

`Gameplay-v2.md` defines the headshot zone in centimeters ("+15cm above shoulder height"), but arm rotation means the same 15cm maps to a _different_ angle depending on arm length (arc length = radius × angle — a shorter arm needs a larger angle for the same linear distance).
Without measuring arm length, using one fixed `δ` for every player is a deliberate simplification: fair in that both players get identical treatment, but not a literal centimeter match to the doc's wording.

Threshold tuning remains a hardware-playtesting task; the fixed angular band is not a measured centimeter boundary.

## Fire trigger (per platform)

- **Android:** volume-button key interception (`KEYCODE_VOLUME_UP/DOWN`) in a small native module. During countdown both buttons detect false starts; during FIRE they route to the shared shot handler.
- **iOS, selected compromise:** during countdown/FIRE while the app is active, observe `AVAudioSession.outputVolume` via KVO and infer direction from value changes. Apple documents the volume value, not button events.
  Volume changes and other adjustments may trigger input, and endpoint presses produce no change. This is approximate, not Android interception.
  App Review acceptance for using it as game input is not guaranteed; guideline 2.5.1 requires intended API use. [Apple `outputVolume`](https://developer.apple.com/documentation/avfaudio/avaudiosession/outputvolume), [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/#software-requirements).
- **Both platforms:** retain the full-screen tap-to-fire control as an independent, reliable fallback.
- Do not use `AVCaptureEventInteraction` for this non-camera duel: Apple limits it to active camera-capture use cases. The hardware-button API is not a general game-input mechanism. [Apple `AVCaptureEventInteraction`](https://developer.apple.com/documentation/avkit/avcaptureeventinteraction).
- Action Button via a user-assigned Shortcut remains hardware-limited and would need device testing to confirm fast in-scene delivery.
- The side/power button has no public iOS interception API.

## Files touched

- `src/features/duel/pitchMonitor.ts` — fused pitch tracking and calibrated `f` calculation replace the unused accelerometer calibration producer
- `src/features/duel/DrawCalibrationScreen.tsx` — capture `θ_ready`/`θ_shoulder`
- `src/contracts/roundOutcome.ts` — carries zone/points per player, including enriched `falseStart` with the non-offender's actual shot
- `src/features/duel/roundJudge.ts` — implement the fallthrough/independent-scoring logic above
- `src/features/duel/roundLoop.ts` — `tallyOutcome`/`matchWinnerId`/`isMatchDecided` switch from counting round wins to summing round points (see "Match-level tally" above); this is also where item 7's strict 3+1-tiebreaker rewrite lands
- `src/features/duel/DuelScreen.tsx` — wire in the platform-specific fire trigger
- Native volume input, live pitch/aim tracking, and `DuelChannel` shot/location contracts

## Testing

- Unit-testable without a device: the `f`-to-zone classification function, and `roundJudge.ts`'s fallthrough logic (pure functions, same pattern as the existing `roundJudge.test`-style coverage).
- Needs real hardware: pitch-angle stability/noise over an actual raise motion, and fire-trigger latency on both platforms — not mockable, add to the existing prod-readiness device QA pass (Phase 4, item 28).

## Live aim gate (#50 integrated with #81)

Compare a fresh true-north compass heading (accuracy level 3) with the geographic
bearing to the accepted opponent's precise foreground GPS. The inclusive aim cone
is adjustable in `AIM_TOLERANCE_DEGREES`, currently ±30°. Heading expires after
2 seconds; GPS expires after 5 seconds. Unavailable, inaccurate, or stale readings
fail closed to miss, as do positions whose separation does not exceed their
combined GPS uncertainty radius. Facing away therefore misses regardless of pitch.

Public map presence is rounded to about 110 m and removed on map exit: it does
**not** supply a usable close-range opponent bearing. Precise
latitude/longitude/accuracy is intentionally exchanged only with the accepted
peer over `DuelChannel` (`aimPosition`), never written as precise GPS to Firestore.
Public-location privacy is unchanged. `sampleAtMs` carries the actual sender GPS
fix timestamp and stays unchanged when the same fix is sent again. The existing
`ClockOffsetCalibrator` supplies peer clock minus local clock, so the receiver uses
`localFixTime = sampleAtMs - clockOffsetMs`. Store the peer timestamp unchanged
and apply the latest offset at capture, even if calibration completed after receipt.
GPS freshness includes network flight delay: a fix aged 4,500 ms at send and
delivered 750 ms later is 5,250 ms old and must miss under the unchanged 5-second
limit. Repeated sends do not renew the fix; the 2-second heading limit is unchanged.

`raised.zone` is required and carries the final calibrated, aim-gated zone with actual reaction timing. There is no missing-zone/bodyshot fallback. Both clients feed those actual shots into the existing judge, 100 ms tie window, faster-miss fallthrough, false-start handling, and 3-round-plus-one-tiebreak point tally.

## Final Android+iOS QA — issue #54

This checklist has **not been executed on the final phones here**. Record both device models, OS/build, test method, and measured results; source/tests are not hardware evidence.

- Check precise GPS uncertainty and freshness, true-north heading accuracy/stability, and the ±30° cone at known facing directions. Face away and verify a miss on both phones; stale/unavailable heading/GPS and overlapping uncertainty must not become hits.
- Capture ready then shoulder on both phones; tune the fixed pitch thresholds against measured body/head/miss poses. Exercise motion/location denial, unavailable sensors, retry, Settings, and foreground permission recovery.
- On both phones, exercise tap and volume input, bodyshot/headshot/miss, faster-miss fallthrough, early tap/volume/movement, and the non-offender's scored FIRE shot.
- Exercise the 100 ms tie window and full three-round matches, including the single tiebreaker and draw. Confirm both clients agree on zones, timing, points, false-start offender, and final result; rematches reuse calibration.
- Measure two-phone cue/fire timing and sensor/input latency; record observations rather than assuming the suggested 20 ms cue target is met.
