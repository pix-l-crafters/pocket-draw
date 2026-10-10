import { DeviceMotion } from "expo-sensors";

const SENSOR_UPDATE_INTERVAL_MS = 20;
const MAX_SAMPLE_AGE_MS = 2_000;

export type PitchMonitorStartResult =
  | "started"
  | "permissionDenied"
  | "unavailable"
  | "error"
  | "cancelled";

export interface PitchCalibration {
  thetaReady: number;
  thetaShoulder: number;
}

/**
 * Wraps expo-sensors' DeviceMotion to expose the latest fused pitch angle
 * (rotation.beta) on demand, for sampling at specific moments — calibration
 * poses, fire time — rather than reacting to every update.
 */
export class PitchMonitor {
  private subscription: { remove(): void } | null = null;
  private latestTheta: number | null = null;
  private latestAtMs: number | null = null;
  private generation = 0;
  private starting: Promise<PitchMonitorStartResult> | null = null;

  constructor(private readonly onPitch?: (theta: number | null) => void) {}

  start(): Promise<PitchMonitorStartResult> {
    if (this.subscription) {
      return Promise.resolve("started");
    }
    if (this.starting) {
      return this.starting;
    }

    const attempt = this.startSensor(++this.generation).finally(() => {
      if (this.starting === attempt) this.starting = null;
    });
    this.starting = attempt;
    return attempt;
  }

  private async startSensor(
    generation: number
  ): Promise<PitchMonitorStartResult> {
    try {
      const available = await DeviceMotion.isAvailableAsync();
      if (generation !== this.generation) return "cancelled";
      if (!available) return "unavailable";

      let permission = await DeviceMotion.getPermissionsAsync();
      if (generation !== this.generation) return "cancelled";
      if (!permission.granted && permission.canAskAgain) {
        permission = await DeviceMotion.requestPermissionsAsync();
        if (generation !== this.generation) return "cancelled";
      }
      if (!permission.granted) return "permissionDenied";

      DeviceMotion.setUpdateInterval(SENSOR_UPDATE_INTERVAL_MS);
      const subscription = DeviceMotion.addListener(({ rotation }) => {
        if (generation !== this.generation) return;
        const theta = rotation?.beta;
        this.latestTheta =
          typeof theta === "number" && Number.isFinite(theta) ? theta : null;
        this.latestAtMs = this.latestTheta === null ? null : Date.now();
        this.onPitch?.(this.latestTheta);
      });
      if (generation !== this.generation) {
        subscription.remove();
        return "cancelled";
      }
      this.subscription = subscription;
      return "started";
    } catch {
      return generation === this.generation ? "error" : "cancelled";
    }
  }

  currentTheta(): number | null {
    if (this.latestAtMs === null) return null;
    const ageMs = Date.now() - this.latestAtMs;
    return ageMs >= 0 && ageMs <= MAX_SAMPLE_AGE_MS ? this.latestTheta : null;
  }

  stop(): void {
    this.generation += 1;
    this.starting = null;
    this.subscription?.remove();
    this.subscription = null;
    this.latestTheta = null;
    this.latestAtMs = null;
  }
}
