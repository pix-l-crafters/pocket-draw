import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  getCurrentPositionAsync,
  getForegroundPermissionsAsync,
  hasServicesEnabledAsync,
  watchPositionAsync
} from "expo-location";
import { AppState, type AppStateStatus } from "react-native";

import { useForegroundLocation } from "./useForegroundLocation";

jest.mock("expo-location", () => ({
  Accuracy: { High: 4 },
  getCurrentPositionAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn()
}));

describe("useForegroundLocation foreground recovery", () => {
  let notify: (state: AppStateStatus) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, listener) => {
        notify = listener as (state: AppStateStatus) => void;
        return { remove: jest.fn() } as never;
      });
  });

  afterEach(() => jest.restoreAllMocks());

  it("rechecks a denied permission on foreground return without prompting again", async () => {
    jest
      .mocked(getForegroundPermissionsAsync)
      .mockResolvedValueOnce({
        granted: false,
        status: "denied",
        canAskAgain: false
      } as never)
      .mockResolvedValueOnce({
        granted: true,
        status: "granted",
        canAskAgain: true
      } as never);
    jest.mocked(hasServicesEnabledAsync).mockResolvedValue(true);
    jest
      .mocked(getCurrentPositionAsync)
      .mockResolvedValue({ coords: { latitude: 1, longitude: 2 } } as never);
    jest
      .mocked(watchPositionAsync)
      .mockResolvedValue({ remove: jest.fn() } as never);

    const view = await renderHook(() => useForegroundLocation());
    await waitFor(() =>
      expect(view.result.current?.locationState.status).toBe("denied")
    );

    await act(async () => notify("active"));

    await waitFor(() =>
      expect(view.result.current?.locationState.status).toBe("granted")
    );
    expect(getForegroundPermissionsAsync).toHaveBeenCalledTimes(2);
    await view.unmount();
  });

  it("keeps an active GPS watch when returning to the foreground", async () => {
    const remove = jest.fn();
    jest.mocked(getForegroundPermissionsAsync).mockResolvedValue({
      granted: true,
      status: "granted",
      canAskAgain: true
    } as never);
    jest.mocked(hasServicesEnabledAsync).mockResolvedValue(true);
    jest
      .mocked(getCurrentPositionAsync)
      .mockResolvedValue({ coords: { latitude: 1, longitude: 2 } } as never);
    jest.mocked(watchPositionAsync).mockResolvedValue({ remove } as never);

    const view = await renderHook(() => useForegroundLocation());
    await waitFor(() => expect(watchPositionAsync).toHaveBeenCalledTimes(1));

    await act(async () => notify("active"));

    expect(getForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(watchPositionAsync).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    await view.unmount();
  });
});
