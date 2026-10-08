// Guards cross-platform phone positioning and the fixed countdown-to-FIRE flow.

import { act, fireEvent, render } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { PaperProvider } from "react-native-paper";

import type { DuelChannel, DuelMessage } from "../../contracts/duelChannel";
import { appTheme } from "../../theme/appTheme";
import type { DuelRole } from "./fireSignalCoordinator";
import { COUNTDOWN_DURATION_MS, PreRound } from "./PreRound";
import type { RoundShots } from "./roundShots";
import { judgeRoundShots } from "./roundShots";

const mockHeadingListeners = new Set<
  (reading: {
    trueHeading: number;
    magHeading: number;
    accuracy: number;
  }) => void
>();
const mockPitchListeners = new Set<
  (reading: { rotation: { beta: number } | null }) => void
>();
jest.mock("expo-location", () => ({
  Accuracy: { High: 4 },
  requestForegroundPermissionsAsync: async () => ({ granted: true }),
  getForegroundPermissionsAsync: async () => ({ granted: true }),
  hasServicesEnabledAsync: async () => true,
  watchPositionAsync: async (
    _options: unknown,
    listener: (reading: unknown) => void
  ) => {
    listener({
      coords: { latitude: 0, longitude: 0, accuracy: 1 },
      timestamp: Date.now()
    });
    return { remove: () => undefined };
  },
  watchHeadingAsync: async (
    listener: (reading: {
      trueHeading: number;
      magHeading: number;
      accuracy: number;
    }) => void
  ) => {
    mockHeadingListeners.add(listener);
    listener({ trueHeading: 0, magHeading: 0, accuracy: 3 });
    return { remove: () => mockHeadingListeners.delete(listener) };
  }
}));

type Reading = { x: number; y: number; z: number };
type MobilePlatform = "ios" | "android";
type VolumeDirection = "up" | "down";

const accelerometerListeners: ((reading: Reading) => void)[] = [];
const motionPermission = { granted: true, canAskAgain: true };
const mockVolumeListeners = new Set<
  (event: { direction: VolumeDirection }) => void
>();

jest.mock("./volumeFireTrigger", () => ({
  subscribeVolumeFire: (
    listener: (event: { direction: VolumeDirection }) => void
  ) => {
    mockVolumeListeners.add(listener);
    return () => mockVolumeListeners.delete(listener);
  }
}));

jest.mock("expo-sensors", () => ({
  Accelerometer: {
    addListener: (listener: (reading: Reading) => void) => {
      accelerometerListeners.push(listener);
      return { remove: () => undefined };
    },
    setUpdateInterval: () => undefined,
    getPermissionsAsync: async () => motionPermission,
    requestPermissionsAsync: async () => motionPermission
  },
  DeviceMotion: {
    isAvailableAsync: async () => true,
    getPermissionsAsync: async () => motionPermission,
    requestPermissionsAsync: async () => motionPermission,
    setUpdateInterval: () => undefined,
    addListener: (
      listener: (reading: { rotation: { beta: number } | null }) => void
    ) => {
      mockPitchListeners.add(listener);
      listener({ rotation: { beta: 1 } });
      return { remove: () => mockPitchListeners.delete(listener) };
    }
  }
}));

jest.mock("expo-audio", () => ({
  setAudioModeAsync: async () => undefined,
  useAudioPlayer: () => ({ seekTo: () => undefined, play: () => undefined })
}));

jest.mock("expo-haptics", () => ({
  impactAsync: async () => undefined,
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning" }
}));

