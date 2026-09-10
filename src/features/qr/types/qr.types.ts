/** Payload encoded into a player's QR invite, decoded by whoever scans it. */
export type QrInvitePayload = {
  type: "pocket-draw/invite";
  version: 1;
  matchId: string;
  hostPlayerId: string;
  hostPlayerName?: string;
  challengeToken: string;
  issuedAt: number;
  expiresAt: number;
  transport: "ble";
  ble: {
    discoveryToken: string;
  };
};

/** Reasons a QR invite payload can fail validation, reported back to the caller. */
export type QrValidationErrorCode =
  | "TOO_LARGE"
  | "MALFORMED_JSON"
  | "INVALID_PAYLOAD"
  | "UNSUPPORTED_VERSION"
  | "UNSUPPORTED_TRANSPORT"
  | "EXPIRED"
  | "INVALID_TIME"
  | "SELF_INVITE";

export type QrValidationResult =
  | { ok: true; value: QrInvitePayload }
  | { ok: false; code: QrValidationErrorCode };
