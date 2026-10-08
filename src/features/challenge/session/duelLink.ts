import type { DuelChannel, DuelMessage } from "../../../contracts/duelChannel";
import type { DuelLink, DuelLinkStatus } from "../../../contracts/duelLink";
import type { DuelTransportConnection } from "./duelSessionTransport";

/**
 * How long a goodbye gets to cross the DataChannel before the network under it
 * (an Android hotspot) is torn down.
 */
const RELEASE_AFTER_GOODBYE_MS = 1000;

type DuelLinkOptions = {
  connection: DuelTransportConnection;
  /** Re-runs the signaling handshake for a fresh connection to the same peer. */
  reconnect: (signal: AbortSignal) => Promise<DuelTransportConnection>;
  /** Frees what the session held beyond the connection, e.g. a hotspot. */
  release?: () => void;
};

/**
 * Owns one duel session's connection. Duel code talks to the stable `channel`;
 * a reconnect swaps the DataChannel underneath it.
 */
export function createDuelLink({
  connection: initialConnection,
  reconnect,
  release = () => undefined
}: DuelLinkOptions): DuelLink {
  const messageHandlers = new Set<(message: DuelMessage) => void>();
  const dropHandlers = new Set<() => void>();
  const peerLeftHandlers = new Set<() => void>();
  let current = initialConnection;
  let linkStatus: DuelLinkStatus = "live";
  const isOver = () => linkStatus === "peerLeft" || linkStatus === "closed";

  const end = (finalStatus: "peerLeft" | "closed", goodbyeSent = false) => {
    linkStatus = finalStatus;
    current.disconnect();
    if (goodbyeSent) setTimeout(release, RELEASE_AFTER_GOODBYE_MS);
    else release();
  };

  const attach = (connection: DuelTransportConnection) => {
    connection.channel.onMessage((message) => {
      if (message.type === "leave") {
        if (isOver()) return;
        end("peerLeft");
        for (const handler of peerLeftHandlers) handler();
        return;
      }
      for (const handler of messageHandlers) handler(message);
    });
    connection.onDrop(() => {
      if (connection !== current || linkStatus !== "live") return;
      linkStatus = "dropped";
      connection.disconnect();
      for (const handler of dropHandlers) handler();
    });
  };
  attach(initialConnection);

  const channel: DuelChannel = {
    send: (message) => current.channel.send(message),
    onMessage: (handler) => {
      messageHandlers.add(handler);
      return () => messageHandlers.delete(handler);
    },
    isConnected: () => linkStatus === "live" && current.channel.isConnected()
  };

  return {
    channel,
    status: () => linkStatus,
    onDrop: (handler) => {
      dropHandlers.add(handler);
      return () => dropHandlers.delete(handler);
    },
    onPeerLeft: (handler) => {
      peerLeftHandlers.add(handler);
      return () => peerLeftHandlers.delete(handler);
    },
    async reconnect(signal) {
      if (isOver()) return false;
      const next = await reconnect(signal);
      // The player left (or gave up) while this handshake was in flight.
      if (isOver()) {
        next.disconnect();
        return false;
      }
      current = next;
      linkStatus = "live";
      attach(next);
      return true;
    },
    leave() {
      if (isOver()) return;
      let goodbyeSent = false;
      try {
        current.channel.send({ type: "leave" });
        goodbyeSent = true;
      } catch {
        // Already dropped: the opponent's recovery will give up on its own.
      }
      end("closed", goodbyeSent);
    }
  };
}
