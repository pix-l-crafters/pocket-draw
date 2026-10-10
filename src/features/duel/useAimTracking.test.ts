import { act, renderHook } from "@testing-library/react-native";
import {
  Accuracy,
  getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync,
  watchHeadingAsync,
  watchPositionAsync,
  type LocationHeadingObject,
  type LocationObject,
  type LocationPermissionResponse,
  type LocationSubscription
} from "expo-location";
import { AppState, type AppStateStatus } from "react-native";

import type { DuelChannel, DuelMessage } from "../../contracts/duelChannel";
import type { AimDiagnostics } from "../../contracts/matchAnalytics";
import { classifyZone, type ShotClassification } from "./pitchZoneClassifier";
import { useAimTracking } from "./useAimTracking";

jest.mock("expo-location", () => ({
  Accuracy: { High: 4 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  watchHeadingAsync: jest.fn(),
  watchPositionAsync: jest.fn()
}));

let positionListener: ((reading: LocationObject) => void) | undefined;
let headingListener: ((reading: LocationHeadingObject) => void) | undefined;
let positionError: ((reason: string) => void) | undefined;
let headingError: ((reason: string) => void) | undefined;
let positionSubscription: LocationSubscription;
let headingSubscription: LocationSubscription;
let foregroundListeners: Set<(state: AppStateStatus) => void>;

const permission = (
  granted: boolean,
  canAskAgain = true
): LocationPermissionResponse => ({
  granted,
  canAskAgain,
  expires: "never",
  status: (granted
    ? "granted"
    : "denied") as LocationPermissionResponse["status"]
});

function position(
  latitude = 0,
  longitude = 0,
  timestamp = Date.now(),
  accuracy: number | null = 1
): LocationObject {
  return {
    coords: {
      latitude,
      longitude,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null
    },
    timestamp,
    mocked: false
  };
}

const heading = (trueHeading = 0, magHeading = 180, accuracy = 3) => ({
  trueHeading,
  magHeading,
  accuracy
});
const peerPosition = (
  latitude = 0.001,
  longitude = 0,
  sampleAtMs = Date.now()
): DuelMessage => ({
  type: "aimPosition",
  latitude,
  longitude,
  accuracy: 1,
  sampleAtMs
});

async function mount(clockOffsetMs = 0) {
  const diagnostics: AimDiagnostics[] = [];
  const sent: DuelMessage[] = [];
  const handlers = new Set<(message: DuelMessage) => void>();
  let connected = true;
  let throwOnSend = false;
  const channel: DuelChannel = {
    send: (message) => {
      if (throwOnSend) throw new Error("Data channel dropped while sending");
      sent.push(message);
    },
    onMessage: (listener) => {
      handlers.add(listener);
      return () => handlers.delete(listener);
    },
    isConnected: () => connected
  };
  const view = await renderHook<
    (shot: ShotClassification) => ShotClassification,
    { clockOffsetMs: number }
  >(
    ({ clockOffsetMs }) =>
      useAimTracking(channel, clockOffsetMs, (reading) =>
        diagnostics.push(reading)
      ),
    {
      initialProps: { clockOffsetMs }
    }
  );
  await act(async () => {});
  const capture = view.result.current!;
  const receive = (message: DuelMessage) =>
    act(() => handlers.forEach((listener) => listener(message)));
  const setPosition = (reading = position()) =>
    act(() => positionListener?.(reading));
  const setHeading = (reading = heading()) =>
    act(() => headingListener?.(reading));
  const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms));
  const trustedReadings = () =>
    act(() => {
      positionListener?.(position());
      headingListener?.(heading());
      handlers.forEach((listener) =>
        listener(peerPosition(0.001, 0, Date.now() + clockOffsetMs))
      );
    });
  return {
    diagnostics,
    view,
    capture,
    sent,
    handlers,
    receive,
    setPosition,
    setHeading,
    wait,
    trustedReadings,
    disconnect: () => {
      connected = false;
    },
    reconnect: () => {
      connected = true;
    },
    failSends: () => {
      throwOnSend = true;
    }
  };
}

