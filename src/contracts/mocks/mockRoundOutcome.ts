import type { RoundOutcome } from "../roundOutcome";

/**
 * Randomized stand-in for the real gesture-detection pipeline, so the round
 * loop (4.17) can be built and demoed before 4.10-4.15 exist. Delete once
 * the real detection pipeline lands.
 */
export function mockRoundOutcome(
  playerAId: string,
  playerBId: string
): RoundOutcome {
  const roll = Math.random();
  if (roll < 0.1) return { kind: "falseStart", playerId: playerAId };
  if (roll < 0.2) return { kind: "tie", reactionMs: 250 };
  const winnerId = roll < 0.6 ? playerAId : playerBId;
  return { kind: "win", winnerId, reactionMs: 220, opponentReactionMs: 280 };
}
