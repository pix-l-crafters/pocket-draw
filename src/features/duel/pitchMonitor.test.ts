import { Share } from "react-native";

import { SensorRecording, shareLatestSensorRecording } from "./sensorRecording";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import { PitchMonitor } from "./pitchMonitor";

type MotionReading = {
  acceleration: null;
  accelerationIncludingGravity: {
    x: number;
    y: number;
    z: number;
    timestamp: number;
  };
  interval: number;
  orientation: number;
  rotation: {
    alpha: number;
    beta: number;
    gamma: number;
    timestamp: number;
  } | null;
  rotationRate: null;
};

const mockListeners = new Set<(reading: MotionReading) => void>();
let mockAvailable = true;
let mockGranted = true;
let mockRequestedGranted = true;
let mockWaitAt: "availability" | "permission" | "request" | null = null;
let mockWait: Promise<void> | null = null;
let mockErrorAt:
  | "availability"
  | "permission"
  | "request"
  | "subscribe"
  | null = null;

jest.mock("expo-sensors", () => ({
  DeviceMotion: {
    isAvailableAsync: async () => {
      if (mockWaitAt === "availability") await mockWait;
      if (mockErrorAt === "availability") throw new Error("unavailable");
      return mockAvailable;
    },
    getPermissionsAsync: async () => {
      if (mockWaitAt === "permission") await mockWait;
      if (mockErrorAt === "permission") throw new Error("permission failed");
      return {
        granted: mockGranted,
        status: mockGranted ? "granted" : "denied",
        canAskAgain: true,
        expires: "never"
      };
    },
    requestPermissionsAsync: async () => {
      if (mockWaitAt === "request") await mockWait;
      if (mockErrorAt === "request") throw new Error("request failed");
      return {
        granted: mockRequestedGranted,
        status: mockRequestedGranted ? "granted" : "denied",
        canAskAgain: false,
        expires: "never"
      };
    },
    setUpdateInterval: () => undefined,
    addListener: (listener: (reading: MotionReading) => void) => {
      if (mockErrorAt === "subscribe") throw new Error("listener failed");
      mockListeners.add(listener);
      return { remove: () => mockListeners.delete(listener) };
    }
  }
}));

function reading(beta: number | null): MotionReading {
  return {
    acceleration: null,
    accelerationIncludingGravity: { x: 0, y: 0, z: 9.80665, timestamp: 10 },
    interval: 20,
    orientation: 0,
    rotation:
      beta === null ? null : { alpha: 0, beta, gamma: 0, timestamp: 10 },
    rotationRate: null
  };
}

function setPitch(beta: number | null) {
  mockListeners.forEach((listener) => listener(reading(beta)));
}

