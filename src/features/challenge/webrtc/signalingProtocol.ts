export type WebRtcSessionAuth = {
  matchId: string;
  challengeToken: string;
  discoveryToken: string;
};

export type SessionDescription = {
  type: "offer" | "answer";
  sdp: string;
};

export type IceCandidateDescription = {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
};

export type SignalingMessage =
  | ({ type: "auth" } & WebRtcSessionAuth)
  | { type: "auth-ok" }
  | { type: "offer"; sdp: string }
  | { type: "answer"; sdp: string }
  | { type: "ice-candidate"; candidate: IceCandidateDescription }
  | { type: "ice-complete" }
  | { type: "error"; code: "UNAUTHORIZED" | "PROTOCOL"; message: string };

const MAX_SIGNALING_FRAME_LENGTH = 65_536;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isIceCandidate(value: unknown): value is IceCandidateDescription {
  if (!isRecord(value) || !isNonEmptyString(value.candidate)) return false;
  if (
    value.sdpMid !== undefined &&
    value.sdpMid !== null &&
    typeof value.sdpMid !== "string"
  ) {
    return false;
  }
  if (
    value.sdpMLineIndex !== undefined &&
    value.sdpMLineIndex !== null &&
    !Number.isInteger(value.sdpMLineIndex)
  ) {
    return false;
  }
  if (
    value.usernameFragment !== undefined &&
    value.usernameFragment !== null &&
    typeof value.usernameFragment !== "string"
  ) {
    return false;
  }
  return true;
}

export function isSignalingMessage(value: unknown): value is SignalingMessage {
  if (!isRecord(value) || typeof value.type !== "string") return false;

  switch (value.type) {
    case "auth":
      return (
        isNonEmptyString(value.matchId) &&
        isNonEmptyString(value.challengeToken) &&
        isNonEmptyString(value.discoveryToken)
      );
    case "auth-ok":
    case "ice-complete":
      return true;
    case "offer":
    case "answer":
      return isNonEmptyString(value.sdp);
    case "ice-candidate":
      return isIceCandidate(value.candidate);
    case "error":
      return (
        (value.code === "UNAUTHORIZED" || value.code === "PROTOCOL") &&
        isNonEmptyString(value.message)
      );
    default:
      return false;
  }
}

export function encodeSignalingMessage(message: SignalingMessage): string {
  return `${JSON.stringify(message)}\n`;
}

export class SignalingFrameDecoder {
  private buffered = "";

  push(chunk: string): SignalingMessage[] {
    this.buffered += chunk;
    if (this.buffered.length > MAX_SIGNALING_FRAME_LENGTH) {
      throw new Error("Signaling frame is too large.");
    }

    const frames: SignalingMessage[] = [];
    let newlineIndex = this.buffered.indexOf("\n");
    while (newlineIndex >= 0) {
      const rawFrame = this.buffered.slice(0, newlineIndex);
      this.buffered = this.buffered.slice(newlineIndex + 1);
      if (rawFrame.length > 0) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(rawFrame);
        } catch {
          throw new Error("Invalid signaling message.");
        }
        if (!isSignalingMessage(parsed)) {
          throw new Error("Invalid signaling message.");
        }
        frames.push(parsed);
      }
      newlineIndex = this.buffered.indexOf("\n");
    }
    return frames;
  }
}

function constantTimeStringEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |=
      (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export function isAuthorizedPeer(
  expected: WebRtcSessionAuth,
  received: WebRtcSessionAuth
): boolean {
  return (
    constantTimeStringEqual(expected.matchId, received.matchId) &&
    constantTimeStringEqual(expected.challengeToken, received.challengeToken) &&
    constantTimeStringEqual(expected.discoveryToken, received.discoveryToken)
  );
}
