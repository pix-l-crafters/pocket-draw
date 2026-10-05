import { RAISE_GESTURE_SPEC, type RaiseGestureSpec } from "./gestureSpec";

export interface AccelerationSample {
  atMs: number;
  x: number;
  y: number;
  z: number;
}

export interface RaiseDetection {
  atMs: number;
  magnitudeG: number;
}

export function accelerationMagnitudeG(
  sample: Pick<AccelerationSample, "x" | "y" | "z">
): number {
  return Math.hypot(sample.x, sample.y, sample.z);
}

/** Pure detector so gesture behavior can be tested without native sensors. */
export class RaiseGestureDetector {
  private lastDetectionAtMs = Number.NEGATIVE_INFINITY;
  private thresholdCrossedAtMs: number | null = null;

  constructor(
    private readonly spec: Readonly<RaiseGestureSpec> = RAISE_GESTURE_SPEC
  ) {}

  process(sample: AccelerationSample): RaiseDetection | null {
    const magnitudeG = accelerationMagnitudeG(sample);

    if (!Number.isFinite(magnitudeG) || !Number.isFinite(sample.atMs)) {
      this.thresholdCrossedAtMs = null;
      return null;
    }

    if (magnitudeG < this.spec.accelerationThresholdG) {
      this.thresholdCrossedAtMs = null;
      return null;
    }

    if (sample.atMs - this.lastDetectionAtMs < this.spec.debounceMs) {
      return null;
    }

    if (this.thresholdCrossedAtMs === null) {
      this.thresholdCrossedAtMs = sample.atMs;
      return null;
    }

    if (sample.atMs - this.thresholdCrossedAtMs < this.spec.minimumDurationMs) {
      return null;
    }

    const detection = { atMs: sample.atMs, magnitudeG };
    this.lastDetectionAtMs = sample.atMs;
    this.thresholdCrossedAtMs = null;
    return detection;
  }

  reset(): void {
    this.lastDetectionAtMs = Number.NEGATIVE_INFINITY;
    this.thresholdCrossedAtMs = null;
  }
}
