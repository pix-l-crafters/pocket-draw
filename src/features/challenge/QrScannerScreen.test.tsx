import { render, userEvent } from "@testing-library/react-native";
import { useCameraPermissions } from "expo-camera";
import { AppState, Linking, type AppStateStatus } from "react-native";

import { QrScannerScreen } from "./QrScannerScreen";

jest.mock("expo-camera", () => ({
  CameraView: () => null,
  useCameraPermissions: jest.fn()
}));

// The opponent popup pulls in the Firestore-backed player-stats repository,
// which this suite has no reason to load — it only covers the camera gate.
jest.mock("./components/OpponentPopup", () => ({
  OpponentPopup: () => null
}));

const currentUser = { displayName: "Quick Draw", uid: "player-1" };

function mockPermissions(
  permission: { granted: boolean; canAskAgain: boolean } | null
) {
  const requestPermission = jest.fn();
  const getPermission = jest.fn();
  jest
    .mocked(useCameraPermissions)
    .mockReturnValue([
      permission as never,
      requestPermission as never,
      getPermission as never
    ]);
  return { getPermission, requestPermission };
}

describe("QrScannerScreen camera permission", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.mocked(useCameraPermissions).mockReset();
  });

  it("offers another prompt while the OS will still show one", async () => {
    const { requestPermission } = mockPermissions({
      granted: false,
      canAskAgain: true
    });
    const user = userEvent.setup();
    const screen = await render(
      <QrScannerScreen
        currentUser={currentUser}
        onOpponentConfirmed={jest.fn()}
      />
    );

    expect(screen.getByText(/Camera access needed/i)).toBeTruthy();
    await user.press(screen.getByText("Allow Camera"));

    expect(requestPermission).toHaveBeenCalled();
  });

  it("explains the lost capability and routes to Settings once denied for good", async () => {
    const { requestPermission } = mockPermissions({
      granted: false,
      canAskAgain: false
    });
    const openSettings = jest
      .spyOn(Linking, "openSettings")
      .mockResolvedValue(undefined);
    const user = userEvent.setup();
    const screen = await render(
      <QrScannerScreen
        currentUser={currentUser}
        onOpponentConfirmed={jest.fn()}
      />
    );

    expect(screen.getByText(/switch to My QR/i)).toBeTruthy();
    await user.press(screen.getByText("Open Settings"));
    expect(openSettings).toHaveBeenCalled();

    await user.press(screen.getByText("Check Again"));
    expect(requestPermission).toHaveBeenCalled();
  });

  it("re-reads the permission when the app returns from Settings", async () => {
    const { getPermission } = mockPermissions({
      granted: false,
      canAskAgain: false
    });
    const listeners: ((state: AppStateStatus) => void)[] = [];
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, handler) => {
        listeners.push(handler as (state: AppStateStatus) => void);
        return { remove: jest.fn() } as never;
      });

    await render(
      <QrScannerScreen
        currentUser={currentUser}
        onOpponentConfirmed={jest.fn()}
      />
    );

    const notify = (state: AppStateStatus) =>
      listeners.forEach((listener) => listener(state));

    getPermission.mockClear();
    notify("background");
    expect(getPermission).not.toHaveBeenCalled();

    notify("active");
    expect(getPermission).toHaveBeenCalled();
  });
});
