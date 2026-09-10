// Field checks and full-invite validation for QR invite payloads parsed from
// untrusted JSON. These checks do not verify that a BLE host session is
// active or that a token was securely generated.
// Console examples are temporary learning checks, not automated assertions.

import type { QrInvitePayload, QrValidationResult } from "../types/qr.types";
/** Narrow unknown input to a non-null, non-array object before reading fields. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && // Exclude primitive values;
    value !== null && //Exclude null;
    !Array.isArray(value) //Exclude arrays;
  );
}
// Expected: true, false, false, false (object, null, array, string).
console.log(isRecord({ version: 1 }));
console.log(isRecord(null));
console.log(isRecord([]));
console.log(isRecord("hello"));

/** Reject non-strings and blank strings without modifying the original value. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
// Expected: true, false, false (name, blank string, number).
console.log(isNonEmptyString("Alex"));
console.log(isNonEmptyString(" "));
console.log(isNonEmptyString(123));

/** Check the application discriminator; this alone does not validate an invite. */
export function hasInviteType(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return value.type === "pocket-draw/invite";
}

// Expected: true, false, false (our application, another application, null).
console.log(hasInviteType({ type: "pocket-draw/invite" }));
console.log(hasInviteType({ type: "another-app" }));
console.log(hasInviteType(null));

/** Accept only numeric version 1; the string "1" is not supported. */
export function hasSupportedVersion(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return value.version === 1;
}

// Expected: true, false, false (numeric 1, string "1", unsupported version).
console.log(hasSupportedVersion({ version: 1 }));
console.log(hasSupportedVersion({ version: "1" }));
console.log(hasSupportedVersion({ version: 2 }));

/** Require a non-blank Firebase UID of at most 128 UTF-16 code units, not a UUID. */
export function hasValidHostPlayerId(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isNonEmptyString(value.hostPlayerId) && value.hostPlayerId.length <= 128
  );
}

// Expected: true, then five false results (blank, number, missing, null, too long).
console.log(hasValidHostPlayerId({ hostPlayerId: "test-host-002" }));
console.log(hasValidHostPlayerId({ hostPlayerId: "   " }));
console.log(hasValidHostPlayerId({ hostPlayerId: 123 }));
console.log(hasValidHostPlayerId({}));
console.log(hasValidHostPlayerId(null));
console.log(hasValidHostPlayerId({ hostPlayerId: "a".repeat(129) }));

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
// Expected: true, true, then four false results (omitted and valid names are accepted).
console.log(hasValidHostPlayerName({}));
console.log(hasValidHostPlayerName({ hostPlayerName: "Alex" }));
console.log(hasValidHostPlayerName({ hostPlayerName: "   " }));
console.log(hasValidHostPlayerName({ hostPlayerName: 123 }));
console.log(hasValidHostPlayerName({ hostPlayerName: "a".repeat(65) }));
console.log(hasValidHostPlayerName(null));

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
// Expected: true, then seven false results (length, characters, type and missing data).
console.log(hasValidChallengeToken({ challengeToken: "a".repeat(32) })); // gitleaks:allow fixed example token, not a real secret
console.log(hasValidChallengeToken({ challengeToken: "a".repeat(31) }));
console.log(hasValidChallengeToken({ challengeToken: "a".repeat(33) }));
console.log(hasValidChallengeToken({ challengeToken: "g".repeat(32) }));
console.log(hasValidChallengeToken({ challengeToken: "A".repeat(32) }));
console.log(hasValidChallengeToken({ challengeToken: 123 }));
console.log(hasValidChallengeToken({}));
console.log(hasValidChallengeToken(null));

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
// Expected: true, then eight false results, including invalid or missing nested objects.
console.log(hasValidDiscoveryToken({ ble: { discoveryToken: "a71c9b82" } }));
console.log(hasValidDiscoveryToken({ ble: { discoveryToken: "a".repeat(7) } }));
console.log(hasValidDiscoveryToken({ ble: { discoveryToken: "a".repeat(9) } }));
console.log(hasValidDiscoveryToken({ ble: { discoveryToken: "gggggggg" } }));
console.log(hasValidDiscoveryToken({ ble: { discoveryToken: 123 } }));
console.log(hasValidDiscoveryToken({ ble: {} }));
console.log(hasValidDiscoveryToken({ ble: null }));
console.log(hasValidDiscoveryToken({}));
console.log(hasValidDiscoveryToken(null));

/** Accept only BLE transport for the current invite protocol. */
export function hasSupportedTransport(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return value.transport === "ble";
}

// Expected: true, false, false, false (BLE, Wi-Fi, missing transport, null).
console.log(hasSupportedTransport({ transport: "ble" }));
console.log(hasSupportedTransport({ transport: "wifi" }));
console.log(hasSupportedTransport({}));
console.log(hasSupportedTransport(null));

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

// Expected: true, true, then five false results (both letter cases are accepted).
console.log(
  hasValidMatchId({ matchId: "d970d475-0992-4e92-86df-b44c1f8115a9" })
);
console.log(
  hasValidMatchId({ matchId: "D970D475-0992-4E92-86DF-B44C1F8115A9" })
);
console.log(hasValidMatchId({ matchId: "test-match-001" }));
console.log(
  hasValidMatchId({ matchId: "d970d475-0992-5e92-86df-b44c1f8115a9" })
);
console.log(hasValidMatchId({ matchId: 123 }));
console.log(hasValidMatchId({}));
console.log(hasValidMatchId(null));

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

