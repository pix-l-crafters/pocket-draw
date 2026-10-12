import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Share } from "react-native";

const STORAGE_KEY = "@pocket-draw/latest-sensor-recording";
const WINDOW_MS = 30_000;
const MAX_SAMPLES = 1_500;
const MAX_EVENTS = 256;
let pendingSave: Promise<void> = Promise.resolve();

type Source =
  | "deviceMotion"
  | "calibrationAccelerometer"
  | "falseStartAccelerometer";
type Entry = { order: number; receivedAtMs: number };
type Sample = Entry & { source: Source; reading: unknown };
type Marker = Entry & { name: string; data: Record<string, unknown> };
type Recording = {
  recordingType: "calibration" | "round";
  schemaVersion: 1;
  platform: string;
  startedAtMs: number;
  finishedAtMs?: number;
  metadata: Record<string, unknown>;
  samples: Sample[];
  events: Marker[];
  truncated: boolean;
  dropped: { samples: number; events: number };
};

// Copy native payloads in memory, preserving missing fields and original values.
function copy<T>(value: T): T {
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, copy(child)])
    ) as T;
  }
  return value;
}

/**
 * Development diagnostics only. No storage or sharing work runs in sensor
 * callbacks.
 */
export class SensorRecording {
  private session: Recording | null = null;
  private order = 0;

  start(
    type: Recording["recordingType"],
    metadata: Record<string, unknown>
  ): void {
    this.session = null;
    if (!__DEV__) return;
    this.order = 0;
    this.session = {
      recordingType: type,
      schemaVersion: 1,
      platform: Platform.OS,
      startedAtMs: Date.now(),
      metadata: {
        sources: {
          deviceMotion: {
            rotation: "radians",
            rotationRate: "degrees/second",
            acceleration: "m/s^2",
            accelerationIncludingGravity: "m/s^2",
            interval:
              Platform.OS === "ios"
                ? "seconds (raw Expo iOS interval)"
                : "milliseconds",
            orientation: "screen rotation degrees"
          },
          calibrationAccelerometer: "Expo Accelerometer x/y/z in g-force",
          falseStartAccelerometer: "Expo Accelerometer x/y/z in g-force"
        },
        timestamps: {
          sensor:
            "Original native timestamp fields in seconds; native clock origins may differ by source/platform. Never subtract from application timestamps.",
          application:
            "receivedAtMs, startedAtMs, finishedAtMs and marker times are Date.now() milliseconds since Unix epoch. Bounds and calibration freshness use callback receipt time.",
          order:
            "Increasing callback/marker insertion order within this session, including equal receipt times."
        },
        bounds: {
          windowMs: WINDOW_MS,
          maxSamples: MAX_SAMPLES,
          maxEvents: MAX_EVENTS
        },
        missingValues:
          "Absent fields remain absent; native null remains null. Non-finite numeric values serialize as null in JSON.",
        ...metadata
      },
      samples: [],
      events: [],
      truncated: false,
      dropped: { samples: 0, events: 0 }
    };
    this.mark(type === "calibration" ? "calibrationStart" : "roundStart");
  }

  sample(source: Source, reading: unknown, receivedAtMs = Date.now()): void {
    if (!__DEV__ || !this.session) return;
    try {
      this.session.samples.push({
        source,
        reading: copy(reading),
        receivedAtMs,
        order: this.order++
      });
      this.prune(receivedAtMs);
    } catch {
      /* Diagnostics must never interrupt gameplay. */
    }
  }

  mark(name: string, data: Record<string, unknown> = {}): void {
    if (!__DEV__ || !this.session) return;
    try {
      const receivedAtMs = Date.now();
      this.session.events.push({
        name,
        data: copy(data),
        receivedAtMs,
        order: this.order++
      });
      this.prune(receivedAtMs);
    } catch {
      /* Diagnostics must never interrupt gameplay. */
    }
  }

  finish(
    reason: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    if (!__DEV__ || !this.session) return Promise.resolve();
    this.mark("sessionEnd", { reason });
    const completed = this.session;
    this.session = null;
    completed.finishedAtMs = Date.now();
    completed.metadata = { ...completed.metadata, ...metadata };
    // Serialize writes so an older session cannot overwrite a newer completion.
    pendingSave = pendingSave.then(async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
      } catch {
        /* Storage failure is independent of the duel. */
      }
    });
    return pendingSave;
  }

  private prune(nowMs: number): void {
    const session = this.session!;
    for (const [key, max] of [
      ["samples", MAX_SAMPLES],
      ["events", MAX_EVENTS]
    ] as const) {
      const entries = session[key];
      while (
        entries.length &&
        (entries.length > max || nowMs - entries[0].receivedAtMs > WINDOW_MS)
      ) {
        entries.shift();
        session.dropped[key]++;
        session.truncated = true;
      }
    }
  }
}

export async function shareLatestSensorRecording(): Promise<
  "shared" | "cancelled" | "empty" | "error"
> {
  if (!__DEV__) return "empty";
  try {
    await pendingSave;
    const message = await AsyncStorage.getItem(STORAGE_KEY);
    if (!message) return "empty";
    const result = await Share.share({
      title: "Pocket Draw sensor recording v1",
      message
    });
    return result.action === Share.dismissedAction ? "cancelled" : "shared";
  } catch {
    return "error";
  }
}