describe("PitchMonitor", () => {
  it("records the original callback sequence using its one subscription and ignores removed callbacks", async () => {
    const recording = new SensorRecording();
    recording.start("calibration", {});
    const monitor = new PitchMonitor(undefined, recording);
    await monitor.start();
    const removed = [...mockListeners][0];
    expect(mockListeners.size).toBe(1);
    setPitch(1.2);
    jest.advanceTimersByTime(20);
    setPitch(1.3);
    monitor.stop();
    await recording.finish("completed");
    recording.start("round", {});
    await monitor.start();
    removed(reading(99));
    setPitch(0.2);
    await recording.finish("completed");
    const share = jest
      .spyOn(Share, "share")
      .mockResolvedValue({ action: Share.sharedAction });
    await shareLatestSensorRecording();
    const json = JSON.parse(share.mock.calls[0][0].message!);
    expect(json.samples).toHaveLength(1);
    expect(json.samples[0].reading).toEqual(reading(0.2));
    expect(json.samples[0].receivedAtMs).toBe(10020);
    expect(mockListeners.size).toBe(1);
    monitor.stop();
    share.mockRestore();
  });

  it("retains a firing snapshot with raw motion and sample age, including stale readings", async () => {
    const monitor = new PitchMonitor();
    await monitor.start();
    setPitch(0.8);
    jest.advanceTimersByTime(2_001);
    expect(monitor.currentTheta()).toBeNull();
    expect(monitor.snapshot()).toMatchObject({
      receivedAtMs: 10_000,
      ageMs: 2_001,
      rotation: { alpha: 0, beta: 0.8, gamma: 0 },
      acceleration: null,
      accelerationIncludingGravity: { z: 9.80665 },
      rotationRate: null,
      interval: 20,
      orientation: 0
    });
    monitor.stop();
    expect(monitor.snapshot()).toBeNull();
  });
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(10_000);
    mockListeners.clear();
    mockAvailable = true;
    mockGranted = true;
    mockRequestedGranted = true;
    mockWaitAt = null;
    mockWait = null;
    mockErrorAt = null;
  });

  afterEach(() => jest.useRealTimers());

  it("exposes only fresh finite pitch, never a fabricated or invalid reading", async () => {
    const monitor = new PitchMonitor();
    expect(monitor.currentTheta()).toBeNull();
    expect(await monitor.start()).toBe("started");
    expect(monitor.currentTheta()).toBeNull();
    setPitch(0);
    expect(monitor.currentTheta()).toBe(0);
    jest.advanceTimersByTime(2_000);
    expect(monitor.currentTheta()).toBe(0);
    jest.advanceTimersByTime(1);
    expect(monitor.currentTheta()).toBeNull();

    for (const invalid of [
      null,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY
    ]) {
      setPitch(0.5);
      setPitch(invalid);
      expect(monitor.currentTheta()).toBeNull();
    }

    setPitch(-0.8);
    expect(monitor.currentTheta()).toBe(-0.8);
    monitor.stop();
    expect(monitor.currentTheta()).toBeNull();
    expect(mockListeners.size).toBe(0);
  });

  it("shares a pending start and releases its one subscription on stop", async () => {
    const monitor = new PitchMonitor();
    const first = monitor.start();
    const second = monitor.start();
    expect(await first).toBe("started");
    expect(await second).toBe("started");
    expect(mockListeners.size).toBe(1);
    setPitch(0.4);
    expect(monitor.currentTheta()).toBe(0.4);
    monitor.stop();
    expect(mockListeners.size).toBe(0);
  });

  it.each(["availability", "permission", "request"] as const)(
    "cancels startup stopped during %s without leaking a late listener",
    async (stage) => {
      let resolveWait!: () => void;
      mockWait = new Promise<void>((resolve) => {
        resolveWait = resolve;
      });
      mockWaitAt = stage;
      mockGranted = stage !== "request";
      const monitor = new PitchMonitor();
      const pending = monitor.start();
      await Promise.resolve();
      await Promise.resolve();
      monitor.stop();
      resolveWait();

      expect(await pending).toBe("cancelled");
      expect(mockListeners.size).toBe(0);
      expect(monitor.currentTheta()).toBeNull();
    }
  );

  it("does not let an older cancelled start overwrite a newer active one", async () => {
    let resolveWait!: () => void;
    mockWait = new Promise<void>((resolve) => {
      resolveWait = resolve;
    });
    mockWaitAt = "permission";
    const monitor = new PitchMonitor();
    const oldStart = monitor.start();
    await Promise.resolve();
    await Promise.resolve();
    monitor.stop();
    mockWaitAt = null;
    expect(await monitor.start()).toBe("started");
    setPitch(0.6);
    resolveWait();

    expect(await oldStart).toBe("cancelled");
    expect(mockListeners.size).toBe(1);
    expect(monitor.currentTheta()).toBe(0.6);
    monitor.stop();
    expect(mockListeners.size).toBe(0);
  });

  it("ignores a late callback from a stopped subscription after restarting", async () => {
    const monitor = new PitchMonitor();
    await monitor.start();
    const oldListener = [...mockListeners][0]!;
    monitor.stop();
    await monitor.start();
    setPitch(0.3);
    oldListener(reading(1.8));
    expect(monitor.currentTheta()).toBe(0.3);
    monitor.stop();
  });

  it.each(["availability", "permission", "request", "subscribe"] as const)(
    "returns a recoverable error when %s throws and can start again",
    async (stage) => {
      mockErrorAt = stage;
      mockGranted = stage !== "request";
      const monitor = new PitchMonitor();
      expect(await monitor.start()).toBe("error");
      expect(monitor.currentTheta()).toBeNull();
      expect(mockListeners.size).toBe(0);

      mockErrorAt = null;
      mockGranted = true;
      expect(await monitor.start()).toBe("started");
      setPitch(0.1);
      expect(monitor.currentTheta()).toBe(0.1);
      monitor.stop();
    }
  );
});