// Fixed values keep these examples repeatable without depending on the current time.
// Expected: true, then eight false results.
console.log(
  hasValidTimestampFields({ issuedAt: 1_000_000, expiresAt: 1_120_000 })
);
console.log(
  hasValidTimestampFields({ issuedAt: "1000000", expiresAt: 1_120_000 })
);
console.log(hasValidTimestampFields({ issuedAt: 1_000_000, expiresAt: 1.5 }));
console.log(hasValidTimestampFields({ issuedAt: NaN, expiresAt: 1_120_000 }));
console.log(
  hasValidTimestampFields({ issuedAt: 1_000_000, expiresAt: Infinity })
);
console.log(
  hasValidTimestampFields({
    issuedAt: 1_000_000,
    expiresAt: Number.MAX_SAFE_INTEGER + 1
  })
);
console.log(hasValidTimestampFields({ issuedAt: 1_000_000 }));
console.log(hasValidTimestampFields({}));
console.log(hasValidTimestampFields(null));

/** Require the invite's issued/expiry gap to be exactly the fixed one-minute lifetime. */
export function hasValidLifetime(issuedAt: number, expiresAt: number): boolean {
  // Return whether the lifetime is exactly one minute.
  return expiresAt - issuedAt === 60_000;
}

/** Check whether an invite has passed its expiry time relative to the given clock reading. */
export function isInviteExpired(expiresAt: number, now: number): boolean {
  // An invite is expired at or after its expiry time.
  return now >= expiresAt;
}
console.log(isInviteExpired(1_120_000, 1_119_999)); // false: before expiry
console.log(isInviteExpired(1_120_000, 1_120_000)); // true: exactly at expiry
console.log(isInviteExpired(1_120_000, 1_120_001)); // true: after expiry

/** Guard against clock-skewed or forged invites issued more than 30 seconds ahead of now. */
export function isIssuedTooFarInFuture(issuedAt: number, now: number): boolean {
  // Reject issue times more than 30 seconds ahead of the local clock.
  return issuedAt - now > 30_000;
}
console.log(isIssuedTooFarInFuture(1_029_999, 1_000_000)); // false
console.log(isIssuedTooFarInFuture(1_030_000, 1_000_000)); // false
console.log(isIssuedTooFarInFuture(1_030_001, 1_000_000)); // true

export function validateQrInvite(
  value: unknown,
  currentUserId: string,
  now: number
): QrValidationResult {
  if (!isRecord(value)) {
    //是不是对象
    return { ok: false, code: "INVALID_PAYLOAD" };
  }
  if (!hasInviteType(value)) {
    //是不是我们应用的邀请
    return { ok: false, code: "INVALID_PAYLOAD" };
  }
  if (!hasSupportedVersion(value)) {
    //版本是否支持？
    return { ok: false, code: "UNSUPPORTED_VERSION" };
  }
  if (!hasSupportedTransport(value)) {
    //连接方式是否支持？
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
    //时钟偏移过大，或有效期不是固定的一分钟
    return { ok: false, code: "INVALID_TIME" };
  }
  if (isInviteExpired(value.expiresAt, now)) {
    //二维码已过期
    return { ok: false, code: "EXPIRED" };
  }
  if (value.hostPlayerId === currentUserId) {
    //不能扫描自己发起的邀请
    return { ok: false, code: "SELF_INVITE" };
  }
  return { ok: true, value: value as QrInvitePayload };
}

// Fixed values keep these examples repeatable without depending on the current time.
const validInvite = {
  type: "pocket-draw/invite",
  version: 1,
  matchId: "d970d475-0992-4e92-86df-b44c1f8115a9",
  hostPlayerId: "test-host-002",
  hostPlayerName: "Alex",
  challengeToken: "9f08bc127e44a031b69307dc84f2a658", // gitleaks:allow fixed example token, not a real secret
  issuedAt: 1_000_000,
  expiresAt: 1_060_000,
  transport: "ble",
  ble: { discoveryToken: "a71c9b82" }
};
// Expected: ok, then EXPIRED, INVALID_TIME (too far ahead), SELF_INVITE, INVALID_PAYLOAD (not an object).
console.log(validateQrInvite(validInvite, "some-other-user", 1_000_500));
console.log(validateQrInvite(validInvite, "some-other-user", 1_060_000));
console.log(
  validateQrInvite(
    { ...validInvite, issuedAt: 1_100_000, expiresAt: 1_160_000 },
    "some-other-user",
    1_000_000
  )
);
console.log(validateQrInvite(validInvite, "test-host-002", 1_000_500));
console.log(validateQrInvite(null, "some-other-user", 1_000_500));

// parseQrInvite Large threshold - 525 round up 550, 给一点留余量
export function parseQrInvite(
  raw: string,
  currentUserId: string,
  now: number // Date.now() 现在的时间戳
): QrValidationResult {
  let parsed: unknown;
  const MAX_QR_PAYLOAD_LENGTH = 550;
  if (raw.length > MAX_QR_PAYLOAD_LENGTH) {
    return { ok: false, code: "TOO_LARGE" };
  }
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, code: "MALFORMED_JSON" };
  }
  return validateQrInvite(parsed, currentUserId, now); //最后一步 validateQrInvite 的返回值本身就是 QrValidationResult 类型，跟这个函数要返回的类型一致，可以直接 return。
}
// Expected: ok
const encodedValidInvite = JSON.stringify(validInvite);
console.log(parseQrInvite(encodedValidInvite, "some-other-user", 1_000_500));

//Expected: MALFORMED_JSON
console.log(parseQrInvite(encodedValidInvite, "some-other-user", 1_000_500));
//Expected: TOO_LARGE
console.log(
  parseQrInvite(MAX_QR_PAYLOAD_LENGTH + 1, "some-other-user", 1_000_500)
);
