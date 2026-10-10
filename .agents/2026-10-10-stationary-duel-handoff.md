# Handoff: stationary duel relative aiming

Date: 2026-10-10. Prompt author: MRDGH2821. Prepared by GPT-6 Astra via omp.

## Start here

Read the [stationary-duel recommendation](../docs/research/2026-10-10-stationary-duel-recommendation.md) for the proposed behavior and acceptance criteria. Read the [cited positioning research](../docs/research/2026-10-10-gps-duel-positioning.md) when you need current-code evidence or native API sources.

User requirements and authorization:

- Players conduct **strictly stationary duels**.
- The original problem: players repeatedly miss and suspect incorrect opponent positioning.
- The user asked how a stationary solution would look, then requested a saved recommendation and handoff.
- Only investigation/documentation has been authorized here. No replacement has been implemented; obtain approval before implementation. The recommendation is not an accepted ADR or finalized protocol spec.

## Known current behavior

Investigation snapshot: `13b9b34c842c9698818b0b2bf114baee60d984fd`. Recheck current files before editing; subsequent work may have changed them.

- Separation is manually confirmed before calibration. Current pose order is shoulder then ready; some instructions are stale.
- Calibration records DeviceMotion beta pitch endpoints, not opponent direction. It stops its monitor; PreRound creates another.
- PreRound starts GPS/compass tracking. Valid pitch shots require compass category 3, compass callback age ≤2 s, and both GPS fixes ≤5 s old.
- Geometry bypasses bearing when separation ≤sum of accuracy radii, but tracking validity checks run first. Outside that overlap, heading must be within ±30°.
- Pre-round warnings omit headingStale; firing rejects it. Android Expo Location 19.0.8 emits headings only after about 2° of azimuth change, not on a heartbeat.
- Existing analytics already contain pitch, tracking issues, heading age, both coordinate snapshots, bearing/error, and uncertainty bypass. Precise coordinates are persisted despite outdated peer-only instructions.

These are source-backed findings, not proof of the sensor values in the reported playtest. No production analytics was accessed.

## Implementation entry points

Paths are relative to the repository root; inspect references and callers before changing exported contracts.

| Area                                                        | Start here                                                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Setup, calibration ownership, keyed round mounts, rematches | `src/features/duel/DuelScreen.tsx`                                                               |
| Shoulder/ready capture and monitor stop                     | `src/features/duel/DrawCalibrationScreen.tsx`                                                    |
| Pose acceptance and hold detection                          | `src/features/duel/calibrationPose.ts`                                                           |
| Motion sampling and freshness                               | `src/features/duel/pitchMonitor.ts`                                                              |
| Fire pipeline and readiness                                 | `src/features/duel/PreRound.tsx`                                                                 |
| GPS/compass checks and peer aimPosition exchange            | `src/features/duel/useAimTracking.ts`                                                            |
| Existing geographic aim and pitch classifiers               | `src/features/duel/aimBearing.ts`, `src/features/duel/pitchZoneClassifier.ts`                    |
| Round outcomes and peer transport contract                  | `src/features/duel/roundShots.ts`, `src/contracts/duelChannel.ts`                                |
| Analytics contracts and persistence                         | `src/contracts/matchAnalytics.ts`, `src/features/backend/matchAnalytics.ts`, `docs/analytics.md` |
| User-facing instructions                                    | `src/features/duel/GameInstructionsScreen.tsx`                                                   |

The project uses Expo SDK 54; lockfile resolves expo-location 19.0.8 and expo-sensors 15.0.8. Inspect `package.json`, `mise.toml`, and existing native modules before choosing commands or introducing dependencies.

## Next actions, in order

1. **Resolve sensor/frame feasibility.** Inspect locked Expo native motion sources and existing native-module patterns. Determine whether continuous relative attitude with the required frame can be supplied on both platforms without a new bridge. Document the physical +Y top-edge transform, handedness, gravity plane, and restart behavior. Completion: an explicit source-backed frame/lifetime
   contract, not merely a promise to subtract yaw angles.
2. **Finalize the behavior design for approval.** Use the recommendation as the source of truth. Resolve per-round recentering versus reusable pitch endpoints, the near-vertical projection case, and synchronized tracking-failure replay. Completion: both peers' attempt state and failure outcomes are unambiguous, and the user approves implementation.
3. **Implement a clean cutover after approval.** Reuse existing code where suitable; retain timing, pitch zones, pairing and map behavior. Migrate all duel callers, wire validation and diagnostics; remove obsolete GPS aiming paths. Scope any protocol compatibility requirements explicitly so mixed app versions do not silently disagree.
4. **Verify consumer-visible behavior.** Exercise vector boundaries, wraparound, rolled grips, reference invalidation, round/rematch recentering, and two-peer replay agreement. Run existing relevant checks and an actual runtime smoke. Complete the physical Android/iOS sequence in the recommendation; explicitly report unavailable hardware rather than substituting mocks for device evidence.
5. **Update affected documentation and work log.** Align instructions, analytics schema/version documentation and changelog with the shipped behavior. Preserve old analytics semantics. Do not claim device accuracy or a solved playtest without measured evidence.

## Evidence already obtained

A removed temporary Node 24.21.0 VM harness executed unmodified aimBearing.ts, pitchZoneClassifier.ts and useAimTracking.ts with synthetic sensor events and minimal hook lifecycle. Seven scenario assertions passed:

- Close-range uncertainty overlap preserves a bodyshot even facing 180° away.
- A displaced position estimate outside the overlap produces offTarget.
- Fresh valid close-range readings preserve bodyshot.
- Compass callback age 2,001 ms produces compassUnavailable despite no pre-round warning.
- Compass category 2 produces compassUnavailable.
- Position age 5,001 ms produces locationUnavailable.
- Pitch F=0.79 retains tooLow despite bad tracking.

The research report records inputs and outputs. This was a probe of the old implementation, not new permanent tests, native-device reproduction, or proof that the recommendation works. No build/test-suite pass is claimed for the replacement.

## Deliverables from this session

- `docs/research/2026-10-10-gps-duel-positioning.md`: primary-source investigation and current-code evidence.
- `docs/research/2026-10-10-stationary-duel-recommendation.md`: proposed stationary aiming model.
- This handoff and entries in `.agents/logs/2026-10-10.md`.

No application changes, permanent test additions, commits, or pushes were made by this investigation. Preserve unrelated working-tree changes when resuming.
