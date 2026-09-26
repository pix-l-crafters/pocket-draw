import { renderHook, waitFor } from "@testing-library/react-native";

import type { DuelChannel } from "../../../contracts/duelChannel";
import type {
  DuelSessionTransport,
  DuelTransportConnection
} from "../session/duelSessionTransport";
import { useDuelSession } from "./useDuelSession";

const params = {
  role: "guest",
  matchId: "match-1",
  discoveryToken: "token-1",
  opponentId: "opponent-1"
} as const;

function createTransport() {
  const disconnect = jest.fn();
  const channel: DuelChannel = {
    send: jest.fn(),
    onMessage: () => () => {},
    isConnected: () => true
  };
  const connection: DuelTransportConnection = {
    channel,
    onDrop: () => {},
    disconnect
  };
  const transport: DuelSessionTransport = {
    connect: () => Promise.resolve(connection)
  };
  return { transport, disconnect, channel };
}

describe("useDuelSession", () => {
  test("keeps a handed-off channel open when the screen unmounts", async () => {
    const { transport, disconnect } = createTransport();
    const view = await renderHook(() => useDuelSession(params, transport));

    await waitFor(() =>
      expect(view.result.current?.state.status).toBe("connected")
    );

    // The duel outlives the connecting screen: handing the channel off must
    // stop unmount from closing it, or the first send of the round throws.
    view.result.current?.handOff();
    await view.unmount();

    expect(disconnect).not.toHaveBeenCalled();
  });

  test("closes a channel that was never handed off", async () => {
    const { transport, disconnect } = createTransport();
    const view = await renderHook(() => useDuelSession(params, transport));

    await waitFor(() =>
      expect(view.result.current?.state.status).toBe("connected")
    );
    await view.unmount();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
