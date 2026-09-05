// Individual field checks for QR invite payloads parsed from untrusted JSON.
// These checks do not yet validate timestamps or a complete invite, and do not
// verify that a BLE host session is active or that a token was securely generated.
// Console examples are temporary learning checks, not automated assertions.

/** Narrow unknown input to a non-null, non-array object before reading fields. */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === "object" && // Exclude primitive values;
        value !== null &&            //Exclude null;
        !Array.isArray(value)        //Exclude arrays;
    ); 
}
// Expected: true, false, false, false (object, null, array, string).
console.log(isRecord({version: 1}));
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
export function hasInviteType (value: unknown): boolean {
    if(!isRecord(value)) {
        return false;
    }

    return value.type === "pocket-draw/invite";
}

// Expected: true, false, false (our application, another application, null).
console.log(hasInviteType({type: "pocket-draw/invite"}));
console.log(hasInviteType({type: "another-app"}));
console.log(hasInviteType(null));

/** Accept only numeric version 1; the string "1" is not supported. */
export function hasSupportedVersion(value: unknown): boolean {
    if(!isRecord(value)) {
        return false;
    }
    return value.version === 1;
}

// Expected: true, false, false (numeric 1, string "1", unsupported version).
console.log(hasSupportedVersion({version: 1}));
console.log(hasSupportedVersion({version: "1"}));
console.log(hasSupportedVersion({version: 2}));

/** Require a non-blank Firebase UID of at most 128 UTF-16 code units, not a UUID. */
export function hasValidHostPlayerId(value: unknown): boolean {
    if(!isRecord(value)) {
        return false;
    }
    return isNonEmptyString(value.hostPlayerId) && value.hostPlayerId.length <= 128
}

// Expected: true, then five false results (blank, number, missing, null, too long).
console.log(hasValidHostPlayerId({ hostPlayerId: "test-host-002" }));
console.log(hasValidHostPlayerId({ hostPlayerId: "   " }));
console.log(hasValidHostPlayerId({ hostPlayerId: 123 }));
console.log(hasValidHostPlayerId({}));
console.log(hasValidHostPlayerId(null));
console.log(hasValidHostPlayerId({ hostPlayerId: "a".repeat(129)}));

/** Allow an omitted display name; otherwise require a non-blank string of at most 64 UTF-16 code units. */
export function hasValidHostPlayerName(value: unknown): boolean{
    if(!isRecord(value)) {
        return false;
    }
    // A missing optional property is read as undefined.
    if(value.hostPlayerName === undefined) {
        return true;
    }
    return isNonEmptyString(value.hostPlayerName) && value.hostPlayerName.length <= 64;

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
    if(!isRecord(value)) {
        return false;
    }
    return typeof value.challengeToken === "string" && /^[0-9a-f]{32}$/.test(value.challengeToken)
}
// Expected: true, then seven false results (length, characters, type and missing data).
console.log(hasValidChallengeToken({ challengeToken: "9f08bc127e44a031b69307dc84f2a658" }));
console.log(hasValidChallengeToken({ challengeToken: "a".repeat(31) }));
console.log(hasValidChallengeToken({ challengeToken: "a".repeat(33) }));
console.log(hasValidChallengeToken({ challengeToken: "g".repeat(32) }));
console.log(hasValidChallengeToken({ challengeToken: "A".repeat(32) }));
console.log(hasValidChallengeToken({ challengeToken: 123 }));
console.log(hasValidChallengeToken({}));
console.log(hasValidChallengeToken(null));


