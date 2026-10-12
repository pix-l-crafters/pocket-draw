import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Share } from "react-native";

import { SensorRecording, shareLatestSensorRecording } from "./sensorRecording";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(10000);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it("preserves consecutive raw readings and ordered markers, persisting only on finish", async () => {
  const recording = new SensorRecording();
  recording.start("calibration", {});
  const raw = {
    rotation: { beta: 1, timestamp: 42 },
    interval: 20,
    orientation: 90
  };
  recording.sample("deviceMotion", raw, 10000);
  raw.rotation.beta = 2;
  recording.sample("deviceMotion", raw, 10020);
  recording.sample(
    "calibrationAccelerometer",
    { x: 0, y: 0, z: 1, timestamp: 43 },
    10020
  );
  recording.mark("poseChange", { pose: "shoulder" });
  recording.mark("poseConfirmation", { medianPitch: 1.5 });
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  await recording.finish("completed");
  const share = jest
    .spyOn(Share, "share")
    .mockResolvedValue({ action: Share.sharedAction });
  expect(await shareLatestSensorRecording()).toBe("shared");
  const json = JSON.parse(share.mock.calls[0][0].message!);
  expect(json.samples.map((s: any) => s.reading)).toEqual([
    { rotation: { beta: 1, timestamp: 42 }, interval: 20, orientation: 90 },
    { rotation: { beta: 2, timestamp: 42 }, interval: 20, orientation: 90 },
    { x: 0, y: 0, z: 1, timestamp: 43 }
  ]);
  expect(json.events.map((e: any) => e.name)).toEqual([
    "calibrationStart",
    "poseChange",
    "poseConfirmation",
    "sessionEnd"
  ]);
  expect(json.truncated).toBe(false);
});

async function exported() {
  const share = jest
    .spyOn(Share, "share")
    .mockResolvedValue({ action: Share.sharedAction });
  await shareLatestSensorRecording();
  return JSON.parse(share.mock.calls[0][0].message!);
}

it("enforces sample and event limits and reports dropped counts", async () => {
  const recording = new SensorRecording();
  recording.start("round", {});
  for (let i = 0; i < 1600; i++)
    recording.sample("deviceMotion", {
      rotation: { beta: i, timestamp: i / 100 }
    });
  for (let i = 0; i < 300; i++) recording.mark("fireInput", { i });
  await recording.finish("completed");
  const json = await exported();
  expect(json.samples).toHaveLength(1500);
  expect(json.samples[0].reading.rotation.beta).toBe(100);
  expect(json.events).toHaveLength(256);
  expect(json.dropped).toEqual({ samples: 100, events: 46 });
  expect(json.truncated).toBe(true);
  expect(
    json.events.every(
      (e: any, i: number) => !i || e.order > json.events[i - 1].order
    )
  ).toBe(true);
});

it("retains only the most recent thirty seconds, including markers", async () => {
  const recording = new SensorRecording();
  recording.start("round", {});
  recording.sample("deviceMotion", { rotation: { beta: 1 } });
  jest.advanceTimersByTime(30000);
  recording.sample("deviceMotion", { rotation: { beta: 2 } });
  jest.advanceTimersByTime(1);
  recording.mark("roundEnd");
  await recording.finish("completed");
  const json = await exported();
  expect(json.samples).toHaveLength(1);
  expect(json.samples[0].reading.rotation.beta).toBe(2);
  expect(json.events.map((e: any) => e.name)).toEqual([
    "roundEnd",
    "sessionEnd"
  ]);
  expect(json.dropped).toEqual({ samples: 1, events: 1 });
});

it("finishes once, ignores stopped callbacks, and never merges restarted sessions", async () => {
  const recording = new SensorRecording();
  recording.start("calibration", {});
  recording.sample("deviceMotion", { rotation: { beta: 1 } });
  await recording.finish("completed");
  recording.sample("deviceMotion", { rotation: { beta: 99 } });
  await recording.finish("duplicate");
  recording.start("round", {});
  recording.sample("falseStartAccelerometer", { x: 2, timestamp: 10 });
  await recording.finish("completed");
  const json = await exported();
  expect(json.recordingType).toBe("round");
  expect(json.samples).toHaveLength(1);
  expect(json.samples[0].source).toBe("falseStartAccelerometer");
  expect(await AsyncStorage.getAllKeys()).toEqual([
    "@pocket-draw/latest-sensor-recording"
  ]);
});

it("does no recording, persistence or export in production", async () => {
  const original = __DEV__;
  const share = jest.spyOn(Share, "share");
  try {
    (globalThis as any).__DEV__ = false;
    const recording = new SensorRecording();
    recording.start("round", {});
    recording.sample("deviceMotion", { rotation: { beta: 1 } });
    recording.mark("fireInput");
    await recording.finish("completed");
    expect(await shareLatestSensorRecording()).toBe("empty");
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
    expect(share).not.toHaveBeenCalled();
  } finally {
    (globalThis as any).__DEV__ = original;
  }
});

it("contains saving and sharing failures and accepts share cancellation", async () => {
  const recording = new SensorRecording();
  const save = jest
    .spyOn(AsyncStorage, "setItem")
    .mockRejectedValueOnce(new Error("full"));
  recording.start("round", {});
  await expect(recording.finish("completed")).resolves.toBeUndefined();
  recording.start("calibration", {});
  await recording.finish("completed");
  expect(save).toHaveBeenCalledTimes(2);
  const share = jest
    .spyOn(Share, "share")
    .mockRejectedValueOnce(new Error("unavailable"));
  expect(await shareLatestSensorRecording()).toBe("error");
  share.mockResolvedValueOnce({ action: Share.dismissedAction });
  expect(await shareLatestSensorRecording()).toBe("cancelled");
  jest
    .spyOn(AsyncStorage, "getItem")
    .mockRejectedValueOnce(new Error("read failed"));
  expect(await shareLatestSensorRecording()).toBe("error");
});

it.each([
  ["ios", 0.02, "seconds (raw Expo iOS interval)"],
  ["android", 20, "milliseconds"]
] as const)(
  "labels the original reported interval on %s without conversion",
  async (os, interval, unit) => {
    const original = Platform.OS;
    try {
      Platform.OS = os;
      const recording = new SensorRecording();
      recording.start("round", {
        requestedIntervalsMs: { deviceMotion: 20, accelerometer: 150 }
      });
      recording.sample("deviceMotion", { interval });
      await recording.finish("completed");
      const json = await exported();
      expect(json.samples[0].reading.interval).toBe(interval);
      expect(json.metadata.sources.deviceMotion.interval).toBe(unit);
      expect(json.metadata.requestedIntervalsMs.deviceMotion).toBe(20);
    } finally {
      Platform.OS = original;
    }
  }
);
