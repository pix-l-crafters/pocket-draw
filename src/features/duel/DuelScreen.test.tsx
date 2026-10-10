import { act, fireEvent, render } from "@testing-library/react-native";
import { Platform } from "react-native";
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
const mockAccelerometerListeners = new Set<(reading: Reading) => void>();
let mockNowMs = 10_000;
let mockMotionAvailable = true;
let mockMotionGranted = true;

jest.mock("../backend/matchAnalytics", () => ({
  submitMatchAnalytics: jest.fn(async () => "written"),
  subscribeAnalyticsStatus: jest.fn(() => () => undefined)
}));

jest.mock("../backend/matchResultsService", () => ({
  subscribeMatchResultStatus: jest.fn(() => () => undefined),
  submitMatchResult: jest.fn()
}));

jest.mock("expo-sensors", () => ({
  Accelerometer: {
    isAvailableAsync: async () => true,
    addListener: (listener: (reading: Reading) => void) => {
      accelerometerListeners.push(listener);
      mockAccelerometerListeners.add(listener);
      return { remove: () => mockAccelerometerListeners.delete(listener) };
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

jest.mock("./volumeFireTrigger", () => ({
  subscribeVolumeFire: () => () => undefined
}));

describe("DuelScreen clock calibration", () => {
  beforeEach(() => {
    Platform.OS = "ios";
    mockNowMs = 10_000;
    jest.spyOn(Date, "now").mockImplementation(() => mockNowMs);
    accelerometerListeners.length = 0;
    mockAccelerometerListeners.clear();
    mockPitchListeners.clear();
    mockMotionAvailable = true;
    mockMotionGranted = true;
  });

  afterEach(() => jest.restoreAllMocks());

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
    expect(view.queryByText("STAND APART")).toBeNull();
    await fireEvent.press(view.getByText("Start calibration"));
    for (let index = 0; index <= 20; index += 1) {
      await act(() => {
        mockPitchListeners.forEach((listener) =>
          listener({ rotation: { beta: 0 } })
        );
        mockAccelerometerListeners.forEach((listener) =>
          listener({ x: 0, y: 0.9, z: 0 })
        );
        mockNowMs += 100;
      });
    }
    expect(view.queryByText("STAND APART")).toBeNull();
    expect(view.queryByText("Continue")).toBeNull();
    for (let index = 0; index <= 20; index += 1) {
      await act(() => {
        mockPitchListeners.forEach((listener) =>
          listener({ rotation: { beta: 1 } })
        );
        mockAccelerometerListeners.forEach((listener) =>
          listener({ x: 0, y: 0, z: 0.95 })
        );
        mockNowMs += 100;
      });
    }
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
