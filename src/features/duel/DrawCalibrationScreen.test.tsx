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
let mockGranted = true;

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: { Success: "success" }
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
    mockGranted = true;
    jest.mocked(Haptics.notificationAsync).mockClear();
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

  it("keeps motion permission recovery available", async () => {
    mockGranted = false;
    const { view } = await renderCalibration();
    await fireEvent.press(view.getByText("Start calibration"));
    expect(view.getByText("Motion access needed")).toBeTruthy();
    expect(view.queryByText("Continue")).toBeNull();
  });
});