async function renderPreRound(
  role: DuelRole,
  options: {
    clockOffsetMs?: number;
    clockCalibrationStatus?: "calibrating" | "ready" | "failed";
  } = {},
  platform: MobilePlatform = "android"
) {
  Platform.OS = platform;
  const sent: DuelMessage[] = [];
  const shots: RoundShots[] = [];
  const retries = jest.fn();
  const handlers = new Set<(message: DuelMessage) => void>();

  const channel: DuelChannel = {
    send: (message) => {
      if (message.type !== "aimPosition") sent.push(message);
    },
    onMessage: (handler) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    isConnected: () => true
  };

  const view = await render(
    <PaperProvider theme={appTheme}>
      <PreRound
        channel={channel}
        calibration={{ thetaReady: 0, thetaShoulder: 1 }}
        selfPlayerId="host"
        opponentPlayerId="guest"
        clockCalibrationStatus={options.clockCalibrationStatus ?? "ready"}
        clockOffsetMs={options.clockOffsetMs ?? 0}
        onRetryClockCalibration={retries}
        onCountdownStart={() => undefined}
        onRoundShots={(round) => shots.push(round)}
        peerReady
        role={role}
      />
    </PaperProvider>
  );

  // Stands in for the opponent's device putting a message on the wire.
  const deliver = (message: DuelMessage) =>
    act(() => {
      handlers.forEach((handler) => handler(message));
    });

  const wait = (ms: number) =>
    act(() => {
      jest.advanceTimersByTime(ms);
      mockHeadingListeners.forEach((listener) =>
        listener({ trueHeading: 0, magHeading: 0, accuracy: 3 })
      );
      mockPitchListeners.forEach((listener) =>
        listener({ rotation: { beta: 1 } })
      );
    });
  const setReading = (reading: Reading) =>
    act(() => {
      accelerometerListeners.forEach((listener) => listener(reading));
    });
  const pressVolume = (direction: VolumeDirection, count = 1) =>
    act(() => {
      for (let index = 0; index < count; index += 1) {
        mockVolumeListeners.forEach((listener) => listener({ direction }));
      }
    });

  /** Walks the ritual to the point the countdown can start. */
  const completeRitual = async (reading: Reading = { x: 0, y: -1, z: 0 }) => {
    await deliver({
      type: "aimPosition",
      latitude: 0.001,
      longitude: 0,
      accuracy: 1,
      sampleAtMs: Date.now() + (options.clockOffsetMs ?? 0)
    });
    await fireEvent.press(view.getByText("CONFIRM"));

    await setReading(reading);
    await fireEvent.press(view.getByText("CONFIRM"));
  };

  return {
    completeRitual,
    deliver,
    pressVolume,
    retries,
    sent,
    setReading,
    shots,
    view,
    wait
  };
}

