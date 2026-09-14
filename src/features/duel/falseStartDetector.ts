import { FALSE_START_SPEC, type FalseStartSpec } from "./gestureSpec";
import {
  accelerationMagnitudeG,
  type AccelerationSample
} from "./raiseGestureDetector";

export interface FalseStartDetection {
  atMs: number;
  movementDeltaG: number;
}

export class FalseStartDetector {
  private armed = false;
  private detection: FalseStartDetection | null = null;
  private fireAtMs: number | null = null;

  constructor(
    private readonly spec: Readonly<FalseStartSpec> = FALSE_START_SPEC
  ) {}

  arm(): void {
    this.armed = true;
    this.detection = null;
    this.fireAtMs = null;
  }

  markFire(atMs: number): void {
    this.fireAtMs = atMs;
    this.armed = false;
  }

  process(sample: AccelerationSample): FalseStartDetection | null {
    if (
      !this.armed ||
      this.detection ||
      (this.fireAtMs !== null && sample.atMs >= this.fireAtMs)
    ) {
      return null;
    }

    const magnitudeG = accelerationMagnitudeG(sample);
    const movementDeltaG = Math.abs(magnitudeG - this.spec.restingMagnitudeG);

    if (
      !Number.isFinite(movementDeltaG) ||
      movementDeltaG < this.spec.movementDeltaThresholdG
    ) {
      return null;
    }

    this.detection = { atMs: sample.atMs, movementDeltaG };
    this.armed = false;
    return this.detection;
  }

  reset(): void {
    this.armed = false;
    this.detection = null;
    this.fireAtMs = null;
  }
}
