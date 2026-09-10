import type { ChallengeHandoff } from "../challengeHandoff";

/**
 * Stand-in for a completed QR scan, so the challenge send/accept flow
 * (3.4-3.6, 3.8) can be built before the real scanner (3.2) exists. Delete
 * once it lands.
 */
export function mockChallengeHandoff(
  challengerId: string,
  scannedPlayerId: string
): ChallengeHandoff {
  return { challengerId, scannedPlayerId, roundCount: 3 };
}
