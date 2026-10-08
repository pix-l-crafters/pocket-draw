import { act, render, userEvent, waitFor } from "@testing-library/react-native";
import { AppState, Linking, type AppStateStatus } from "react-native";
import { PaperProvider } from "react-native-paper";

import { getAppPermissionStatuses } from "../../lib/appPermissions";
import { appTheme } from "../../theme/appTheme";
import { PermissionStatusScreen } from "./PermissionStatusScreen";

jest.mock("../../lib/appPermissions", () => ({
  getAppPermissionStatuses: jest.fn()
}));

describe("PermissionStatusScreen", () => {
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

  it("shows all four current statuses and opens app settings", async () => {
    jest.mocked(getAppPermissionStatuses).mockResolvedValue({
      Camera: "granted",
      Motion: "notGranted",
      Location: "granted",
      "Nearby Wi-Fi": "notRequired"
    });
    const openSettings = jest
      .spyOn(Linking, "openSettings")
      .mockResolvedValue(undefined);
    const screen = await render(
      <PaperProvider theme={appTheme}>
        <PermissionStatusScreen onBack={jest.fn()} />
      </PaperProvider>
    );

    expect(await screen.findByText("Camera")).toBeTruthy();
    expect(screen.getByText("Motion")).toBeTruthy();
    expect(screen.getByText("Location")).toBeTruthy();
    expect(screen.getByText("Nearby Wi-Fi")).toBeTruthy();
    expect(screen.getAllByText("Granted")).toHaveLength(2);
    expect(screen.getByText("Not granted")).toBeTruthy();
    expect(screen.getByText("Not required")).toBeTruthy();

    await userEvent.setup().press(screen.getByText("Open Settings"));
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it("refreshes statuses when returning from Settings", async () => {
    jest
      .mocked(getAppPermissionStatuses)
      .mockResolvedValueOnce({
        Camera: "notGranted",
        Motion: "granted",
        Location: "granted",
        "Nearby Wi-Fi": "notRequired"
      })
      .mockResolvedValueOnce({
        Camera: "granted",
        Motion: "granted",
        Location: "granted",
        "Nearby Wi-Fi": "notRequired"
      });
    const screen = await render(
      <PaperProvider theme={appTheme}>
        <PermissionStatusScreen onBack={jest.fn()} />
      </PaperProvider>
    );
    expect(await screen.findByText("Not granted")).toBeTruthy();

    await act(async () => notify("active"));

    await waitFor(() => expect(screen.queryByText("Not granted")).toBeNull());
    expect(screen.getAllByText("Granted")).toHaveLength(3);
    expect(getAppPermissionStatuses).toHaveBeenCalledTimes(2);
  });
});
