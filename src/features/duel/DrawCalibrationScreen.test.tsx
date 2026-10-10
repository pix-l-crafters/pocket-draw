import { act, fireEvent, render } from "@testing-library/react-native";
import { AppState, Linking, type AppStateStatus } from "react-native";
import { PaperProvider } from "react-native-paper";

import { appTheme } from "../../theme/appTheme";
import { DrawCalibrationScreen } from "./DrawCalibrationScreen";

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

const mockMotionListeners = new Set<(reading: MotionReading) => void>();
const initialAppState = AppState.currentState;
const mockImpact = jest.fn(async (_style: string) => undefined);
const mockSuccess = jest.fn(async (_type: string) => undefined);
const mockPlay = jest.fn();
const mockSeek = jest.fn(async (): Promise<void> => undefined);
let mockAvailable = true;
let mockGranted = true;
let mockStartupError = false;
let mockPermissionWait: Promise<void> | null = null;

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Heavy: "heavy", Light: "light" },
  NotificationFeedbackType: { Success: "success" },
  impactAsync: (style: string) => mockImpact(style),
  notificationAsync: (type: string) => mockSuccess(type)
}));

jest.mock("expo-audio", () => ({
  setAudioModeAsync: async () => undefined,
  useAudioPlayer: () => ({ seekTo: mockSeek, play: mockPlay })
}));

jest.mock("expo-sensors", () => ({
  DeviceMotion: {
    isAvailableAsync: async () => {
      if (mockStartupError) throw new Error("Motion service failed");
      return mockAvailable;
    },
    getPermissionsAsync: async () => {
      await mockPermissionWait;
      return {
        granted: mockGranted,
        status: mockGranted ? "granted" : "denied",
        canAskAgain: false,
        expires: "never"
      };
    },
    requestPermissionsAsync: async () => ({
      granted: mockGranted,
      status: mockGranted ? "granted" : "denied",
      canAskAgain: false,
      expires: "never"
    }),
    setUpdateInterval: () => undefined,
    addListener: (listener: (reading: MotionReading) => void) => {
      mockMotionListeners.add(listener);
      return { remove: () => mockMotionListeners.delete(listener) };
    }
  }
}));

function setPitch(beta: number | null) {
  return act(() => {
    const reading: MotionReading = {
      acceleration: null,
      accelerationIncludingGravity: { x: 0, y: 0, z: 9.80665, timestamp: 10 },
      interval: 20,
      orientation: 0,
      rotation:
        beta === null ? null : { alpha: 0, beta, gamma: 0, timestamp: 10 },
      rotationRate: null
    };
    mockMotionListeners.forEach((listener) => listener(reading));
  });
}

async function renderCalibration() {
  const onComplete = jest.fn();
  const view = await render(
    <PaperProvider theme={appTheme}>
      <DrawCalibrationScreen onComplete={onComplete} />
    </PaperProvider>
  );
  return { view, onComplete };
}

