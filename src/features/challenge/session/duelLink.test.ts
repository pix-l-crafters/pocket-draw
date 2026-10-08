import type { DuelMessage } from "../../../contracts/duelChannel";
import { createDuelLink } from "./duelLink";
import type { DuelTransportConnection } from "./duelSessionTransport";

/** One end of a DataChannel: what this phone sent, and hooks for the network. */
function fakeConnection() {
  const handlers = new Set<(message: DuelMessage) => void>();
  const dropHandlers: Array<(message: string) => void> = [];
  const sent: DuelMessage[] = [];
  let open = true;
  const disconnect = jest.fn(() => {
    open = false;
    handlers.clear();
  });
  const connection: DuelTransportConnection = {
    channel: {
      send: (message) => {
        if (!open) throw new Error("The local duel connection is not open.");
        sent.push(message);
      },
      onMessage: (handler) => {
        handlers.add(handler);
        return () => handlers.delete(handler);
      },
      isConnected: () => open
    },
    onDrop: (handler) => {
      dropHandlers.push(handler);
    },
    disconnect
  };
  return {
    connection,
    disconnect,
    sent,
    receive: (message: DuelMessage) =>
      handlers.forEach((handler) => handler(message)),
    drop: () => {
      open = false;
      dropHandlers.forEach((handler) => handler("lost"));
    }
  };
}

describe("createDuelLink", () => {
  it("keeps duel listeners attached across a reconnect", async () => {
    const first = fakeConnection();
    const second = fakeConnection();
    const link = createDuelLink({
      connection: first.connection,
      reconnect: async () => second.connection
    });
    const received: DuelMessage[] = [];
    link.channel.onMessage((message) => received.push(message));
    const drops = jest.fn();
    link.onDrop(drops);

    first.drop();
    expect(drops).toHaveBeenCalledTimes(1);
    expect(link.channel.isConnected()).toBe(false);
    expect(link.status()).toBe("dropped");

    await expect(link.reconnect(new AbortController().signal)).resolves.toBe(
      true
    );
    second.receive({ type: "ready" });
    link.channel.send({ type: "countdown", value: 3 });

    expect(received).toEqual([{ type: "ready" }]);
    expect(second.sent).toEqual([{ type: "countdown", value: 3 }]);
    expect(link.status()).toBe("live");
  });
});

describe("createDuelLink when a player leaves", () => {
  it("treats the opponent leaving as final, not as a drop to recover from", () => {
    const connection = fakeConnection();
    const release = jest.fn();
    const link = createDuelLink({
      connection: connection.connection,
      reconnect: async () => fakeConnection().connection,
      release
    });
    const received: DuelMessage[] = [];
    link.channel.onMessage((message) => received.push(message));
    const drops = jest.fn();
    const peerLeft = jest.fn();
    link.onDrop(drops);
    link.onPeerLeft(peerLeft);

    connection.receive({ type: "leave" });
    connection.drop();

    expect(peerLeft).toHaveBeenCalledTimes(1);
    expect(drops).not.toHaveBeenCalled();
    expect(received).toEqual([]);
    expect(link.status()).toBe("peerLeft");
    expect(connection.disconnect).toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(1);
  });
});

describe("createDuelLink when this player leaves", () => {
  afterEach(() => jest.useRealTimers());

  it("tells the opponent, then releases the network once the goodbye can flush", () => {
    jest.useFakeTimers();
    const connection = fakeConnection();
    const release = jest.fn();
    const link = createDuelLink({
      connection: connection.connection,
      reconnect: async () => fakeConnection().connection,
      release
    });

    link.leave();
    link.leave();

    expect(connection.sent).toEqual([{ type: "leave" }]);
    expect(connection.disconnect).toHaveBeenCalled();
    expect(link.status()).toBe("closed");
    // Tearing a hotspot down at once would cut the goodbye off mid-flight.
    expect(release).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("refuses to reconnect once the session is over, even mid-handshake", async () => {
    const late = fakeConnection();
    let finishReconnect!: (connection: DuelTransportConnection) => void;
    const reconnect = jest.fn(
      () =>
        new Promise<DuelTransportConnection>((resolve) => {
          finishReconnect = resolve;
        })
    );
    const link = createDuelLink({
      connection: fakeConnection().connection,
      reconnect
    });

    const inFlight = link.reconnect(new AbortController().signal);
    link.leave();
    finishReconnect(late.connection);
    await expect(inFlight).resolves.toBe(false);
    expect(late.disconnect).toHaveBeenCalled();

    await expect(link.reconnect(new AbortController().signal)).resolves.toBe(
      false
    );
    expect(reconnect).toHaveBeenCalledTimes(1);
    expect(link.status()).toBe("closed");
  });

  it("releases the session straight away when the goodbye cannot be sent", () => {
    const connection = fakeConnection();
    const release = jest.fn();
    const link = createDuelLink({
      connection: connection.connection,
      reconnect: async () => fakeConnection().connection,
      release
    });

    connection.drop();
    link.leave();

    expect(release).toHaveBeenCalledTimes(1);
    expect(link.status()).toBe("closed");
  });
});
