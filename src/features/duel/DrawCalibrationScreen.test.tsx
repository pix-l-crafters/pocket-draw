import { act, fireEvent, render, within } from "@testing-library/react-native";
import { AppState, type AppStateStatus, Linking } from "react-native";
import { PaperProvider } from "react-native-paper";

import { appTheme } from "../../theme/appTheme";
import { DrawCalibrationScreen } from "./DrawCalibrationScreen";

const mockMotionListeners = new Set<
  (reading: { rotation: { beta: number } }) => void
>();
const mockTiltListeners = new Set<
  (reading: { x: number; y: number; z: number }) => void
>();
const mockVolumeListeners = new Set<
  (event: { direction: "up" | "down" }) => void
>();
const mockImpact = jest.fn(async (_style: string) => undefined);
const mockSuccess = jest.fn(async (_type: string) => undefined);
const mockPlay = jest.fn();
const mockSeek = jest.fn(async (): Promise<void> => undefined);
const initialAppState = AppState.currentState;
let mockGranted = true;
let mockAvailable = true;

jest.mock("./volumeFireTrigger", () => ({
  subscribeVolumeFire: (
    listener: (event: { direction: "up" | "down" }) => void
  ) => {
    mockVolumeListeners.add(listener);
    return () => mockVolumeListeners.delete(listener);
  }
}));

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
    isAvailableAsync: async () => mockAvailable,
    getPermissionsAsync: async () => ({
      granted: mockGranted,
      canAskAgain: false
    }),
    requestPermissionsAsync: async () => ({
      granted: mockGranted,
      canAskAgain: false
    }),
    setUpdateInterval: () => undefined,
    addListener: (
      listener: (reading: { rotation: { beta: number } }) => void
    ) => {
      mockMotionListeners.add(listener);
      return { remove: () => mockMotionListeners.delete(listener) };
    }
  },
  Accelerometer: {
    getPermissionsAsync: async () => ({
      granted: mockGranted,
      canAskAgain: false
    }),
    requestPermissionsAsync: async () => ({
      granted: mockGranted,
      canAskAgain: false
    }),
    setUpdateInterval: () => undefined,
    addListener: (
      listener: (reading: { x: number; y: number; z: number }) => void
    ) => {
      mockTiltListeners.add(listener);
      return { remove: () => mockTiltListeners.delete(listener) };
    }
  }
}));

async function hold(beta: number, x: number, y: number, z: number, ms = 2_000) {
  for (let elapsed = 0; elapsed <= ms; elapsed += 100) {
    await act(() => {
      mockMotionListeners.forEach((listener) =>
        listener({ rotation: { beta } })
      );
      mockTiltListeners.forEach((listener) => listener({ x, y, z }));
      jest.advanceTimersByTime(100);
    });
  }
}

async function renderCalibration(
  clockCalibrationStatus: "calibrating" | "ready" | "failed" = "ready"
) {
  const onComplete = jest.fn();
  const onRetryClockCalibration = jest.fn();
  const view = await render(
    <PaperProvider theme={appTheme}>
      <DrawCalibrationScreen
        clockCalibrationStatus={clockCalibrationStatus}
        onComplete={onComplete}
        onRetryClockCalibration={onRetryClockCalibration}
      />
    </PaperProvider>
  );
  return { view, onComplete, onRetryClockCalibration };
}

