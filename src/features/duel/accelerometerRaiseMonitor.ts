import { Accelerometer } from "expo-sensors";

import {
  RaiseGestureDetector,
  type RaiseDetection
} from "./raiseGestureDetector";

const SENSOR_UPDATE_INTERVAL_MS = 20;

export type RaiseMonitorStartResult =
  "started" | "permissionDenied" | "unavailable";

export class AccelerometerRaiseMonitor {
  private subscription: { remove(): void } | null = null;

  constructor(
    private readonly onRaise: (detection: RaiseDetection) => void,
    private readonly detector = new RaiseGestureDetector(),
    private readonly now: () => number = Date.now
  ) {}

  async start(): Promise<RaiseMonitorStartResult> {
    if (this.subscription) {
      return "started";
    }

    if (!(await Accelerometer.isAvailableAsync())) {
      return "unavailable";
    }

    let permission = await Accelerometer.getPermissionsAsync();
    if (!permission.granted) {
      permission = await Accelerometer.requestPermissionsAsync();
    }

    if (!permission.granted) {
      return "permissionDenied";
    }

    Accelerometer.setUpdateInterval(SENSOR_UPDATE_INTERVAL_MS);
    this.subscription = Accelerometer.addListener(({ x, y, z }) => {
      // Date.now shares the same clock as DuelMessage.atMs; native sensor
      // timestamps are not guaranteed to use wall-clock epoch time.
      const detection = this.detector.process({ atMs: this.now(), x, y, z });
      if (detection) {
        this.onRaise(detection);
      }
    });

    return "started";
  }

  stop(): void {
    this.subscription?.remove();
    this.subscription = null;
    this.detector.reset();
  }
}
