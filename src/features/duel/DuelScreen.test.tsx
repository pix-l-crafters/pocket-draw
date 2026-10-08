import { act, fireEvent, render } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";

import { createMockDuelChannelPair } from "../../contracts/mocks/mockDuelChannel";
import { appTheme } from "../../theme/appTheme";
import { createDuelLink } from "../challenge/session/duelLink";
import { ClockOffsetCalibrator } from "./clockOffsetCalibrator";
import { DuelScreen } from "./DuelScreen";

type Reading = { x: number; y: number; z: number };

const accelerometerListeners: ((reading: Reading) => void)[] = [];
const mockPitchListeners = new Set<
  (reading: { rotation: { beta: number } }) => void
>();
let mockMotionAvailable = true;
let mockMotionGranted = true;

jest.mock("../backend/matchResultsService", () => ({
  subscribeMatchResultStatus: jest.fn(() => () => undefined),
  submitMatchResult: jest.fn()
}));

jest.mock("expo-sensors", () => ({
  Accelerometer: {
    isAvailableAsync: async () => true,
    addListener: (listener: (reading: Reading) => void) => {
      accelerometerListeners.push(listener);
      return { remove: () => undefined };
    },
    setUpdateInterval: () => undefined,
    getPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
    requestPermissionsAsync: async () => ({ granted: true, canAskAgain: true })
  },
  DeviceMotion: {
    isAvailableAsync: async () => mockMotionAvailable,
    getPermissionsAsync: async () => ({
      granted: mockMotionGranted,
      status: mockMotionGranted ? "granted" : "denied",
      canAskAgain: false,
      expires: "never"
    }),
    requestPermissionsAsync: async () => ({
      granted: mockMotionGranted,
      status: mockMotionGranted ? "granted" : "denied",
      canAskAgain: false,
      expires: "never"
    }),
    setUpdateInterval: () => undefined,
    addListener: (
      listener: (reading: { rotation: { beta: number } }) => void
    ) => {
      mockPitchListeners.add(listener);
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
  notificationAsync: async () => undefined,
  ImpactFeedbackStyle: { Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success" }
}));

describe("DuelScreen clock calibration", () => {
  beforeEach(() => {
    accelerometerListeners.length = 0;
    mockPitchListeners.clear();
    mockMotionAvailable = true;
    mockMotionGranted = true;
  });

  it("calibrates before enabling play and disposes its channel listener with the session", async () => {
    const [duelChannel, peerChannel] = createMockDuelChannelPair();
    const peer = new ClockOffsetCalibrator(peerChannel, () => Date.now() + 400);
    const link = createDuelLink({
      connection: {
        channel: duelChannel,
        onDrop: () => undefined,
        disconnect: () => undefined
      },
      reconnect: () => Promise.reject(new Error("unused"))
    });
    const view = await render(
      <PaperProvider theme={appTheme}>
        <DuelScreen
          link={link}
          matchId="match"
          onExit={() => undefined}
          opponent={{ id: "host", name: "Host" }}
          role="guest"
          self={{ id: "guest", name: "Guest" }}
        />
      </PaperProvider>
    );

    expect(view.getByText("Exit")).toBeTruthy();
    await fireEvent.press(view.getByText("I'm Ready"));
    expect(view.queryByText("STAND APART")).toBeNull();
    await fireEvent.press(view.getByText("Start calibration"));
    await act(() => {
      mockPitchListeners.forEach((listener) =>
        listener({ rotation: { beta: 0 } })
      );
    });
    await fireEvent.press(view.getByText("Capture ready pose"));
    expect(view.queryByText("STAND APART")).toBeNull();
    expect(view.queryByText("Continue")).toBeNull();
    await act(() => {
      mockPitchListeners.forEach((listener) =>
        listener({ rotation: { beta: 1 } })
      );
    });
    await fireEvent.press(view.getByText("Capture shoulder pose"));
    expect(view.queryByText("STAND APART")).toBeNull();
    await fireEvent.press(view.getByText("Continue"));
    expect(view.getByText("STAND APART")).toBeTruthy();
    expect(view.queryByText("CALIBRATING CLOCKS")).toBeNull();
    expect(view.getByText("Exit")).toBeTruthy();

    await view.unmount();
    let pongReceived = false;
    peerChannel.onMessage((message) => {
      if (message.type === "clockPong") pongReceived = true;
    });
    peerChannel.send({ type: "clockPing", t0: Date.now() });
    expect(pongReceived).toBe(false);
    peer.dispose();
  });

  it.each([
    {
      failure: "unavailable",
      available: false,
      granted: true,
      recoveryActions: ["Retry"]
    },
    {
      failure: "denied",
      available: true,
      granted: false,
      recoveryActions: ["Open Settings", "Check Again"]
    }
  ])(
    "lets the player leave the live session when device motion is $failure",
    async ({ available, granted, recoveryActions }) => {
      mockMotionAvailable = available;
      mockMotionGranted = granted;
      const [duelChannel, peerChannel] = createMockDuelChannelPair();
      const peer = new ClockOffsetCalibrator(peerChannel);
      const link = createDuelLink({
        connection: {
          channel: duelChannel,
          onDrop: () => undefined,
          disconnect: () => undefined
        },
        reconnect: () => Promise.reject(new Error("unused"))
      });
      const onExit = jest.fn();
      const view = await render(
        <PaperProvider theme={appTheme}>
          <DuelScreen
            link={link}
            matchId="match"
            onExit={onExit}
            opponent={{ id: "host", name: "Host" }}
            role="guest"
            self={{ id: "guest", name: "Guest" }}
          />
        </PaperProvider>
      );

      await fireEvent.press(view.getByText("I'm Ready"));
      await fireEvent.press(view.getByText("Start calibration"));
      for (const action of recoveryActions) {
        expect(view.getByText(action)).toBeTruthy();
      }
      expect(view.queryByText("STAND APART")).toBeNull();
      expect(link.status()).toBe("live");
      expect(onExit).not.toHaveBeenCalled();

      await fireEvent.press(view.getByText("Exit"));
      expect(link.status()).toBe("closed");
      expect(link.channel.isConnected()).toBe(false);
      expect(onExit).toHaveBeenCalledTimes(1);
      await view.unmount();
      peer.dispose();
    }
  );
});
