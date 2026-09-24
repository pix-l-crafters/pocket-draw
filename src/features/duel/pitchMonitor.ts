import { DeviceMotion } from "expo-sensors";

import type { RaiseMonitorStartResult } from "./accelerometerRaiseMonitor";

const SENSOR_UPDATE_INTERVAL_MS = 20;

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

  async start(): Promise<RaiseMonitorStartResult> {
    if (this.subscription) {
      return "started";
    }

    if (!(await DeviceMotion.isAvailableAsync())) {
      return "unavailable";
    }

    let permission = await DeviceMotion.getPermissionsAsync();
    if (!permission.granted) {
      permission = await DeviceMotion.requestPermissionsAsync();
    }

    if (!permission.granted) {
      return "permissionDenied";
    }

    DeviceMotion.setUpdateInterval(SENSOR_UPDATE_INTERVAL_MS);
    this.subscription = DeviceMotion.addListener(({ rotation }) => {
      this.latestTheta = rotation.beta;
    });

    return "started";
  }

  currentTheta(): number | null {
    return this.latestTheta;
  }

  stop(): void {
    this.subscription?.remove();
    this.subscription = null;
    this.latestTheta = null;
  }
}
