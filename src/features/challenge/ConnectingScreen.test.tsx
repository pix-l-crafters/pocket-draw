import { act, render, userEvent } from "@testing-library/react-native";
import { AppState, Linking, type AppStateStatus } from "react-native";

import type { ChallengeHandoff } from "../../contracts/challengeHandoff";
import type { DuelMessage } from "../../contracts/duelChannel";
import { PermissionDeniedError } from "../../lib/appPermissions";
import { ConnectingScreen } from "./ConnectingScreen";
import { useDuelSession } from "./hooks/useDuelSession";
import { challengeRequestRepository } from "./services/challengeRequestRepository";

jest.mock("./services/challengeRequestRepository", () => ({
  challengeRequestRepository: {
    updateStatus: jest.fn().mockResolvedValue(undefined)
  }
}));

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
        request={Promise.resolve({ requestId: "request-1" })}
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
        request={Promise.resolve({ requestId: "request-1" })}
      />
    );

    notify("background");
    expect(retry).not.toHaveBeenCalled();
    notify("active");
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe("ConnectingScreen challenge decisions", () => {
  beforeEach(() => jest.clearAllMocks());

  function connectedSession() {
    let receive: (message: DuelMessage) => void = () => {};
    const channel = {
      send: jest.fn(),
      isConnected: () => true,
      onMessage: jest.fn((handler: typeof receive) => {
        receive = handler;
        return jest.fn();
      })
    };
    const session = {
      state: {
        status: "connected" as const,
        connection: { channel, onDrop: jest.fn(), disconnect: jest.fn() }
      },
      retry: jest.fn(),
      cancel: jest.fn(),
      handOff: jest.fn()
    };
    jest.mocked(useDuelSession).mockReturnValue(session);
    return { session, receive: (message: DuelMessage) => receive(message) };
  }

  it.each(["accepted", "declined"] as const)(
    "persists %s only after the host answers",
    async (decision) => {
      const { receive } = connectedSession();
      const onConnected = jest.fn();
      const screen = await render(
        <ConnectingScreen
          currentUser={{ displayName: "Guest", uid: "guest-1" }}
          handoff={handoff}
          onConnected={onConnected}
          onExit={jest.fn()}
          request={Promise.resolve({ requestId: "request-specific" })}
        />
      );
      expect(challengeRequestRepository.updateStatus).not.toHaveBeenCalled();
      expect(onConnected).not.toHaveBeenCalled();
      await act(async () => {
        receive({
          type:
            decision === "accepted" ? "challengeAccepted" : "challengeDeclined"
        });
      });
      expect(challengeRequestRepository.updateStatus).toHaveBeenCalledWith(
        "request-specific",
        decision
      );
      expect(onConnected).toHaveBeenCalledTimes(
        decision === "accepted" ? 1 : 0
      );
      await screen.unmount();
    }
  );

  it.each(["accepted", "declined"] as const)(
    "retains an early %s decision after this attempt unmounts",
    async (decision) => {
      const { receive } = connectedSession();
      let finishCreation!: (result: { requestId: string }) => void;
      const request = new Promise<{ requestId: string }>((resolve) => {
        finishCreation = resolve;
      });
      const screen = await render(
        <ConnectingScreen
          currentUser={{ displayName: "Guest", uid: "guest-1" }}
          handoff={handoff}
          onConnected={jest.fn()}
          onExit={jest.fn()}
          request={request}
        />
      );
      await act(async () => {
        const message: DuelMessage = {
          type:
            decision === "accepted" ? "challengeAccepted" : "challengeDeclined"
        };
        receive(message);
        receive(message);
      });
      expect(challengeRequestRepository.updateStatus).not.toHaveBeenCalled();
      await screen.unmount();
      await act(async () => finishCreation({ requestId: "slow-request" }));
      expect(challengeRequestRepository.updateStatus).toHaveBeenCalledTimes(1);
      expect(challengeRequestRepository.updateStatus).toHaveBeenCalledWith(
        "slow-request",
        decision
      );
    }
  );

  it.each(["failed", "disconnected"] as const)(
    "leaves a %s attempt pending",
    async (status) => {
      jest.mocked(useDuelSession).mockReturnValue({
        state: { status, message: "Connection lost" },
        retry: jest.fn(),
        cancel: jest.fn(),
        handOff: jest.fn()
      });
      const onConnected = jest.fn();
      await render(
        <ConnectingScreen
          currentUser={{ displayName: "Guest", uid: "guest-1" }}
          handoff={handoff}
          onConnected={onConnected}
          onExit={jest.fn()}
          request={Promise.resolve({ requestId: "request-failed" })}
        />
      );
      expect(challengeRequestRepository.updateStatus).not.toHaveBeenCalled();
      expect(onConnected).not.toHaveBeenCalled();
    }
  );

  it("reports a save failure without blocking the accepted duel", async () => {
    const { receive } = connectedSession();
    const error = new Error("Write denied");
    jest
      .mocked(challengeRequestRepository.updateStatus)
      .mockRejectedValueOnce(error);
    const report = jest.spyOn(console, "error").mockImplementation(() => {});
    const onConnected = jest.fn();
    try {
      await render(
        <ConnectingScreen
          currentUser={{ displayName: "Guest", uid: "guest-1" }}
          handoff={handoff}
          onConnected={onConnected}
          onExit={jest.fn()}
          request={Promise.resolve({ requestId: "request-1" })}
        />
      );
      await act(async () => receive({ type: "challengeAccepted" }));
      expect(report).toHaveBeenCalledWith(
        "Failed to update challenge request:",
        error
      );
      expect(onConnected).toHaveBeenCalledTimes(1);
    } finally {
      report.mockRestore();
    }
  });
});