describe("PreRound countdown and draw", () => {
  beforeEach(() => {
    jest.mocked(Haptics.notificationAsync).mockClear();
    accelerometerListeners.length = 0;
    motionPermission.granted = true;
    motionPermission.canAskAgain = true;
    mockVolumeListeners.clear();
    mockHeadingListeners.clear();
    mockPitchListeners.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    ["ios", { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 }],
    ["android", { x: 0, y: -1, z: 0 }, { x: 0, y: 1, z: 0 }]
  ] as const)(
    "requires the top edge to point down on %s",
    async (platform, topEdgeDown, topEdgeUp) => {
      const { completeRitual, sent, setReading, view } = await renderPreRound(
        "host",
        {},
        platform
      );
      await completeRitual(topEdgeUp);

      expect(sent).toEqual([]);

      await setReading(topEdgeDown);
      await fireEvent.press(view.getByText("CONFIRM"));
      expect(sent).toEqual([{ type: "countdown", value: 3 }]);
    }
  );

  it("asks players to stand apart without claiming to have measured it", async () => {
    const { view } = await renderPreRound("guest");

    expect(view.getByText("STAND APART")).toBeTruthy();
    expect(view.queryByText(/dBm|signal|confirmed/i)).toBeNull();
    await fireEvent.press(view.getByText("CONFIRM"));
    expect(view.getByText("POINT THE TOP EDGE TOWARD THE GROUND")).toBeTruthy();
  });

  it("ticks 3-2-1 one second apart and fires exactly on zero", async () => {
    const { completeRitual, sent, view, wait } = await renderPreRound("host");
    await completeRitual();

    expect(sent).toEqual([{ type: "countdown", value: 3 }]);
    expect(view.getByText("3")).toBeTruthy();

    await wait(1000);
    expect(view.getByText("2")).toBeTruthy();

    await wait(1000);
    expect(view.getByText("1")).toBeTruthy();

    await wait(COUNTDOWN_DURATION_MS - 2000 - 1);
    expect(view.queryByText("FIRE!")).toBeNull();

    await wait(1);
    expect(view.getByText("FIRE!")).toBeTruthy();
    expect(sent).toEqual([
      { type: "countdown", value: 3 },
      { type: "countdown", value: 2 },
      { type: "countdown", value: 1 },
      { type: "fire", atMs: expect.any(Number) }
    ]);
  });

  it("times a guest reaction from the host FIRE timestamp in the local clock", async () => {
    const { completeRitual, deliver, view, wait } = await renderPreRound(
      "guest",
      { clockOffsetMs: 400 }
    );
    await completeRitual();
    const localNow = Date.now();

    // Host's clock is 400ms ahead; FIRE arrived 200ms after it was sent.
    await deliver({ type: "fire", atMs: localNow + 200 });
    await wait(400);
    await fireEvent.press(view.getByLabelText("Fire"));

    expect(view.getByText("600ms — waiting for your opponent")).toBeTruthy();
  });

  it("blocks timed play and offers a retry when clock calibration fails", async () => {
    const { retries, view } = await renderPreRound("guest", {
      clockCalibrationStatus: "failed"
    });

    expect(view.getByText("CLOCK CALIBRATION FAILED")).toBeTruthy();
    expect(view.queryByText("CONFIRM")).toBeNull();
    await fireEvent.press(view.getByText("RETRY CALIBRATION"));
    expect(retries).toHaveBeenCalledTimes(1);
  });

  it.each(["android", "ios"] as const)(
    "keeps tap-to-fire working on %s",
    async (platform) => {
      const { completeRitual, deliver, sent, shots, view, wait } =
        await renderPreRound("host", {}, platform);
      await completeRitual(
        platform === "ios" ? { x: 0, y: 1, z: 0 } : undefined
      );
      await wait(COUNTDOWN_DURATION_MS);
      expect(view.getByText("FIRE!")).toBeTruthy();
      await wait(400);
      await fireEvent.press(view.getByLabelText("Fire"));
      await deliver({
        type: "raised",
        atMs: 1,
        reactionMs: 900,
        zone: "bodyshot"
      });

      expect(shots).toEqual([
        {
          selfReactionMs: 400,
          opponentReactionMs: 900,
          selfZone: "bodyshot",
          opponentZone: "bodyshot",
          falseStartPlayer: null
        }
      ]);
      expect(sent.at(-1)).toMatchObject({ type: "raised", reactionMs: 400 });
    }
  );

  it.each([
    ["android", "up"],
    ["android", "down"],
    ["ios", "up"],
    ["ios", "down"]
  ] as const)(
    "captures one volume %s %s shot during FIRE",
    async (platform, direction) => {
      const { completeRitual, pressVolume, sent, shots, view, wait } =
        await renderPreRound("host", {}, platform);
      await pressVolume(direction);
      expect(sent).toEqual([]);

      await completeRitual(
        platform === "ios" ? { x: 0, y: 1, z: 0 } : undefined
      );

      await wait(COUNTDOWN_DURATION_MS);
      expect(view.getByText("FIRE!")).toBeTruthy();
      await wait(400);
      await pressVolume(direction, 2);
      expect(sent.filter((message) => message.type === "raised")).toEqual([
        {
          type: "raised",
          atMs: expect.any(Number),
          reactionMs: 400,
          zone: "bodyshot"
        }
      ]);

      await wait(10_000);
      await pressVolume(direction);
      expect(shots).toEqual([
        {
          selfReactionMs: 400,
          opponentReactionMs: null,
          selfZone: "bodyshot",
          opponentZone: "miss",
          falseStartPlayer: null
        }
      ]);
      expect(sent.filter((message) => message.type === "raised")).toHaveLength(
        1
      );
    }
  );

  it("snapshots live aim on volume fire and lets the slower opponent score after a miss", async () => {
    const { completeRitual, deliver, pressVolume, sent, shots, view, wait } =
      await renderPreRound("host");
    await completeRitual();
    await wait(COUNTDOWN_DURATION_MS);
    await wait(100);
    // Refresh compass after the countdown, facing away from the northern opponent.
    await act(() =>
      mockHeadingListeners.forEach((listener) =>
        listener({ trueHeading: 180, magHeading: 180, accuracy: 3 })
      )
    );
    await pressVolume("up");
    // Turning back cannot replace a shot already captured.
    await act(() =>
      mockHeadingListeners.forEach((listener) =>
        listener({ trueHeading: 0, magHeading: 0, accuracy: 3 })
      )
    );
    await fireEvent.press(view.getByLabelText("Fire"));
    await deliver({
      type: "raised",
      atMs: 1,
      reactionMs: 900,
      zone: "bodyshot"
    });

    expect(sent.filter((message) => message.type === "raised")).toEqual([
      {
        type: "raised",
        atMs: expect.any(Number),
        reactionMs: 100,
        zone: "miss"
      }
    ]);
    expect(
      judgeRoundShots(
        { id: "host", name: "Host" },
        { id: "guest", name: "Guest" },
        shots[0]
      )
    ).toMatchObject({
      kind: "win",
      winnerId: "guest",
      winnerPoints: 1,
      reactionMs: 100,
      opponentReactionMs: 900
    });
  });

  it.each([
    [1, "bodyshot"],
    [1.1, "headshot"],
    [0.4, "miss"]
  ] as const)(
    "captures the calibrated pitch zone at %s radians",
    async (theta, zone) => {
      const { completeRitual, deliver, shots, view, wait } =
        await renderPreRound("host");
      await completeRitual();
      await wait(COUNTDOWN_DURATION_MS + 200);
      await act(() =>
        mockPitchListeners.forEach((listener) =>
          listener({ rotation: { beta: theta } })
        )
      );
      await fireEvent.press(view.getByLabelText("Fire"));
      await deliver({
        type: "raised",
        atMs: 1,
        reactionMs: 250,
        zone: "bodyshot"
      });
      expect(shots[0]).toMatchObject({ selfReactionMs: 200, selfZone: zone });
      expect(
        judgeRoundShots(
          { id: "host", name: "Host" },
          { id: "guest", name: "Guest" },
          shots[0]
        )
      ).toMatchObject(
        zone === "bodyshot"
          ? {
              kind: "tie",
              pointsEach: 1,
              reactionMs: 200,
              opponentReactionMs: 250
            }
          : {
              kind: "win",
              winnerId: zone === "headshot" ? "host" : "guest",
              winnerPoints: zone === "headshot" ? 2 : 1
            }
      );
    }
  );

  it.each(["tap", "volume", "movement"] as const)(
    "warns on the first early %s, then disqualifies the second",
    async (input) => {
      const {
        completeRitual,
        deliver,
        pressVolume,
        setReading,
        shots,
        view,
        wait
      } = await renderPreRound("host");
      await completeRitual();
      await wait(500);
      if (input === "tap") await fireEvent.press(view.getByLabelText("Fire"));
      else if (input === "volume") await pressVolume("up");
      else await setReading({ x: 1, y: -1, z: 0 });
      expect(
        view.getByText(/moved early. Warning 1 of 1. Restarting round/)
      ).toBeTruthy();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith("warning");
      expect(shots).toHaveLength(0);
      await wait(1200);
      expect(view.getByText("3")).toBeTruthy();
      await fireEvent.press(view.getByLabelText("Fire"));
      await wait(COUNTDOWN_DURATION_MS);
      await wait(200);
      await fireEvent.press(view.getByLabelText("Fire"));
      await deliver({
        type: "raised",
        atMs: 1,
        reactionMs: 350,
        zone: "headshot"
      });
      await wait(10_000);
      expect(
        judgeRoundShots(
          { id: "host", name: "Host" },
          { id: "guest", name: "Guest" },
          shots[0]
        )
      ).toEqual({
        kind: "falseStart",
        playerId: "host",
        nonOffenderId: "guest",
        nonOffenderShot: { reactionMs: 350, zone: "headshot", points: 2 }
      });
      expect(shots[0].selfReactionMs).toBeNull();
    }
  );

  it("shows a peer warning, follows the restarted countdown, and does not record a round", async () => {
    const { completeRitual, deliver, shots, view } =
      await renderPreRound("guest");
    await completeRitual();
    await deliver({ type: "countdown", value: 3 });
    await deliver({
      type: "falseStart",
      atMs: Date.now(),
      attempt: 0,
      count: 1
    });
    expect(
      view.getByText(/Opponent moved early. Warning 1 of 1. Restarting round/)
    ).toBeTruthy();
    expect(Haptics.notificationAsync).not.toHaveBeenCalledWith("warning");
    await deliver({ type: "countdown", value: 2 });
    expect(view.getByText("WARNING")).toBeTruthy();
    await deliver({ type: "countdown", value: 3, attempt: 1 });
    expect(view.getByText("3")).toBeTruthy();
    expect(shots).toHaveLength(0);
  });

  it("does not fire the abandoned countdown after a last-second warning", async () => {
    const { completeRitual, sent, shots, view, wait } =
      await renderPreRound("host");
    await completeRitual();
    await wait(COUNTDOWN_DURATION_MS - 100);
    await fireEvent.press(view.getByLabelText("Fire"));
    await wait(100);
    expect(view.getByText("WARNING")).toBeTruthy();
    expect(sent.filter((message) => message.type === "fire")).toHaveLength(0);
    expect(shots).toHaveLength(0);
    await wait(1100);
    expect(view.getByText("3")).toBeTruthy();
    await wait(COUNTDOWN_DURATION_MS);
    expect(view.getByText("FIRE!")).toBeTruthy();
    expect(sent.filter((message) => message.type === "fire")).toHaveLength(1);
  });

  it("scores a local headshot after the peer false-starts", async () => {
    const { completeRitual, deliver, shots, view, wait } =
      await renderPreRound("host");
    await completeRitual();
    await deliver({ type: "falseStart", atMs: Date.now() });
    await wait(COUNTDOWN_DURATION_MS + 200);
    await act(() =>
      mockPitchListeners.forEach((listener) =>
        listener({ rotation: { beta: 1.1 } })
      )
    );
    await fireEvent.press(view.getByLabelText("Fire"));
    await wait(10_000);
    expect(
      judgeRoundShots(
        { id: "host", name: "Host" },
        { id: "guest", name: "Guest" },
        shots[0]
      )
    ).toEqual({
      kind: "falseStart",
      playerId: "guest",
      nonOffenderId: "host",
      nonOffenderShot: { reactionMs: 200, zone: "headshot", points: 2 }
    });
  });

  it("scores a player who never fires as no shot at all", async () => {
    const { completeRitual, shots, view, wait } = await renderPreRound("host");
    await completeRitual();
    await wait(COUNTDOWN_DURATION_MS);

    expect(view.getByText("FIRE!")).toBeTruthy();
    await wait(10_000);

    expect(shots).toEqual([
      {
        selfReactionMs: null,
        opponentReactionMs: null,
        selfZone: "miss",
        opponentZone: "miss",
        falseStartPlayer: null
      }
    ]);
  });

  it("follows the host's countdown as a guest without starting one", async () => {
    const { completeRitual, deliver, sent, view } =
      await renderPreRound("guest");
    await completeRitual();

    // The guest announces readiness and waits — it never drives the countdown.
    expect(sent).toEqual([{ type: "ready" }]);

    await deliver({ type: "countdown", value: 3 });
    expect(view.getByText("3")).toBeTruthy();

    await deliver({ type: "fire", atMs: Date.now() });
    expect(view.getByText("FIRE!")).toBeTruthy();
  });

  it("explains the block and offers a way back when motion access is refused", async () => {
    motionPermission.granted = false;
    motionPermission.canAskAgain = false;

    const { view } = await renderPreRound("host");

    // Without motion the tilt check can never pass, so CONFIRM would sit
    // disabled forever — the player must be told why and given a route out.
    expect(view.queryByText("CONFIRM")).toBeNull();
    expect(view.getByText(/Motion access needed/i)).toBeTruthy();
    expect(view.getByText(/reads the phone's tilt/i)).toBeTruthy();
    expect(view.getByText("Open Settings")).toBeTruthy();
    expect(accelerometerListeners).toHaveLength(0);
  });

  it("starts watching tilt once motion access is granted on retry", async () => {
    motionPermission.granted = false;
    motionPermission.canAskAgain = false;

    const { view } = await renderPreRound("host");
    expect(accelerometerListeners).toHaveLength(0);

    motionPermission.granted = true;
    await act(async () => {
      fireEvent.press(view.getByText("Check Again"));
    });

    expect(accelerometerListeners).toHaveLength(1);
    expect(view.getByText("CONFIRM")).toBeTruthy();
  });
});
