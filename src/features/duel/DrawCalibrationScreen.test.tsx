import { act, fireEvent, render } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
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
let mockGranted = true;

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: "light" },
  notificationAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: { Success: "success" }
}));

jest.mock("./volumeFireTrigger", () => ({
  subscribeVolumeFire: (
    listener: (event: { direction: "up" | "down" }) => void
  ) => {
    mockVolumeListeners.add(listener);
    return () => mockVolumeListeners.delete(listener);
  }
}));

jest.mock("expo-sensors", () => ({
  DeviceMotion: {
    isAvailableAsync: async () => true,
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
    jest.mocked(Haptics.notificationAsync).mockClear();
    jest.mocked(Haptics.impactAsync).mockClear();
  });

  afterEach(() => jest.useRealTimers());

  it("automatically checks both valid poses after a steady hold", async () => {
    const { view, onComplete } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    await hold(0.2, 0, -0.9, 0);
    expect(view.queryByText("Shoulder pose")).toBeNull();
    await hold(0.2, 0, 0.9, 0);
    expect(view.getByText("Shoulder pose")).toBeTruthy();
    expect(view.getAllByText("✓")).toHaveLength(1);
    await hold(1.2, 0, 0.9, 0);
    expect(view.queryByText("Continue")).toBeNull();
    await hold(1.2, 0, 0, 0.95);
    expect(view.getByText("Calibration passed")).toBeTruthy();
    expect(view.getAllByText("✓")).toHaveLength(2);
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);
    expect(view.getByText("Clock: ✓ calibrated")).toBeTruthy();
    await fireEvent.press(view.getByText("Continue"));
    expect(onComplete).toHaveBeenCalledWith({
      thetaReady: 0.2,
      thetaShoulder: 1.2
    });
    expect(mockMotionListeners.size).toBe(0);
    expect(mockTiltListeners.size).toBe(0);
  });

  it("shows clock failure and retries on the calibration screen", async () => {
    const { view, onRetryClockCalibration } = await renderCalibration("failed");
    expect(view.getByText("Clock: calibration failed")).toBeTruthy();
    await fireEvent.press(view.getByText("Retry clock"));
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
    expect(view.queryByText("Shoulder pose")).toBeNull();
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it("confirms only a fresh valid pose on volume up and gives an error hint otherwise", async () => {
    const { view, onComplete } = await renderCalibration();
    expect(mockVolumeListeners.size).toBe(0);
    await fireEvent.press(view.getByText("Start calibration"));
    expect(mockVolumeListeners.size).toBe(1);
    expect(view.getByText(/Hold steady or press volume up/)).toBeTruthy();
    await act(() => {
      mockMotionListeners.forEach((listener) =>
        listener({ rotation: { beta: 0.2 } })
      );
      mockTiltListeners.forEach((listener) =>
        listener({ x: 0, y: -0.9, z: 0 })
      );
      mockVolumeListeners.forEach((listener) => listener({ direction: "up" }));
    });
    expect(view.getByText(/Point the top edge down first/)).toBeTruthy();
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(view.queryByText("Shoulder pose")).toBeNull();

    await act(() => {
      mockTiltListeners.forEach((listener) => listener({ x: 0, y: 0.9, z: 0 }));
      mockVolumeListeners.forEach((listener) =>
        listener({ direction: "down" })
      );
    });
    expect(view.queryByText("Shoulder pose")).toBeNull();
    await act(() =>
      mockVolumeListeners.forEach((listener) => listener({ direction: "up" }))
    );
    expect(view.getByText("Shoulder pose")).toBeTruthy();
    expect(view.getAllByText("✓")).toHaveLength(1);

    await act(() => {
      mockTiltListeners.forEach((listener) =>
        listener({ x: 0.95, y: 0, z: 0 })
      );
      mockVolumeListeners.forEach((listener) => listener({ direction: "up" }));
    });
    expect(view.getByText(/raise the phone from ready first/)).toBeTruthy();
    await act(() => {
      mockMotionListeners.forEach((listener) =>
        listener({ rotation: { beta: 1.2 } })
      );
      mockVolumeListeners.forEach((listener) => listener({ direction: "up" }));
    });
    expect(view.getByText("Calibration passed")).toBeTruthy();
    expect(mockVolumeListeners.size).toBe(0);
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);
    expect(onComplete).not.toHaveBeenCalled();
    expect(view.getByTestId("ready-pose-illustration")).toBeTruthy();
    expect(view.getByTestId("shoulder-pose-illustration")).toBeTruthy();
  });

  it("keeps motion permission recovery available", async () => {
    mockGranted = false;
    const { view } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    expect(view.getByText("Motion access needed")).toBeTruthy();
    expect(view.queryByText("Continue")).toBeNull();
  });
});
