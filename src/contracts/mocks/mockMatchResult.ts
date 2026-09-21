import type { MatchResult } from "../matchResult";

/**
 * Stand-in for a completed match, so the backend write path (5.2/5.3) can
 * be built before the real round loop (4.17) exists. Delete once it lands.
 */
export function mockMatchResult(
  playerAId: string,
  playerBId: string
): MatchResult {
  const rounds: MatchResult["rounds"] = [
    {
      kind: "win",
      winnerId: playerAId,
      reactionMs: 220,
      opponentReactionMs: 280
    },
    {
      kind: "win",
      winnerId: playerBId,
      reactionMs: 210,
      opponentReactionMs: 290
    },
    {
      kind: "win",
      winnerId: playerAId,
      reactionMs: 200,
      opponentReactionMs: 300
    }
  ];

  return {
    matchId: `mock-${Date.now()}`,
    participantIds: [playerAId, playerBId],
    roundCount: 3,
    rounds,
    results: { [playerAId]: "win", [playerBId]: "lose" },
    completedAt: new Date().toISOString()
  };
}