describe("DrawCalibrationScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(10_000);
    mockMotionListeners.clear();
    mockAvailable = true;
    mockGranted = true;
    mockStartupError = false;
    mockPermissionWait = null;
    AppState.currentState = "active";
    mockImpact.mockClear();
    mockSuccess.mockClear();
    mockPlay.mockClear();
    mockSeek.mockReset();
    mockSeek.mockResolvedValue(undefined);
  });

  afterEach(() => {
    AppState.currentState = initialAppState;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("requires explicit, distinct ready and shoulder captures before continuing", async () => {
    const { view, onComplete } = await renderCalibration();
    expect(view.queryByText("Continue")).toBeNull();
    await fireEvent.press(view.getByText("Start calibration"));
    await setPitch(0.2);
    expect(view.getByText("Capture ready pose")).toBeTruthy();
    expect(view.queryByText("Continue")).toBeNull();

    await fireEvent.press(view.getByText("Capture ready pose"));
    await setPitch(1.2);
    expect(view.getByText("Capture shoulder pose")).toBeTruthy();
    expect(view.queryByText("Continue")).toBeNull();
    await fireEvent.press(view.getByText("Capture shoulder pose"));

    expect(view.getByText("Calibration passed")).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
    await fireEvent.press(view.getByText("Continue"));
    expect(onComplete).toHaveBeenCalledWith({
      thetaReady: 0.2,
      thetaShoulder: 1.2
    });
    expect(mockMotionListeners.size).toBe(0);
  });

  it("increases shoulder proximity pulses and confirms only accepted captures", async () => {
    const { view } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    await setPitch(0.2);
    expect(mockImpact).not.toHaveBeenCalled();

    await fireEvent.press(view.getByText("Capture ready pose"));
    expect(mockSuccess).toHaveBeenCalledTimes(1);
    expect(mockPlay).toHaveBeenCalledTimes(1);

    await setPitch(0.2);
    await act(() => jest.advanceTimersByTime(300));
    const farCount = mockImpact.mock.calls.length;
    expect(farCount).toBeGreaterThan(1);

    await setPitch(0.23);
    await act(() => jest.advanceTimersByTime(300));
    const approachingCount = mockImpact.mock.calls.length - farCount;
    await setPitch(0.245);
    await act(() => jest.advanceTimersByTime(300));
    const nearCount =
      mockImpact.mock.calls.length - farCount - approachingCount;
    expect(nearCount).toBeGreaterThan(approachingCount);

    await fireEvent.press(view.getByText("Capture shoulder pose"));
    expect(view.getByText(/The poses are too similar/)).toBeTruthy();
    expect(mockSuccess).toHaveBeenCalledTimes(1);
    expect(mockPlay).toHaveBeenCalledTimes(1);

    await setPitch(0.3);
    await fireEvent.press(view.getByText("Capture shoulder pose"));
    expect(mockSuccess).toHaveBeenCalledTimes(2);
    expect(mockPlay).toHaveBeenCalledTimes(2);
    const countAtPass = mockImpact.mock.calls.length;
    await act(() => jest.advanceTimersByTime(1_000));
    expect(mockImpact).toHaveBeenCalledTimes(countAtPass);
    await view.unmount();
    expect(mockMotionListeners.size).toBe(0);
  });

  it("stops proximity feedback while the app is backgrounded", async () => {
    const appStateListeners: ((state: AppStateStatus) => void)[] = [];
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, listener) => {
        appStateListeners.push(listener);
        return { remove: () => undefined };
      });
    const { view } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    await setPitch(0.2);
    await fireEvent.press(view.getByText("Capture ready pose"));
    await setPitch(0.2);
    expect(mockImpact).toHaveBeenCalled();

    await act(() =>
      appStateListeners.forEach((listener) => listener("background"))
    );
    const countAtPause = mockImpact.mock.calls.length;
    await setPitch(0.22);
    await act(() => jest.advanceTimersByTime(1_000));
    expect(mockImpact).toHaveBeenCalledTimes(countAtPause);
    await view.unmount();
  });

  it("allows calibration to finish when confirmation audio fails", async () => {
    mockSeek.mockRejectedValue(new Error("audio unavailable"));
    const { view, onComplete } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    await setPitch(0.2);
    await fireEvent.press(view.getByText("Capture ready pose"));
    await setPitch(0.3);
    await fireEvent.press(view.getByText("Capture shoulder pose"));
    await fireEvent.press(view.getByText("Continue"));

    expect(onComplete).toHaveBeenCalledWith({
      thetaReady: 0.2,
      thetaShoulder: 0.3
    });
    expect(mockSuccess).toHaveBeenCalledTimes(2);
  });

  it("starts the confirmation sound without waiting for an audio seek", async () => {
    mockSeek.mockImplementation(() => new Promise<void>(() => undefined));
    const { view } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    await setPitch(0.2);
    await fireEvent.press(view.getByText("Capture ready pose"));

    expect(mockPlay).toHaveBeenCalledTimes(1);
    await view.unmount();
  });

  it("does not start proximity feedback when opened in the background", async () => {
    const originalState = AppState.currentState;
    AppState.currentState = "background";
    try {
      const { view } = await renderCalibration();
      await fireEvent.press(view.getByText("Start calibration"));
      await setPitch(0.2);
      await fireEvent.press(view.getByText("Capture ready pose"));
      await setPitch(0.2);
      await act(() => jest.advanceTimersByTime(500));

      expect(mockImpact).not.toHaveBeenCalled();
      await view.unmount();
    } finally {
      AppState.currentState = originalState;
    }
  });

  it.each([
    null,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY
  ])("does not capture a missing or invalid pitch (%s)", async (pitch) => {
    const { view, onComplete } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    await setPitch(pitch);
    await fireEvent.press(view.getByText("Capture ready pose"));

    expect(view.getByText("Capture ready pose")).toBeTruthy();
    expect(view.getByText(/No fresh pitch reading/)).toBeTruthy();
    expect(view.queryByText("Continue")).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();

    await setPitch(0);
    await fireEvent.press(view.getByText("Capture ready pose"));
    expect(view.getByText("Capture shoulder pose")).toBeTruthy();
  });

  it.each([0.2, 0.21, 0.19])(
    "rejects a same or near-zero calibrated arc (%s)",
    async (pitch) => {
      const { view, onComplete } = await renderCalibration();
      await fireEvent.press(view.getByText("Start calibration"));
      await setPitch(0.2);
      await fireEvent.press(view.getByText("Capture ready pose"));
      await setPitch(pitch);
      await fireEvent.press(view.getByText("Capture shoulder pose"));

      expect(view.getByText(/The poses are too similar/)).toBeTruthy();
      expect(view.getByText("Capture shoulder pose")).toBeTruthy();
      expect(view.queryByText("Continue")).toBeNull();
      expect(onComplete).not.toHaveBeenCalled();

      await setPitch(-0.8);
      await fireEvent.press(view.getByText("Capture shoulder pose"));
      await fireEvent.press(view.getByText("Continue"));
      expect(onComplete).toHaveBeenCalledWith({
        thetaReady: 0.2,
        thetaShoulder: -0.8
      });
    }
  );

  it("does not reuse the ready reading when shoulder motion is missing", async () => {
    const { view, onComplete } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    await setPitch(0.2);
    await fireEvent.press(view.getByText("Capture ready pose"));
    await setPitch(null);
    await fireEvent.press(view.getByText("Capture shoulder pose"));

    expect(view.getByText(/No fresh pitch reading/)).toBeTruthy();
    expect(view.getByText("Capture shoulder pose")).toBeTruthy();
    expect(view.queryByText("Continue")).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();

    await setPitch(1.2);
    await fireEvent.press(view.getByText("Capture shoulder pose"));
    await fireEvent.press(view.getByText("Continue"));
    expect(onComplete).toHaveBeenCalledWith({
      thetaReady: 0.2,
      thetaShoulder: 1.2
    });
  });

  it("refuses a stale pitch and lets the player capture a fresh sample", async () => {
    const { view } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    await setPitch(0.2);
    await act(() => jest.advanceTimersByTime(2_001));
    await fireEvent.press(view.getByText("Capture ready pose"));
    expect(view.getByText("Capture ready pose")).toBeTruthy();
    expect(view.getByText(/No fresh pitch reading/)).toBeTruthy();

    await setPitch(0.2);
    await fireEvent.press(view.getByText("Capture ready pose"));
    expect(view.getByText("Capture shoulder pose")).toBeTruthy();
  });

  it("recovers denied motion permission through Settings and Check Again", async () => {
    mockGranted = false;
    const openSettings = jest
      .spyOn(Linking, "openSettings")
      .mockResolvedValue(undefined);
    const { view } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    expect(view.getByText("Motion access needed")).toBeTruthy();
    expect(view.queryByText("Continue")).toBeNull();
    await fireEvent.press(view.getByText("Open Settings"));
    expect(openSettings).toHaveBeenCalledTimes(1);

    mockGranted = true;
    await fireEvent.press(view.getByText("Check Again"));
    expect(view.getByText("Capture ready pose")).toBeTruthy();
  });

  it("rechecks denied motion permission when returning from Settings", async () => {
    let foreground: ((state: AppStateStatus) => void) | undefined;
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, listener) => {
        foreground = listener;
        return { remove: () => undefined };
      });
    mockGranted = false;
    const { view } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    expect(view.getByText("Motion access needed")).toBeTruthy();

    mockGranted = true;
    await act(() => foreground?.("active"));
    expect(view.getByText("Capture ready pose")).toBeTruthy();
  });

  it.each(["unavailable", "error"])(
    "lets the player retry a motion startup %s",
    async (failure) => {
      mockAvailable = failure !== "unavailable";
      mockStartupError = failure === "error";
      const { view } = await renderCalibration();
      await fireEvent.press(view.getByText("Start calibration"));
      expect(view.getByText("Retry")).toBeTruthy();
      expect(view.queryByText("Continue")).toBeNull();

      mockAvailable = true;
      mockStartupError = false;
      await fireEvent.press(view.getByText("Retry"));
      expect(view.getByText("Capture ready pose")).toBeTruthy();
    }
  );

  it("does not subscribe if unmounted while motion permission is pending", async () => {
    let resolvePermission!: () => void;
    mockPermissionWait = new Promise<void>((resolve) => {
      resolvePermission = resolve;
    });
    const { view, onComplete } = await renderCalibration();
    let pendingStart!: Promise<void>;
    await act(() => {
      pendingStart = fireEvent.press(view.getByText("Start calibration"));
    });
    await view.unmount();
    await act(async () => {
      resolvePermission();
      await pendingStart;
    });

    expect(mockMotionListeners.size).toBe(0);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
