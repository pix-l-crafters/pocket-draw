jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, within } from "@testing-library/react-native";
import { AppState, type AppStateStatus, Linking, Share } from "react-native";
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

async function volumeUp() {
  await act(() =>
    mockVolumeListeners.forEach((listener) => listener({ direction: "up" }))
  );
}
async function motionSequence(values: number[], y: number) {
  for (const beta of values) {
    await act(() => {
      mockTiltListeners.forEach((listener) =>
        listener({ x: 0, y, z: y ? 0 : 0.95 })
      );
      mockMotionListeners.forEach((listener) =>
        listener({ rotation: { beta } })
      );
      jest.advanceTimersByTime(20);
    });
  }
}

async function renderCalibration(
  clockCalibrationStatus: "calibrating" | "ready" | "failed" = "ready"
) {
  const onComplete = jest.fn();
  const onRetryClockCalibration = jest.fn();
  const screen = (paused = false) => (
    <PaperProvider theme={appTheme}>
      <DrawCalibrationScreen
        paused={paused}
        clockCalibrationStatus={clockCalibrationStatus}
        onComplete={onComplete}
        onRetryClockCalibration={onRetryClockCalibration}
      />
    </PaperProvider>
  );
  const view = await render(screen());
  return {
    view,
    onComplete,
    onRetryClockCalibration,
    setPaused: (paused: boolean) => view.rerender(screen(paused))
  };
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
    await motionSequence([1.2, 1.2, 1.2], 0);
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
    await motionSequence([0.2, 0.2, 0.2], 0.9);
    await volumeUp();
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

  it("saves the same recent median for manual confirmation while snapshots retain the outlier", async () => {
    const { view, onComplete } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    await motionSequence([1.2, 1.21, 9], 0);
    await volumeUp();
    expect(view.getByText("Ready pose")).toBeTruthy();
    await motionSequence([0.1, 0.2, 0.3, 0.4], 0.9);
    await volumeUp();
    await volumeUp();
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        thetaShoulder: 1.21,
        thetaReady: 0.25,
        shoulderPose: expect.objectContaining({
          motion: expect.objectContaining({
            rotation: expect.objectContaining({ beta: 9 })
          })
        })
      })
    );
  });

  it("asks for a brief hold when fewer than three motion callbacks qualify", async () => {
    const { view } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    await motionSequence([1.2, 1.2], 0);
    await volumeUp();
    expect(view.getByText(/Hold the pose briefly/)).toBeTruthy();
    expect(view.getByText("Shoulder pose")).toBeTruthy();
  });

  it("uses a median for automatic holds without synthesizing the original snapshot", async () => {
    const { view, onComplete } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    await hold(1.2, 0, 0, 0.95, 1900);
    await act(() => {
      mockMotionListeners.forEach((listener) =>
        listener({ rotation: { beta: 1.3 } })
      );
      mockTiltListeners.forEach((listener) =>
        listener({ x: 0, y: 0, z: 0.95 })
      );
    });
    expect(view.getByText("Ready pose")).toBeTruthy();
    await hold(0.2, 0, 0.9, 0);
    await volumeUp();
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        thetaShoulder: 1.2,
        shoulderPose: expect.objectContaining({
          confirmation: "hold",
          motion: expect.objectContaining({
            rotation: expect.objectContaining({ beta: 1.3 })
          })
        })
      })
    );
  });

  it("validates the minimum arc against the saved medians", async () => {
    const { view } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    await motionSequence([1.2, 1.2, 1.2], 0);
    await volumeUp();
    await motionSequence([1.14, 1.26, 1.14, 1.26], 0.9);
    await volumeUp();
    expect(view.getByText("Ready pose")).toBeTruthy();
    expect(view.queryByText("Calibration passed")).toBeNull();
    expect(
      view.getByText(/lower the phone from shoulder height first/)
    ).toBeTruthy();
  });

  it.each([
    "invalidPose",
    "invalidPitch",
    "stalePose",
    "stalePitch",
    "pause",
    "background"
  ])("clears eligibility after %s and requires new samples", async (reason) => {
    const states: ((state: AppStateStatus) => void)[] = [];
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, listener) => {
        states.push(listener);
        return { remove: () => undefined };
      });
    const { view, setPaused } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    await motionSequence([1.2, 1.2, 1.2], 0);
    if (reason === "pause") {
      await setPaused(true);
      await setPaused(false);
    } else
      await act(() => {
        if (reason === "background") {
          states.forEach((listener) => listener("background"));
          states.forEach((listener) => listener("active"));
        }
        if (reason === "invalidPose")
          mockTiltListeners.forEach((listener) =>
            listener({ x: NaN, y: 0, z: 1 })
          );
        if (reason === "invalidPitch")
          mockMotionListeners.forEach((listener) =>
            listener({ rotation: { beta: NaN } })
          );
        if (reason === "stalePose" || reason === "stalePitch")
          jest.advanceTimersByTime(351);
        if (reason === "stalePose")
          mockMotionListeners.forEach((listener) =>
            listener({ rotation: { beta: 1.2 } })
          );
      });
    await volumeUp();
    expect(view.getByText("Shoulder pose")).toBeTruthy();
    await motionSequence([1.2, 1.2], 0);
    await volumeUp();
    expect(view.getByText("Shoulder pose")).toBeTruthy();
    await motionSequence([1.2], 0);
    await volumeUp();
    expect(view.getByText("Ready pose")).toBeTruthy();
    // The next pose cannot inherit shoulder samples.
    await motionSequence([0.2], 0.9);
    await volumeUp();
    expect(view.getByText("Ready pose")).toBeTruthy();
  });

  it("ignores removed callbacks and starts a new sensor session with no prior samples", async () => {
    const first = await renderCalibration();
    await fireEvent.press(first.view.getByText("Start calibration"));
    await motionSequence([1.2, 1.2, 1.2], 0);
    const oldMotion = [...mockMotionListeners][0];
    const oldTilt = [...mockTiltListeners][0];
    await first.view.unmount();
    const second = await renderCalibration();
    await fireEvent.press(second.view.getByText("Start calibration"));
    await act(() => {
      oldTilt({ x: 0, y: 0, z: 1 });
      oldMotion({ rotation: { beta: 9 } });
    });
    await motionSequence([1.2, 1.2], 0);
    await volumeUp();
    expect(second.view.getByText("Shoulder pose")).toBeTruthy();
  });

  it("keeps calibration playable when local save or share fails", async () => {
    jest.spyOn(AsyncStorage, "setItem").mockRejectedValue(new Error("full"));
    jest.spyOn(Share, "share").mockRejectedValue(new Error("failed"));
    const { view, onComplete } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    await motionSequence([1.2, 1.2, 1.2], 0);
    await volumeUp();
    await motionSequence([0.2, 0.2, 0.2], 0.9);
    await volumeUp();
    await fireEvent.press(view.getByText("Share latest sensor JSON"));
    await volumeUp();
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ thetaShoulder: 1.2, thetaReady: 0.2 })
    );
  });

  it("does not expose sensor export controls in production", async () => {
    const original = __DEV__;
    try {
      (globalThis as any).__DEV__ = false;
      const { view } = await renderCalibration();
      expect(view.queryByText("Share latest sensor JSON")).toBeNull();
    } finally {
      (globalThis as any).__DEV__ = original;
    }
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
