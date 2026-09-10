import type { MatchResult } from "../matchResult";
import { mockRoundOutcome } from "./mockRoundOutcome";

/**
 * Stand-in for a completed match, so the backend write path (5.2/5.3) can
 * be built before the real round loop (4.17) exists. Delete once it lands.
 */
export function mockMatchResult(
  playerAId: string,
  playerBId: string
): MatchResult {
  return {
    matchId: `mock-${Date.now()}`,
    participantIds: [playerAId, playerBId],
    roundCount: 3,
    rounds: [mockRoundOutcome(playerAId, playerBId)],
    winnerId: playerAId,
    completedAt: new Date().toISOString()
  };
}
