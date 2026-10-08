// Guards cross-platform phone positioning and the fixed countdown-to-FIRE flow.

import { act, fireEvent, render } from "@testing-library/react-native";
import { Platform } from "react-native";
import { PaperProvider } from "react-native-paper";

import type { DuelChannel, DuelMessage } from "../../contracts/duelChannel";
import { appTheme } from "../../theme/appTheme";
import type { DuelRole } from "./fireSignalCoordinator";
import { COUNTDOWN_DURATION_MS, PreRound } from "./PreRound";
import type { RoundShots } from "./roundShots";

type Reading = { x: number; y: number; z: number };
type MobilePlatform = "ios" | "android";

const accelerometerListeners: ((reading: Reading) => void)[] = [];
const motionPermission = { granted: true, canAskAgain: true };

jest.mock("expo-sensors", () => ({
  Accelerometer: {
    addListener: (listener: (reading: Reading) => void) => {
      accelerometerListeners.push(listener);
      return { remove: () => undefined };
    },
    setUpdateInterval: () => undefined,
    getPermissionsAsync: async () => motionPermission,
    requestPermissionsAsync: async () => motionPermission
  }
}));

jest.mock("expo-audio", () => ({
  setAudioModeAsync: async () => undefined,
  useAudioPlayer: () => ({ seekTo: () => undefined, play: () => undefined })
}));

jest.mock("expo-haptics", () => ({
  impactAsync: async () => undefined,
  notificationAsync: async () => undefined,
  ImpactFeedbackStyle: { Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success" }
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
    send: (message) => sent.push(message),
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
        clockCalibrationStatus={options.clockCalibrationStatus ?? "ready"}
        clockOffsetMs={options.clockOffsetMs ?? 0}
        onRetryClockCalibration={retries}
        onCountdownStart={() => undefined}
        onRoundShots={(round) => shots.push(round)}
        peerReady
        readRssi={async () => -80}
        role={role}
      />
    </PaperProvider>
  );

  // Stands in for the opponent's device putting a message on the wire.
  const deliver = (message: DuelMessage) =>
    act(() => {
      handlers.forEach((handler) => handler(message));
    });

  const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms));
  const setReading = (reading: Reading) =>
    act(() => {
      accelerometerListeners.forEach((listener) => listener(reading));
    });

  /** Walks the ritual to the point the countdown can start. */
  const completeRitual = async (reading: Reading = { x: 0, y: -1, z: 0 }) => {
    // The separation reading resolves on a microtask.
    await act(async () => undefined);
    await fireEvent.press(view.getByText("CONFIRM"));

    await setReading(reading);
    await fireEvent.press(view.getByText("CONFIRM"));
  };

  return {
    completeRitual,
    deliver,
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
    accelerometerListeners.length = 0;
    motionPermission.granted = true;
    motionPermission.canAskAgain = true;
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

  it("reports both reaction times once each player has fired", async () => {
    const { completeRitual, deliver, sent, shots, view, wait } =
      await renderPreRound("host");
    await completeRitual();
    await wait(COUNTDOWN_DURATION_MS);

    await wait(400);
    await fireEvent.press(view.getByLabelText("Fire"));
    await deliver({ type: "raised", atMs: 1, reactionMs: 900 });

    expect(shots).toEqual([{ selfReactionMs: 400, opponentReactionMs: 900 }]);
    expect(sent.at(-1)).toMatchObject({ type: "raised", reactionMs: 400 });
  });

  it("scores a player who never fires as no shot at all", async () => {
    const { completeRitual, shots, view, wait } = await renderPreRound("host");
    await completeRitual();
    await wait(COUNTDOWN_DURATION_MS);

    expect(view.getByText("FIRE!")).toBeTruthy();
    await wait(10_000);

    expect(shots).toEqual([{ selfReactionMs: null, opponentReactionMs: null }]);
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
