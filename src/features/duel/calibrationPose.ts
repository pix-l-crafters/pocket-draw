import { Platform } from "react-native";

/** Keep calibration's ready check identical to the pre-round ready check. */
export function isTopEdgeDown(
  x: number,
  y: number,
  z: number,
  os = Platform.OS
): boolean {
  const topEdgePointsDown =
    (os === "ios" && y > 0.75) || (os === "android" && y < -0.75);
  return topEdgePointsDown && Math.abs(x) < 0.35 && Math.abs(z) < 0.35;
}

/** The level-phone tilt used for the top-edge-forward shoulder pose. */
export function isTopEdgeForward(x: number, y: number, z: number): boolean {
  return Math.abs(x) < 0.35 && Math.abs(y) < 0.35 && Math.abs(z) > 0.75;
}

const HOLD_MS = 2_000;
const MAX_SAMPLE_GAP_MS = 500;
const MAX_PITCH_DRIFT_RAD = 0.12;

export class PoseHold {
  private sinceMs: number | null = null;
  private lastMs: number | null = null;
  private anchorTheta: number | null = null;

  sample(valid: boolean, theta: number | null, atMs: number): boolean {
    if (!valid || theta === null || !Number.isFinite(theta)) {
      this.reset();
      return false;
    }
    if (
      this.sinceMs === null ||
      this.lastMs === null ||
      atMs - this.lastMs > MAX_SAMPLE_GAP_MS ||
      atMs < this.lastMs ||
      this.anchorTheta === null ||
      Math.abs(theta - this.anchorTheta) > MAX_PITCH_DRIFT_RAD
    ) {
      this.sinceMs = atMs;
      this.anchorTheta = theta;
    }
    this.lastMs = atMs;
    return atMs - this.sinceMs >= HOLD_MS;
  }

  reset(): void {
    this.sinceMs = null;
    this.lastMs = null;
    this.anchorTheta = null;
  }
}