/** Check the nested BLE routing hint: 4 bytes encoded as 8 lowercase hexadecimal characters. */
export function hasValidDiscoveryToken(value: unknown): boolean {
    if(!isRecord(value)) {
        return false;
    }
    // Validate the nested object before accessing discoveryToken.
    if(!isRecord(value.ble)) {
        return false;
    }
    return typeof value.ble.discoveryToken === "string" &&  /^[0-9a-f]{8}$/.test(value.ble.discoveryToken);

}
// Expected: true, then eight false results, including invalid or missing nested objects.
console.log(hasValidDiscoveryToken({ ble: { discoveryToken: "a71c9b82" } }));
console.log(hasValidDiscoveryToken({ ble: { discoveryToken: "a".repeat(7)} }));
console.log(hasValidDiscoveryToken({ ble: { discoveryToken: "a".repeat(9) }}));
console.log(hasValidDiscoveryToken({ ble: { discoveryToken: "gggggggg" }}));
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
   return typeof value.matchId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.matchId);
}

// Expected: true, true, then five false results (both letter cases are accepted).
console.log(hasValidMatchId({ matchId: "d970d475-0992-4e92-86df-b44c1f8115a9" }));
console.log(hasValidMatchId({ matchId: "D970D475-0992-4E92-86DF-B44C1F8115A9" }));
console.log(hasValidMatchId({ matchId: "test-match-001" }));
console.log(hasValidMatchId({ matchId: "d970d475-0992-5e92-86df-b44c1f8115a9" }));
console.log(hasValidMatchId({ matchId: 123 }));
console.log(hasValidMatchId({}));
console.log(hasValidMatchId(null));


/** Check timestamp number formats only; lifetime and expiry are checked separately. */
export function hasValidTimestampFields(value: unknown): boolean {
    if (!isRecord(value)) {
        return false;
    }
    return Number.isSafeInteger(value.issuedAt) &&
        Number.isSafeInteger(value.expiresAt);
}

// Fixed values keep these examples repeatable without depending on the current time.
// Expected: true, then eight false results.
console.log(hasValidTimestampFields({ issuedAt: 1_000_000, expiresAt: 1_120_000 }));
console.log(hasValidTimestampFields({ issuedAt: "1000000", expiresAt: 1_120_000 }));
console.log(hasValidTimestampFields({ issuedAt: 1_000_000, expiresAt: 1.5 }));
console.log(hasValidTimestampFields({ issuedAt: NaN, expiresAt: 1_120_000 }));
console.log(hasValidTimestampFields({ issuedAt: 1_000_000, expiresAt: Infinity }));
console.log(hasValidTimestampFields({ issuedAt: 1_000_000, expiresAt: Number.MAX_SAFE_INTEGER + 1 }));
console.log(hasValidTimestampFields({ issuedAt: 1_000_000 }));
console.log(hasValidTimestampFields({}));
console.log(hasValidTimestampFields(null));

/** Require the invite's issued/expiry gap to be exactly the fixed two-minute lifetime. */
export function hasValidLifetime(
    issuedAt: number,
    expiresAt: number
): boolean {
    // Return whether the lifetime is exactly two minutes.
    return expiresAt - issuedAt === 120_000;
}

/** Check whether an invite has passed its expiry time relative to the given clock reading. */
export function isInviteExpired(
    expiresAt: number,
    now: number
): boolean {
    // An invite is expired at or after its expiry time.
    return now >= expiresAt;
}
console.log(isInviteExpired(1_120_000, 1_119_999)); // false: before expiry
console.log(isInviteExpired(1_120_000, 1_120_000)); // true: exactly at expiry
console.log(isInviteExpired(1_120_000, 1_120_001)); // true: after expiry

/** Guard against clock-skewed or forged invites issued more than 30 seconds ahead of now. */
export function isIssuedTooFarInFuture(
    issuedAt: number,
    now: number
): boolean {
    // Reject issue times more than 30 seconds ahead of the local clock.
    return issuedAt - now > 30_000;
}
console.log(isIssuedTooFarInFuture(1_029_999, 1_000_000)); // false
console.log(isIssuedTooFarInFuture(1_030_000, 1_000_000)); // false
console.log(isIssuedTooFarInFuture(1_030_001, 1_000_000)); // true