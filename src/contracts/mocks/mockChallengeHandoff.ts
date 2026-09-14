import type { ChallengeHandoff } from "../challengeHandoff";

/**
 * Stand-in for a completed QR scan + round selection, so the duel session
 * flow (3.8) can be built before the real scanner (3.2) and selector (3.4)
 * are wired. Delete once they land.
 */
export function mockChallengeHandoff(
  challengerId: string,
  scannedPlayerId: string
): ChallengeHandoff {
  return {
    challengerId,
    scannedPlayerId,
    scannedPlayerName: "Mock Opponent",
    roundCount: 3,
    matchId: `mock-match-${scannedPlayerId}`,
    discoveryToken: `mock-token-${scannedPlayerId}`
  };
}
