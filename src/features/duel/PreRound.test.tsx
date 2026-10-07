// Guards the two things that were broken end to end: the countdown is a fixed
// three seconds (it used to start after a random 1-3s delay), and FIRE arrives
// when it hits zero (the guest used to jump straight to the draw, and the host
// never got there at all).

import { act, fireEvent, render } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";

import type { DuelChannel, DuelMessage } from "../../contracts/duelChannel";
import { appTheme } from "../../theme/appTheme";
import type { DuelRole } from "./fireSignalCoordinator";
import { COUNTDOWN_DURATION_MS, PreRound } from "./PreRound";
import type { RoundShots } from "./roundShots";

type Reading = { x: number; y: number; z: number };

const accelerometerListeners: ((reading: Reading) => void)[] = [];

jest.mock("expo-sensors", () => ({
  Accelerometer: {
    addListener: (listener: (reading: Reading) => void) => {
      accelerometerListeners.push(listener);
      return { remove: () => undefined };
    },
    setUpdateInterval: () => undefined
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
  } = {}
) {
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

  /** Walks the ritual to the point the countdown can start. */
  const completeRitual = async () => {
    // The separation reading resolves on a microtask.
    await act(async () => undefined);
    await fireEvent.press(view.getByText("CONFIRM"));

    await act(() => {
      accelerometerListeners.forEach((listener) =>
        listener({ x: 0, y: 0, z: -1 })
      );
    });
    await fireEvent.press(view.getByText("CONFIRM"));
  };

  return { completeRitual, deliver, retries, sent, shots, view, wait };
}

describe("PreRound countdown and draw", () => {
  beforeEach(() => {
    accelerometerListeners.length = 0;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
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
});
