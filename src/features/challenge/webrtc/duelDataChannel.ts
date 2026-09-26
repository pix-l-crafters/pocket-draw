import type { DuelChannel, DuelMessage } from "../../../contracts/duelChannel";
import type { DuelTransportConnection } from "../session/duelSessionTransport";

export interface RtcDataChannelLike {
  readyState: string;
  send(data: string): void;
  close(): void;
  onopen?: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: ((event: unknown) => void) | null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isDuelMessage(value: unknown): value is DuelMessage {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const message = value as Record<string, unknown>;
  switch (message.type) {
    case "ready":
      return true;
    case "buzz":
      return isFiniteNumber(message.delayMs) && message.delayMs >= 0;
    case "countdown":
      return message.value === 3 || message.value === 2 || message.value === 1;
    case "fire":
    case "raised":
    case "falseStart":
      return isFiniteNumber(message.atMs) && message.atMs >= 0;
    default:
      return false;
  }
}

export function createDuelDataChannelConnection(
  rtcChannel: RtcDataChannelLike
): DuelTransportConnection {
  const messageHandlers = new Set<(message: DuelMessage) => void>();
  const dropHandlers = new Set<(message: string) => void>();
  let disconnectedLocally = false;
  let dropReported = false;

  const reportDrop = () => {
    if (disconnectedLocally || dropReported) return;
    dropReported = true;
    for (const handler of dropHandlers) {
      handler("The local duel connection was lost.");
    }
  };

  rtcChannel.onmessage = ({ data }) => {
    if (typeof data !== "string") return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (!isDuelMessage(parsed)) return;
    for (const handler of messageHandlers) handler(parsed);
  };
  rtcChannel.onclose = reportDrop;
  rtcChannel.onerror = reportDrop;

  const channel: DuelChannel = {
    send(message) {
      if (rtcChannel.readyState !== "open") {
        throw new Error("The local duel connection is not open.");
      }
      rtcChannel.send(JSON.stringify(message));
    },
    onMessage(handler) {
      messageHandlers.add(handler);
      return () => messageHandlers.delete(handler);
    },
    isConnected() {
      return rtcChannel.readyState === "open";
    }
  };

  return {
    channel,
    onDrop(handler) {
      dropHandlers.add(handler);
    },
    disconnect() {
      disconnectedLocally = true;
      messageHandlers.clear();
      dropHandlers.clear();
      rtcChannel.close();
    }
  };
}