describe("DrawCalibrationScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(10_000);
    mockMotionListeners.clear();
    mockTiltListeners.clear();
    mockVolumeListeners.clear();
    mockGranted = true;
    mockAvailable = true;
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

  it("gives progressive haptic feedback while lowering from the shoulder pose", async () => {
    const { view } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    await hold(1.2, 0, 0, 0.95);
    expect(view.getByText("Ready pose")).toBeTruthy();
    expect(mockPlay).toHaveBeenCalledTimes(1);

    await act(() =>
      mockMotionListeners.forEach((listener) =>
        listener({ rotation: { beta: 1.2 } })
      )
    );
    await act(() => jest.advanceTimersByTime(300));
    const farPulses = mockImpact.mock.calls.filter(
      ([style]) => style === "heavy"
    ).length;
    await act(() =>
      mockMotionListeners.forEach((listener) =>
        listener({ rotation: { beta: 1.17 } })
      )
    );
    const approachingPulses = mockImpact.mock.calls.length;
    await act(() => jest.advanceTimersByTime(300));
    expect(mockImpact.mock.calls.length).toBe(approachingPulses);
    await act(() =>
      mockMotionListeners.forEach((listener) =>
        listener({ rotation: { beta: 1.155 } })
      )
    );
    expect(farPulses).toBeGreaterThan(1);
    expect(mockImpact.mock.calls.length).toBeGreaterThan(approachingPulses);

    await hold(0.2, 0, 0.9, 0);
    const pulseCountAtPass = mockImpact.mock.calls.length;
    await act(() => jest.advanceTimersByTime(1_000));
    expect(mockImpact).toHaveBeenCalledTimes(pulseCountAtPass);
    expect(mockSuccess).toHaveBeenCalledTimes(2);
    await view.unmount();
  });
  it("stops proximity pulses while the app is backgrounded", async () => {
    const appStateListeners: ((state: AppStateStatus) => void)[] = [];
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, listener) => {
        appStateListeners.push(listener);
        return { remove: () => undefined };
      });
    const { view } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    await hold(1.2, 0, 0, 0.95);
    await act(() =>
      mockMotionListeners.forEach((listener) =>
        listener({ rotation: { beta: 1.2 } })
      )
    );
    expect(mockImpact).toHaveBeenCalled();

    await act(() =>
      appStateListeners.forEach((listener) => listener("background"))
    );
    const pulseCountAtPause = mockImpact.mock.calls.length;
    await act(() => jest.advanceTimersByTime(1_000));
    expect(mockImpact).toHaveBeenCalledTimes(pulseCountAtPause);
    await view.unmount();
  });

  it("keeps pose instructions and the start action in one scrollable region", async () => {
    const { view, onComplete } = await renderCalibration();
    const scroll = view.getByTestId("draw-calibration-scroll");
    expect(scroll.type).toBe("RCTScrollView");
    const content = within(scroll);
    expect(
      content.getByText("Phone down at your side, top edge toward the ground.")
    ).toBeTruthy();
    expect(
      content.getByText("Phone at shoulder height, top edge pointing forward.")
    ).toBeTruthy();
    await fireEvent.press(
      content.getByRole("button", { name: "Start calibration" })
    );
    expect(content.getByText("Shoulder pose")).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("automatically checks both valid poses after a steady hold", async () => {
    const { view, onComplete } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    expect(view.getByText("Shoulder pose")).toBeTruthy();
    await hold(1.2, 0, 0, 0.95);
    expect(view.getByText("Ready pose")).toBeTruthy();
    expect(view.getAllByText("✓")).toHaveLength(1);
    await hold(0.2, 0, 0, 0.95);
    expect(view.queryByText("Continue")).toBeNull();
    await hold(0.2, 0, 0.9, 0);
    expect(view.getByText("Calibration passed")).toBeTruthy();
    expect(view.getAllByText("✓")).toHaveLength(2);
    expect(mockSuccess).toHaveBeenCalledTimes(2);
    expect(view.getByText("Clock: ✓ calibrated")).toBeTruthy();
    const content = within(view.getByTestId("draw-calibration-scroll"));
    await fireEvent.press(content.getByRole("button", { name: "Continue" }));
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        thetaReady: 0.2,
        thetaShoulder: 1.2,
        readyPose: expect.objectContaining({
          confirmation: "hold",
          motion: expect.objectContaining({
            rotation: expect.objectContaining({ beta: 0.2 })
          })
        }),
        shoulderPose: expect.objectContaining({
          confirmation: "hold",
          accelerometer: expect.objectContaining({ y: 0 })
        })
      })
    );
    expect(mockMotionListeners.size).toBe(0);
    expect(mockTiltListeners.size).toBe(0);
  });

  it("continues calibration on volume-up after both poses pass", async () => {
    const { view, onComplete } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    await hold(1.2, 0, 0, 0.95);
    await hold(0.2, 0, 0.9, 0);

    expect(view.getByText("Calibration passed")).toBeTruthy();

    await act(() => {
      mockVolumeListeners.forEach((listener) => listener({ direction: "up" }));
    });

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        thetaReady: 0.2,
        thetaShoulder: 1.2
      })
    );
  });

  it("shows clock failure and retries on the calibration screen", async () => {
    const { view, onRetryClockCalibration } = await renderCalibration("failed");
    expect(view.getByText("Clock: calibration failed")).toBeTruthy();
    const content = within(view.getByTestId("draw-calibration-scroll"));
    await fireEvent.press(content.getByRole("button", { name: "Retry clock" }));
    expect(onRetryClockCalibration).toHaveBeenCalledTimes(1);
  });

  it("does not confirm a pose from stale motion readings", async () => {
    const { view } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    await act(() => {
      mockMotionListeners.forEach((listener) =>
        listener({ rotation: { beta: 0.2 } })
      );
      mockTiltListeners.forEach((listener) => listener({ x: 0, y: 0.9, z: 0 }));
      jest.advanceTimersByTime(351);
      mockVolumeListeners.forEach((listener) => listener({ direction: "up" }));
    });
    expect(view.queryByText("Ready pose")).toBeNull();
    expect(mockImpact).toHaveBeenCalledTimes(1);
  });

  it("confirms only a fresh valid pose on volume up and gives an error hint otherwise", async () => {
    const { view, onComplete } = await renderCalibration();
    expect(mockVolumeListeners.size).toBe(0);
    await fireEvent.press(view.getByText("Start calibration"));
    expect(mockVolumeListeners.size).toBe(1);
    expect(view.getByText(/Hold steady or press volume up/)).toBeTruthy();
    await act(() => {
      mockMotionListeners.forEach((listener) =>
        listener({ rotation: { beta: 1.2 } })
      );
      mockTiltListeners.forEach((listener) => listener({ x: 0, y: 0.9, z: 0 }));
      mockVolumeListeners.forEach((listener) => listener({ direction: "up" }));
    });
    expect(
      view.getByText(/Point the top edge forward at shoulder height first/)
    ).toBeTruthy();
    expect(mockImpact).toHaveBeenCalledTimes(1);
    expect(view.queryByText("Ready pose")).toBeNull();

    await act(() => {
      mockTiltListeners.forEach((listener) =>
        listener({ x: 0, y: 0, z: 0.95 })
      );
      mockVolumeListeners.forEach((listener) =>
        listener({ direction: "down" })
      );
    });
    expect(view.queryByText("Ready pose")).toBeNull();
    await act(() =>
      mockVolumeListeners.forEach((listener) => listener({ direction: "up" }))
    );
    expect(view.getByText("Ready pose")).toBeTruthy();
    expect(view.getAllByText("✓")).toHaveLength(1);

    await act(() => {
      mockTiltListeners.forEach((listener) =>
        listener({ x: 0.95, y: 0, z: 0 })
      );
      mockVolumeListeners.forEach((listener) => listener({ direction: "up" }));
    });
    expect(
      view.getByText(/lower the phone from shoulder height first/)
    ).toBeTruthy();
    await act(() => {
      mockMotionListeners.forEach((listener) =>
        listener({ rotation: { beta: 0.2 } })
      );
      mockTiltListeners.forEach((listener) => listener({ x: 0, y: 0.9, z: 0 }));
      mockVolumeListeners.forEach((listener) => listener({ direction: "up" }));
    });
    expect(view.getByText("Calibration passed")).toBeTruthy();
    expect(mockVolumeListeners.size).toBe(1);
    await act(() => {
      mockVolumeListeners.forEach((listener) =>
        listener({ direction: "down" })
      );
    });
    expect(mockSuccess).toHaveBeenCalledTimes(2);
    expect(onComplete).not.toHaveBeenCalled();
    await act(() =>
      mockVolumeListeners.forEach((listener) => listener({ direction: "up" }))
    );
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        readyPose: expect.objectContaining({ confirmation: "volume" }),
        shoulderPose: expect.objectContaining({ confirmation: "volume" })
      })
    );
    expect(view.getByTestId("ready-pose-illustration")).toBeTruthy();
    expect(view.getByTestId("shoulder-pose-illustration")).toBeTruthy();
  });

  it("keeps Settings and permission recovery in the scrollable content", async () => {
    mockGranted = false;
    const { view } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    const content = within(view.getByTestId("draw-calibration-scroll"));
    expect(content.getByText("Motion access needed")).toBeTruthy();
    expect(content.queryByText("Continue")).toBeNull();
    const openSettings = jest
      .spyOn(Linking, "openSettings")
      .mockResolvedValue();
    try {
      await fireEvent.press(
        content.getByRole("button", { name: "Open Settings" })
      );
      expect(openSettings).toHaveBeenCalledTimes(1);
    } finally {
      openSettings.mockRestore();
    }
    mockGranted = true;
    await fireEvent.press(content.getByRole("button", { name: "Check Again" }));
    expect(content.getByText("Shoulder pose")).toBeTruthy();
    expect(content.queryByText("Motion access needed")).toBeNull();
  });

  it("retries unavailable motion from the scrollable content", async () => {
    mockAvailable = false;
    const { view, onComplete } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    const content = within(view.getByTestId("draw-calibration-scroll"));
    expect(content.getByText("Motion unavailable")).toBeTruthy();
    mockAvailable = true;
    await fireEvent.press(content.getByRole("button", { name: "Retry" }));
    expect(content.getByText("Shoulder pose")).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
