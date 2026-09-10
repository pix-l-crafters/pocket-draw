// Field checks and full-invite validation for QR invite payloads parsed from
// untrusted JSON. These checks do not verify that a BLE host session is
// active or that a token was securely generated.

import type { QrInvitePayload, QrValidationResult } from "../types/qr.types";

const MAX_QR_PAYLOAD_LENGTH = 550;
const INVITE_LIFETIME_MS = 60_000;
const MAX_CLOCK_SKEW_MS = 30_000;

/** Narrow unknown input to a non-null, non-array object before reading fields. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reject non-strings and blank strings without modifying the original value. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Check the application discriminator; this alone does not validate an invite. */
export function hasInviteType(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return value.type === "pocket-draw/invite";
}

/** Accept only numeric version 1; the string "1" is not supported. */
export function hasSupportedVersion(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return value.version === 1;
}

/** Require a non-blank Firebase UID of at most 128 UTF-16 code units, not a UUID. */
export function hasValidHostPlayerId(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isNonEmptyString(value.hostPlayerId) && value.hostPlayerId.length <= 128
  );
}

/** Allow an omitted display name; otherwise require a non-blank string of at most 64 UTF-16 code units. */
export function hasValidHostPlayerName(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  // A missing optional property is read as undefined.
  if (value.hostPlayerName === undefined) {
    return true;
  }
  return (
    isNonEmptyString(value.hostPlayerName) && value.hostPlayerName.length <= 64
  );
}

/** Check the format of a 16-byte token encoded as 32 lowercase hexadecimal characters. */
export function hasValidChallengeToken(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.challengeToken === "string" &&
    /^[0-9a-f]{32}$/.test(value.challengeToken)
  );
}

/** Check the nested BLE routing hint: 4 bytes encoded as 8 lowercase hexadecimal characters. */
export function hasValidDiscoveryToken(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  // Validate the nested object before accessing discoveryToken.
  if (!isRecord(value.ble)) {
    return false;
  }
  return (
    typeof value.ble.discoveryToken === "string" &&
    /^[0-9a-f]{8}$/.test(value.ble.discoveryToken)
  );
}

/** Accept only BLE transport for the current invite protocol. */
export function hasSupportedTransport(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return value.transport === "ble";
}

/** Accept UUID v4 syntax with either lowercase or uppercase hexadecimal characters. */
export function hasValidMatchId(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.matchId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.matchId
    )
  );
}

/** Check timestamp number formats only; lifetime and expiry are checked separately. */
export function hasValidTimestampFields(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return (
    Number.isSafeInteger(value.issuedAt) &&
    Number.isSafeInteger(value.expiresAt)
  );
}

/** Require the invite's issued/expiry gap to be exactly the fixed one-minute lifetime. */
export function hasValidLifetime(issuedAt: number, expiresAt: number): boolean {
  return expiresAt - issuedAt === INVITE_LIFETIME_MS;
}

/** Check whether an invite has passed its expiry time relative to the given clock reading. */
export function isInviteExpired(expiresAt: number, now: number): boolean {
  return now >= expiresAt;
}

/** Guard against clock-skewed or forged invites issued more than 30 seconds ahead of now. */
export function isIssuedTooFarInFuture(issuedAt: number, now: number): boolean {
  return issuedAt - now > MAX_CLOCK_SKEW_MS;
}

export function validateQrInvite(
  value: unknown,
  currentUserId: string,
  now: number
): QrValidationResult {
  if (!isRecord(value)) {
    return { ok: false, code: "INVALID_PAYLOAD" };
  }
  if (!hasInviteType(value)) {
    return { ok: false, code: "INVALID_PAYLOAD" };
  }
  if (!hasSupportedVersion(value)) {
    return { ok: false, code: "UNSUPPORTED_VERSION" };
  }
  if (!hasSupportedTransport(value)) {
    return { ok: false, code: "UNSUPPORTED_TRANSPORT" };
  }
  if (
    !hasValidMatchId(value) ||
    !hasValidHostPlayerId(value) ||
    !hasValidHostPlayerName(value) ||
    !hasValidChallengeToken(value) ||
    !hasValidDiscoveryToken(value)
  ) {
    return { ok: false, code: "INVALID_PAYLOAD" };
  }
  if (
    typeof value.issuedAt !== "number" ||
    typeof value.expiresAt !== "number" ||
    !hasValidTimestampFields(value)
  ) {
    return { ok: false, code: "INVALID_TIME" };
  }
  if (
    isIssuedTooFarInFuture(value.issuedAt, now) ||
    !hasValidLifetime(value.issuedAt, value.expiresAt)
  ) {
    // Clock skew too large, or the lifetime isn't the fixed one minute.
    return { ok: false, code: "INVALID_TIME" };
  }
  if (isInviteExpired(value.expiresAt, now)) {
    return { ok: false, code: "EXPIRED" };
  }
  if (value.hostPlayerId === currentUserId) {
    return { ok: false, code: "SELF_INVITE" };
  }
  return { ok: true, value: value as QrInvitePayload };
}

/** Parse and validate a QR invite from its raw encoded string form. */
export function parseQrInvite(
  raw: string,
  currentUserId: string,
  now: number
): QrValidationResult {
  if (raw.length > MAX_QR_PAYLOAD_LENGTH) {
    return { ok: false, code: "TOO_LARGE" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, code: "MALFORMED_JSON" };
  }
  return validateQrInvite(parsed, currentUserId, now);
}
