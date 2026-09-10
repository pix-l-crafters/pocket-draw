import * as Crypto from "expo-crypto";

const HEX_ALPHABET = "0123456789abcdef";

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) {
    out += HEX_ALPHABET[byte >> 4] + HEX_ALPHABET[byte & 0x0f];
  }
  return out;
}

/** A random 32-hex-character challenge token (16 bytes), matching hasValidChallengeToken. */
export function generateChallengeToken(): string {
  return toHex(Crypto.getRandomBytes(16));
}

/** A random 8-hex-character BLE discovery token (4 bytes), matching hasValidDiscoveryToken. */
export function generateDiscoveryToken(): string {
  return toHex(Crypto.getRandomBytes(4));
}

/** A random UUID v4 match id, matching hasValidMatchId. */
export function generateMatchId(): string {
  return Crypto.randomUUID();
}
