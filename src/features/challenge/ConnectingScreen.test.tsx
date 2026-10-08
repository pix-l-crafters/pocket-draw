import { render, userEvent } from "@testing-library/react-native";
import { AppState, Linking, type AppStateStatus } from "react-native";

import type { ChallengeHandoff } from "../../contracts/challengeHandoff";
import { PermissionDeniedError } from "../../lib/appPermissions";
import { ConnectingScreen } from "./ConnectingScreen";
import { useDuelSession } from "./hooks/useDuelSession";

jest.mock("./hooks/useDuelSession", () => ({ useDuelSession: jest.fn() }));
jest.mock("./network/hotspot", () => ({
  withNetworkPreparation: jest.fn(),
  withReconnectPreparation: jest.fn()
}));
jest.mock("./webrtc/nativeWebRtcTransport", () => ({
  createNativeWebRtcGuestTransport: jest.fn()
}));

const permissionError = new PermissionDeniedError("Nearby Wi-Fi", false);
const fixtureValue = "example-value";
const handoff: ChallengeHandoff = {
  challengerId: "guest-1",
  matchId: "match-1",
  discoveryToken: "token-1",
  scannedPlayerId: "host-1",
  scannedPlayerName: "Host",
  challengeToken: "challenge-1",
  roundCount: 3,
  connection: {
    mode: "hotspot",
    hostIp: "192.168.1.1",
    signalPort: 3000,
    ssid: "Pocket",
    password: fixtureValue
  }
};

describe("ConnectingScreen guest permission recovery", () => {
  afterEach(() => jest.restoreAllMocks());

  it("offers Settings and a manual recheck after a permanent hotspot denial", async () => {
    const retry = jest.fn();
    jest.mocked(useDuelSession).mockReturnValue({
      state: {
        status: "failed",
        message: permissionError.message,
        permissionError
      },
      retry,
      cancel: jest.fn(),
      handOff: jest.fn()
    });
    const openSettings = jest
      .spyOn(Linking, "openSettings")
      .mockResolvedValue(undefined);
    const screen = await render(
      <ConnectingScreen
        currentUser={{ displayName: "Guest", uid: "guest-1" }}
        handoff={handoff}
        onConnected={jest.fn()}
        onExit={jest.fn()}
      />
    );

    const user = userEvent.setup();
    await user.press(screen.getByText("Open Settings"));
    expect(openSettings).toHaveBeenCalled();
    await user.press(screen.getByText("Check Again"));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Try Again")).toBeNull();
  });

  it("retries the blocked connection when the guest returns from Settings", async () => {
    const retry = jest.fn();
    let notify: (state: AppStateStatus) => void = () => {};
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, listener) => {
        notify = listener as (state: AppStateStatus) => void;
        return { remove: jest.fn() } as never;
      });
    jest.mocked(useDuelSession).mockReturnValue({
      state: {
        status: "failed",
        message: permissionError.message,
        permissionError
      },
      retry,
      cancel: jest.fn(),
      handOff: jest.fn()
    });

    await render(
      <ConnectingScreen
        currentUser={{ displayName: "Guest", uid: "guest-1" }}
        handoff={handoff}
        onConnected={jest.fn()}
        onExit={jest.fn()}
      />
    );

    notify("background");
    expect(retry).not.toHaveBeenCalled();
    notify("active");
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
