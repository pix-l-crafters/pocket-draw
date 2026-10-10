import { DeviceMotion, type DeviceMotionMeasurement } from "expo-sensors";

import type {
  AnalyticsCalibration,
  MotionSnapshot
} from "../../contracts/matchAnalytics";

const SENSOR_UPDATE_INTERVAL_MS = 20;
const MAX_SAMPLE_AGE_MS = 2_000;

export type PitchMonitorStartResult =
  | "started"
  | "permissionDenied"
  | "unavailable"
  | "error"
  | "cancelled";

export type PitchCalibration = AnalyticsCalibration;

function finite(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function rotation(
  value: DeviceMotionMeasurement["rotation"] | null | undefined
) {
  return value
    ? {
        alpha: finite(value.alpha),
        beta: finite(value.beta),
        gamma: finite(value.gamma),
        timestamp: finite(value.timestamp)
      }
    : null;
}

function vector(value: DeviceMotionMeasurement["acceleration"] | undefined) {
  return value
    ? {
        x: finite(value.x),
        y: finite(value.y),
        z: finite(value.z),
        timestamp: finite(value.timestamp)
      }
    : null;
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
  private latestMotion: MotionSnapshot | null = null;
  private generation = 0;
  private starting: Promise<PitchMonitorStartResult> | null = null;

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
      const subscription = DeviceMotion.addListener((reading) => {
        if (generation !== this.generation) return;
        const theta = reading.rotation?.beta;
        this.latestTheta =
          typeof theta === "number" && Number.isFinite(theta) ? theta : null;
        this.latestAtMs = this.latestTheta === null ? null : Date.now();
        this.latestMotion = {
          receivedAtMs: Date.now(),
          ageMs: 0,
          rotation: rotation(reading.rotation),
          rotationRate: rotation(reading.rotationRate),
          acceleration: vector(reading.acceleration),
          accelerationIncludingGravity: vector(
            reading.accelerationIncludingGravity
          ),
          interval: finite(reading.interval),
          orientation: finite(reading.orientation)
        };
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

  currentTheta(maxAgeMs = MAX_SAMPLE_AGE_MS): number | null {
    if (this.latestAtMs === null) return null;
    const ageMs = Date.now() - this.latestAtMs;
    return ageMs >= 0 && ageMs <= maxAgeMs ? this.latestTheta : null;
  }

  /**
   * Retain stale readings for diagnostics without making them valid for
   * scoring.
   */
  snapshot(): MotionSnapshot | null {
    return this.latestMotion
      ? {
          ...this.latestMotion,
          ageMs: Date.now() - this.latestMotion.receivedAtMs
        }
      : null;
  }

  stop(): void {
    this.generation += 1;
    this.starting = null;
    this.subscription?.remove();
    this.subscription = null;
    this.latestTheta = null;
    this.latestAtMs = null;
    this.latestMotion = null;
  }
}
