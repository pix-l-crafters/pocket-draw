// Gameplay v2 zone classification. Pitch angle (not literal position) is the
// feasible signal: expo-sensors' DeviceMotion.rotation is fused from
// accelerometer + gyroscope (+ magnetometer) by the OS, so it stays stable
// over a duel round's timescale in a way raw double-integrated position
// never does. See docs/superpowers/specs/2026-09-17-fire-mechanic-scoring-design.md
// ("Zone classification — the feasibility question") for the full analysis
// this relies on instead of re-deriving it in code.

import type { Zone } from "../../contracts/roundOutcome";

// ponytail: fractional thresholds are a placeholder pending playtesting
// (the spec explicitly leaves these open) — tune BODYSHOT_MIN_F/DELTA here.
const BODYSHOT_MIN_F = 0.8;
const BODYSHOT_MAX_F = 1.0;
const HEADSHOT_DELTA_F = 0.2;

/**
 * f = (θfire − θready) / (θshoulder − θready): how far through the
 * calibrated ready→shoulder raise arc the current pitch angle sits.
 */
export function computeRaiseFraction(
  thetaFire: number,
  thetaReady: number,
  thetaShoulder: number
): number {
  const arc = thetaShoulder - thetaReady;
  if (arc === 0) {
    throw new Error("Calibrated arc must have a non-zero range.");
  }
  return (thetaFire - thetaReady) / arc;
}

export function classifyZone(f: number): Zone {
  if (f >= BODYSHOT_MIN_F && f <= BODYSHOT_MAX_F) {
    return "bodyshot";
  }
  if (f > BODYSHOT_MAX_F && f <= BODYSHOT_MAX_F + HEADSHOT_DELTA_F) {
    return "headshot";
  }
  return "miss";
}
