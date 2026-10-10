import type { DuelChannel, DuelMessage } from "../../../contracts/duelChannel";
import type { MissReason } from "../../../contracts/roundOutcome";
import { MAX_ROUND_COUNT } from "../../duel/roundLoop";
import { hasValidMatchId } from "../../qr/utils/qr.validation";
import type { DuelTransportConnection } from "../session/duelSessionTransport";

/** A round key is a small JSON object; anything longer is not one of ours. */
const MAX_ROUND_KEY_LENGTH = 1024;
/** Upper bound on waiting for a closing DataChannel before closing its peer. */
const PEER_CLOSE_FALLBACK_MS = 1000;
/** `noShot` is decided at the window's edge, never fired over the wire. */
const FIRED_MISS_REASONS: ReadonlySet<unknown> = new Set<
  Exclude<MissReason, "noShot">
>([
  "tooLow",
  "tooHigh",
  "offTarget",
  "tiltUnavailable",
  "compassUnavailable",
  "locationUnavailable",
  "opponentLocationUnavailable",
  "trackingUnavailable"
]);

export interface RtcDataChannelLike {
  readyState: string;
  send(data: string): void;
  close(): void;
  onopen?: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: ((event: unknown) => void) | null;
}

/** The RTCPeerConnection under a DataChannel, which outlives the channel. */
export interface PeerLifecycle {
  /** Fires when the peer connection fails while the channel still looks open. */
  onFailure(handler: () => void): () => void;
  close(): void;
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
    case "leave":
      return true;
    case "rematchOffer":
    case "rematchAccept":
      return hasValidMatchId(message);
    case "noShot":
      return (
        hasValidMatchId(message) &&
        isFiniteNumber(message.roundNumber) &&
        Number.isInteger(message.roundNumber) &&
        message.roundNumber >= 1 &&
        message.roundNumber <= MAX_ROUND_COUNT
      );
    case "matchSync":
      return (
        hasValidMatchId(message) &&
        typeof message.reply === "boolean" &&
        Array.isArray(message.roundKeys) &&
        message.roundKeys.length <= MAX_ROUND_COUNT &&
        message.roundKeys.every(
          (key) => typeof key === "string" && key.length <= MAX_ROUND_KEY_LENGTH
        )
      );
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
        message.reactionMs >= 0 &&
        (message.zone === "miss" ||
          message.zone === "bodyshot" ||
          message.zone === "headshot") &&
        (message.missReason === undefined ||
          (message.zone === "miss" &&
            FIRED_MISS_REASONS.has(message.missReason)))
      );
    case "aimPosition":
      return (
        isFiniteNumber(message.latitude) &&
        message.latitude >= -90 &&
        message.latitude <= 90 &&
        isFiniteNumber(message.longitude) &&
        message.longitude >= -180 &&
        message.longitude <= 180 &&
        isFiniteNumber(message.accuracy) &&
        message.accuracy >= 0 &&
        isFiniteNumber(message.sampleAtMs) &&
        message.sampleAtMs >= 0
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
  rtcChannel: RtcDataChannelLike,
  peer?: PeerLifecycle
): DuelTransportConnection {
  const messageHandlers = new Set<(message: DuelMessage) => void>();
  const dropHandlers = new Set<(message: string) => void>();
  let disconnectedLocally = false;
  let dropReported = false;
  let peerClosed = false;
  let peerCloseFallback: ReturnType<typeof setTimeout> | undefined;

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
  // ICE can fail long before the DataChannel notices it is gone.
  const stopWatchingPeer = peer?.onFailure(reportDrop) ?? (() => undefined);

  const closePeer = () => {
    clearTimeout(peerCloseFallback);
    if (peerClosed) return;
    peerClosed = true;
    peer?.close();
  };

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
      if (disconnectedLocally) return;
      disconnectedLocally = true;
      messageHandlers.clear();
      dropHandlers.clear();
      stopWatchingPeer();
      if (rtcChannel.readyState === "closed") {
        closePeer();
        return;
      }
      // Closing the channel first lets a queued goodbye reach the opponent;
      // closing the peer connection straight away would discard it.
      rtcChannel.onclose = closePeer;
      peerCloseFallback = setTimeout(closePeer, PEER_CLOSE_FALLBACK_MS);
      rtcChannel.close();
    }
  };
}
