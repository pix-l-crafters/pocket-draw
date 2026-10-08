import { render } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";

import { createMockDuelChannelPair } from "../../contracts/mocks/mockDuelChannel";
import { appTheme } from "../../theme/appTheme";
import { ClockOffsetCalibrator } from "./clockOffsetCalibrator";
import { DuelScreen } from "./DuelScreen";

type Reading = { x: number; y: number; z: number };

const accelerometerListeners: ((reading: Reading) => void)[] = [];

jest.mock("../backend/matchResultsService", () => ({
  submitMatchResult: jest.fn()
}));

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

describe("DuelScreen clock calibration", () => {
  beforeEach(() => {
    accelerometerListeners.length = 0;
  });

  it("calibrates before enabling play and disposes its channel listener with the session", async () => {
    const [duelChannel, peerChannel] = createMockDuelChannelPair();
    const peer = new ClockOffsetCalibrator(peerChannel, () => Date.now() + 400);
    const view = await render(
      <PaperProvider theme={appTheme}>
        <DuelScreen
          channel={duelChannel}
          matchId="match"
          opponent={{ id: "host", name: "Host" }}
          role="guest"
          self={{ id: "guest", name: "Guest" }}
        />
      </PaperProvider>
    );

    expect(view.getByText("DISTANCE CONFIRMED")).toBeTruthy();
    expect(view.queryByText("CALIBRATING CLOCKS")).toBeNull();

    await view.unmount();
    let pongReceived = false;
    peerChannel.onMessage((message) => {
      if (message.type === "clockPong") pongReceived = true;
    });
    peerChannel.send({ type: "clockPing", t0: Date.now() });
    expect(pongReceived).toBe(false);
    peer.dispose();
  });
});
