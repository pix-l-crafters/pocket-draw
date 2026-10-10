import { Platform } from "react-native";

export const TOP_EDGE_DOWN_Y_G = 0.75;
export const POSE_AXIS_TOLERANCE_G = 0.35;

/** Keep calibration's ready check identical to the pre-round ready check. */
export function isTopEdgeDown(
  x: number,
  y: number,
  z: number,
  os = Platform.OS
): boolean {
  const topEdgePointsDown =
    (os === "ios" && y > TOP_EDGE_DOWN_Y_G) ||
    (os === "android" && y < -TOP_EDGE_DOWN_Y_G);
  return (
    topEdgePointsDown &&
    Math.abs(x) < POSE_AXIS_TOLERANCE_G &&
    Math.abs(z) < POSE_AXIS_TOLERANCE_G
  );
}

/** The top edge is level, regardless of phone roll. */
export function isTopEdgeForward(_x: number, y: number, _z: number): boolean {
  return Math.abs(y) < POSE_AXIS_TOLERANCE_G;
}

export const HOLD_MS = 2_000;
export const MAX_SAMPLE_GAP_MS = 500;
export const MAX_PITCH_DRIFT_RAD = 0.12;

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
