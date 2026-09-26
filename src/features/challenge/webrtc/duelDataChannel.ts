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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function isDuelMessage(value: unknown): value is DuelMessage {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const message = value as Record<string, unknown>;
  switch (message.type) {
    case "ready":
    case "challengeAccepted":
    case "challengeDeclined":
      return true;
    case "challenge":
      return (
        isNonEmptyString(message.playerId) &&
        isNonEmptyString(message.playerName)
      );
    case "countdown":
      return message.value === 3 || message.value === 2 || message.value === 1;
    case "raised":
      return (
        isFiniteNumber(message.atMs) &&
        message.atMs >= 0 &&
        isFiniteNumber(message.reactionMs) &&
        message.reactionMs >= 0
      );
    case "fire":
    case "falseStart":
      return isFiniteNumber(message.atMs) && message.atMs >= 0;
    case "clockPing":
      return isFiniteNumber(message.t0);
    case "clockPong":
      return (
        isFiniteNumber(message.t0) &&
        isFiniteNumber(message.t1) &&
        isFiniteNumber(message.t2)
      );
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