describe("useAimTracking", () => {
  test("captures heading error and GPS uncertainty even when pitch already missed", async () => {
    const duel = await mount();
    await duel.trustedReadings();
    await duel.setHeading(heading(45));
    expect(duel.capture(classifyZone(0.4))).toEqual({
      zone: "miss",
      missReason: "tooLow"
    });
    expect(duel.diagnostics.at(-1)).toMatchObject({
      heading: { value: 45, accuracy: 3, ageMs: 0 },
      self: { accuracy: 1, ageMs: 0 },
      opponent: { accuracy: 1, ageMs: 0 },
      bearingDegrees: 0,
      headingErrorDegrees: 45,
      bypassedWithinGpsUncertainty: false,
      issues: []
    });
    await duel.wait(5001);
    duel.capture(classifyZone(1));
    expect(duel.diagnostics.at(-1)?.issues).toEqual(
      expect.arrayContaining([
        "headingStale",
        "selfPositionStale",
        "opponentPositionStale"
      ])
    );
    await duel.view.unmount();
  });
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000_000);
    jest.clearAllMocks();
    positionListener = undefined;
    headingListener = undefined;
    positionError = undefined;
    headingError = undefined;
    positionSubscription = { remove: jest.fn() };
    headingSubscription = { remove: jest.fn() };
    foregroundListeners = new Set();
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, listener) => {
        foregroundListeners.add(listener);
        return { remove: () => foregroundListeners.delete(listener) };
      });
    jest
      .mocked(getForegroundPermissionsAsync)
      .mockResolvedValue(permission(true));
    jest
      .mocked(requestForegroundPermissionsAsync)
      .mockResolvedValue(permission(true));
    jest
      .mocked(watchPositionAsync)
      .mockImplementation(async (_options, listener, onError) => {
        positionListener = listener;
        positionError = onError;
        return positionSubscription;
      });
    jest
      .mocked(watchHeadingAsync)
      .mockImplementation(async (listener, onError) => {
        headingListener = listener;
        headingError = onError;
        return headingSubscription;
      });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test("retains pitch causes without aim and records stale or unreliable tracking at fire time", async () => {
    const duel = await mount();
    expect(duel.capture(classifyZone(0.4))).toEqual({
      zone: "miss",
      missReason: "tooLow"
    });
    expect(duel.capture(classifyZone(1.3))).toEqual({
      zone: "miss",
      missReason: "tooHigh"
    });
    expect(duel.capture({ zone: "bodyshot" })).toEqual({
      zone: "miss",
      missReason: "trackingUnavailable"
    });
    await duel.trustedReadings();
    await duel.setHeading(heading(180));
    expect(duel.capture({ zone: "bodyshot" })).toEqual({
      zone: "miss",
      missReason: "offTarget"
    });
    await duel.wait(2001);
    expect(duel.capture({ zone: "bodyshot" })).toEqual({
      zone: "miss",
      missReason: "trackingUnavailable"
    });
    await duel.setHeading(heading(180, 180, 2));
    expect(duel.capture({ zone: "bodyshot" })).toEqual({
      zone: "miss",
      missReason: "trackingUnavailable"
    });
    expect(duel.capture(classifyZone(0.4))).toEqual({
      zone: "miss",
      missReason: "tooLow"
    });
  });

  test("missing readings never produce a hit", async () => {
    const duel = await mount();
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
    await duel.setPosition();
    await duel.setHeading();
    expect(duel.capture({ zone: "headshot" }).zone).toBe("miss");
    await duel.receive(peerPosition());
    expect(duel.capture({ zone: "headshot" }).zone).toBe("headshot");
    expect(duel.capture({ zone: "miss" }).zone).toBe("miss");
  });

  test("uses an existing foreground grant and requests frequent high-accuracy GPS", async () => {
    const duel = await mount();
    await duel.trustedReadings();
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("bodyshot");
    expect(requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(watchPositionAsync).toHaveBeenCalledWith(
      { accuracy: Accuracy.High, timeInterval: 1000, distanceInterval: 0 },
      expect.any(Function),
      expect.any(Function)
    );
  });

  test("requests foreground permission when it can be granted", async () => {
    jest
      .mocked(getForegroundPermissionsAsync)
      .mockResolvedValue(permission(false));
    const duel = await mount();
    await duel.trustedReadings();
    expect(requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("bodyshot");
  });

  test("a retained capture callback sees new compass and both players' GPS readings", async () => {
    const duel = await mount();
    await duel.trustedReadings();
    expect(duel.capture({ zone: "headshot" }).zone).toBe("headshot");
    await duel.view.rerender({ clockOffsetMs: 0 });
    expect(duel.view.result.current).toBe(duel.capture);
    await duel.setHeading(heading(180));
    expect(duel.capture({ zone: "headshot" }).zone).toBe("miss");
    await duel.receive(peerPosition(-0.001));
    expect(duel.capture({ zone: "headshot" }).zone).toBe("headshot");
    await duel.setPosition(position(-0.002));
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
    await duel.setHeading(heading(0));
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("bodyshot");
  });

  test("compares true north, never magnetic north or an uncalibrated compass", async () => {
    const duel = await mount();
    await duel.trustedReadings();
    await duel.setHeading(heading(180, 0));
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
    await duel.setHeading(heading(-1, 0));
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
    await duel.setHeading(heading(0, 180, 2));
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
    await duel.setHeading(heading(0, 180, 3));
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("bodyshot");
  });

  test("requires heading freshness at capture, including the 2-second boundary", async () => {
    const duel = await mount();
    await duel.trustedReadings();
    await duel.wait(2000);
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("bodyshot");
    await duel.wait(1);
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
    await duel.setHeading();
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("bodyshot");
  });

  test("requires fresh GPS on both sides and does not refresh it by publishing repeats", async () => {
    const duel = await mount();
    await duel.trustedReadings();
    await duel.wait(5000);
    await duel.setHeading();
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("bodyshot");
    await duel.wait(1);
    await duel.setHeading();
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
    await duel.setPosition();
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
    await duel.receive(peerPosition());
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("bodyshot");
  });

  test("includes network flight time when a 4500ms-old peer fix arrives 750ms later", async () => {
    const duel = await mount();
    const delayedFix = peerPosition(0.001, 0, 995_500);
    await duel.wait(750);
    await duel.setPosition();
    await duel.setHeading();
    await duel.receive(delayedFix);
    expect(duel.capture({ zone: "headshot" }).zone).toBe("miss");
  });

  test("a repeated peer timestamp never renews the source GPS fix", async () => {
    const duel = await mount();
    const fix = peerPosition();
    await duel.trustedReadings();
    await duel.wait(5000);
    await duel.setPosition();
    await duel.setHeading();
    await duel.receive(fix);
    expect(duel.capture({ zone: "headshot" }).zone).toBe("headshot");
    await duel.wait(1);
    await duel.setHeading();
    await duel.receive(fix);
    expect(duel.capture({ zone: "headshot" }).zone).toBe("miss");
    await duel.receive(peerPosition());
    expect(duel.capture({ zone: "headshot" }).zone).toBe("headshot");
  });

  test("publishes the native GPS timestamp unchanged on initial, repeat, and changed fixes", async () => {
    const duel = await mount(60_000);
    await duel.setPosition(position(0, 0, Date.now() - 1200));
    await duel.setHeading();
    await duel.wait(1000);
    await duel.setPosition(position(0.002, 0.003));
    await duel.wait(1000);
    expect(duel.sent).toEqual([
      {
        type: "aimPosition",
        latitude: 0,
        longitude: 0,
        accuracy: 1,
        sampleAtMs: 998_800
      },
      {
        type: "aimPosition",
        latitude: 0,
        longitude: 0,
        accuracy: 1,
        sampleAtMs: 998_800
      },
      {
        type: "aimPosition",
        latitude: 0.002,
        longitude: 0.003,
        accuracy: 1,
        sampleAtMs: 1_001_000
      },
      {
        type: "aimPosition",
        latitude: 0.002,
        longitude: 0.003,
        accuracy: 1,
        sampleAtMs: 1_001_000
      }
    ]);
  });

  test.each([NaN, Infinity, -Infinity, 1_000_001])(
    "rejects an untrusted peer timestamp %s after a good fix",
    async (sampleAtMs) => {
      const duel = await mount();
      await duel.trustedReadings();
      await duel.receive(peerPosition(0.001, 0, sampleAtMs));
      expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
    }
  );

  test.each([-60_000, 60_000])(
    "a calibrated offset of %sms accepts fresh peer time and rejects stale or future fixes",
    async (clockOffsetMs) => {
      const duel = await mount(clockOffsetMs);
      await duel.setPosition();
      await duel.setHeading();
      await duel.receive(
        peerPosition(0.001, 0, Date.now() + clockOffsetMs - 1000)
      );
      expect(duel.capture({ zone: "bodyshot" }).zone).toBe("bodyshot");
      await duel.receive(
        peerPosition(0.001, 0, Date.now() + clockOffsetMs - 5001)
      );
      expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
      await duel.receive(
        peerPosition(0.001, 0, Date.now() + clockOffsetMs + 1)
      );
      expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
    }
  );

  test.each([-60_000, 60_000])(
    "offset correction of %sms applies to an already received fix without restarting tracking",
    async (clockOffsetMs) => {
      const duel = await mount();
      await duel.setPosition();
      await duel.setHeading();
      await duel.receive(peerPosition(0.001, 0, Date.now() + clockOffsetMs));
      const listener = [...duel.handlers][0];
      expect(duel.capture({ zone: "headshot" }).zone).toBe("miss");
      await duel.view.rerender({ clockOffsetMs });
      expect(duel.view.result.current).toBe(duel.capture);
      expect(duel.capture({ zone: "headshot" }).zone).toBe("headshot");
      expect([...duel.handlers]).toEqual([listener]);
      expect(watchPositionAsync).toHaveBeenCalledTimes(1);
      expect(watchHeadingAsync).toHaveBeenCalledTimes(1);
      expect(positionSubscription.remove).not.toHaveBeenCalled();
      expect(headingSubscription.remove).not.toHaveBeenCalled();
      await duel.view.rerender({ clockOffsetMs: 0 });
      expect(duel.capture({ zone: "headshot" }).zone).toBe("miss");
    }
  );

  test.each([NaN, Infinity, -Infinity])(
    "a nonfinite calibrated offset %s fails closed and can recover the stored fix",
    async (clockOffsetMs) => {
      const duel = await mount();
      await duel.trustedReadings();
      await duel.view.rerender({ clockOffsetMs });
      expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
      await duel.view.rerender({ clockOffsetMs: 0 });
      expect(duel.capture({ zone: "bodyshot" }).zone).toBe("bodyshot");
    }
  );

  test("rejects invalid peer GPS even after a trusted sample", async () => {
    const duel = await mount();
    await duel.trustedReadings();
    await duel.receive({
      type: "aimPosition",
      latitude: 91,
      longitude: 0,
      accuracy: 1,
      sampleAtMs: Date.now()
    });
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
    await duel.receive({
      type: "aimPosition",
      latitude: 0.001,
      longitude: 0,
      accuracy: NaN,
      sampleAtMs: Date.now()
    });
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
  });

  test.each([
    ["missing accuracy", () => position(0, 0, Date.now(), null)],
    ["future timestamp", () => position(0, 0, Date.now() + 1)],
    ["invalid timestamp", () => position(0, 0, NaN)],
    ["mocked GPS", () => ({ ...position(), mocked: true })]
  ])("invalidates and does not publish %s", async (_name, reading) => {
    const duel = await mount();
    await duel.trustedReadings();
    duel.sent.length = 0;
    await duel.setPosition(reading());
    await duel.wait(1000);
    await duel.setHeading();
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
    expect(duel.sent).toEqual([]);
  });

  test("overlapping GPS uncertainty keeps a calibrated pitch hit", async () => {
    const duel = await mount();
    await duel.trustedReadings();
    await duel.setPosition(position(0, 0, Date.now(), 200));
    expect(duel.capture({ zone: "headshot" }).zone).toBe("headshot");
  });

  test("sensor error callbacks invalidate the previous good reading", async () => {
    const duel = await mount();
    await duel.trustedReadings();
    await act(() => headingError?.("Compass unavailable"));
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
    await duel.setHeading();
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("bodyshot");
    await act(() => positionError?.("GPS unavailable"));
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
    await duel.setPosition();
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("bodyshot");
  });

  test.each(["heading", "position", "permission"] as const)(
    "handles %s startup rejection as a miss",
    async (sensor) => {
      const error = new Error("Sensor unavailable");
      if (sensor === "heading")
        jest.mocked(watchHeadingAsync).mockRejectedValueOnce(error);
      if (sensor === "position")
        jest.mocked(watchPositionAsync).mockRejectedValueOnce(error);
      if (sensor === "permission")
        jest.mocked(getForegroundPermissionsAsync).mockRejectedValueOnce(error);
      const duel = await mount();
      await duel.trustedReadings();
      await duel.wait(1000);
      expect(duel.capture({ zone: "headshot" }).zone).toBe("miss");
    }
  );

  test("denied permission does not subscribe to native sensors", async () => {
    jest
      .mocked(getForegroundPermissionsAsync)
      .mockResolvedValue(permission(false, false));
    const duel = await mount();
    await duel.receive(peerPosition());
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
    expect(watchPositionAsync).not.toHaveBeenCalled();
    expect(watchHeadingAsync).not.toHaveBeenCalled();
    expect(requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  test("a refused permission request remains a miss", async () => {
    jest
      .mocked(getForegroundPermissionsAsync)
      .mockResolvedValue(permission(false));
    jest
      .mocked(requestForegroundPermissionsAsync)
      .mockResolvedValue(permission(false));
    const duel = await mount();
    await duel.receive(peerPosition());
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
    expect(watchPositionAsync).not.toHaveBeenCalled();
  });

  test("returning from Settings recovers a grant without replacing the capture callback", async () => {
    jest
      .mocked(getForegroundPermissionsAsync)
      .mockResolvedValue(permission(false, false));
    const duel = await mount();
    expect(duel.capture({ zone: "bodyshot" }).zone).toBe("miss");
    jest
      .mocked(getForegroundPermissionsAsync)
      .mockResolvedValue(permission(true));
    await act(() =>
      foregroundListeners.forEach((listener) => listener("active"))
    );
    await act(async () => {});
    await duel.trustedReadings();
    expect(duel.capture({ zone: "headshot" }).zone).toBe("headshot");
    expect(duel.view.result.current).toBe(duel.capture);
  });

  test("skips disconnected sends and survives a drop during publication", async () => {
    const duel = await mount();
    duel.disconnect();
    await duel.setPosition();
    await duel.wait(1000);
    expect(duel.sent).toEqual([]);
    duel.reconnect();
    await duel.wait(1000);
    expect(duel.sent).toEqual([
      {
        type: "aimPosition",
        latitude: 0,
        longitude: 0,
        accuracy: 1,
        sampleAtMs: 1_000_000
      }
    ]);
    duel.failSends();
    await duel.setPosition();
    await duel.wait(1000);
  });

  test("unmount clears sensors, the peer listener, and repeat publication", async () => {
    const duel = await mount();
    await duel.trustedReadings();
    await duel.view.unmount();
    expect(positionSubscription.remove).toHaveBeenCalledTimes(1);
    expect(headingSubscription.remove).toHaveBeenCalledTimes(1);
    expect(duel.handlers.size).toBe(0);
    expect(duel.sent).toEqual([
      {
        type: "aimPosition",
        latitude: 0,
        longitude: 0,
        accuracy: 1,
        sampleAtMs: 1_000_000
      }
    ]);
    await duel.setPosition(position(0.002, 0.003));
    await duel.setHeading(heading(180));
    await duel.wait(2000);
    expect(duel.sent).toEqual([
      {
        type: "aimPosition",
        latitude: 0,
        longitude: 0,
        accuracy: 1,
        sampleAtMs: 1_000_000
      }
    ]);
  });

  test("removes subscriptions whose promises resolve after unmount", async () => {
    const pendingPosition = Promise.withResolvers<LocationSubscription>();
    const pendingHeading = Promise.withResolvers<LocationSubscription>();
    jest
      .mocked(watchPositionAsync)
      .mockImplementationOnce((_options, listener) => {
        positionListener = listener;
        return pendingPosition.promise;
      });
    jest.mocked(watchHeadingAsync).mockImplementationOnce((listener) => {
      headingListener = listener;
      return pendingHeading.promise;
    });
    const duel = await mount();
    await duel.view.unmount();
    await act(async () => {
      pendingPosition.resolve(positionSubscription);
      pendingHeading.resolve(headingSubscription);
    });
    expect(positionSubscription.remove).toHaveBeenCalledTimes(1);
    expect(headingSubscription.remove).toHaveBeenCalledTimes(1);
    await duel.setPosition();
    await duel.setHeading();
    await duel.wait(1000);
    expect(duel.sent).toEqual([]);
    expect(duel.handlers.size).toBe(0);
  });

  test("a permission response after unmount cannot start sensors", async () => {
    const pendingPermission =
      Promise.withResolvers<LocationPermissionResponse>();
    jest
      .mocked(getForegroundPermissionsAsync)
      .mockReturnValueOnce(pendingPermission.promise);
    const duel = await mount();
    await duel.view.unmount();
    await act(async () => pendingPermission.resolve(permission(true)));
    expect(watchPositionAsync).not.toHaveBeenCalled();
    expect(watchHeadingAsync).not.toHaveBeenCalled();
  });
});
