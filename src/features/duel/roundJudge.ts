import type { RoundOutcome } from "../../contracts/roundOutcome";

export const TIE_WINDOW_MS = 100;
export const TIE_POINTS_EACH = 1 as const;

export interface PlayerReaction {
  playerId: string;
  reactionMs: number;
}

export interface PlayerRoundScore {
  playerId: string;
  points: number;
}

export function resolveRoundOutcome(
  playerA: PlayerReaction,
  playerB: PlayerReaction,
  tieWindowMs = TIE_WINDOW_MS
): RoundOutcome {
  validateReaction(playerA);
  validateReaction(playerB);

  if (playerA.playerId === playerB.playerId) {
    throw new Error("Round reactions must belong to different players.");
  }

  if (!Number.isFinite(tieWindowMs) || tieWindowMs < 0) {
    throw new Error(
      "Tie window must be a non-negative number of milliseconds."
    );
  }

  const [faster, slower] =
    playerA.reactionMs <= playerB.reactionMs
      ? [playerA, playerB]
      : [playerB, playerA];

  if (slower.reactionMs - faster.reactionMs <= tieWindowMs) {
    return {
      kind: "tie",
      reactionMs: faster.reactionMs,
      opponentReactionMs: slower.reactionMs,
      pointsEach: TIE_POINTS_EACH
    };
  }

  return {
    kind: "win",
    winnerId: faster.playerId,
    reactionMs: faster.reactionMs,
    opponentReactionMs: slower.reactionMs
  };
}

export function scoreRoundOutcome(
  outcome: RoundOutcome,
  playerAId: string,
  playerBId: string
): [PlayerRoundScore, PlayerRoundScore] {
  if (playerAId === playerBId) {
    throw new Error("Round scores require two different players.");
  }

  if (outcome.kind === "tie") {
    return [
      { playerId: playerAId, points: outcome.pointsEach },
      { playerId: playerBId, points: outcome.pointsEach }
    ];
  }

  const winnerId =
    outcome.kind === "win"
      ? outcome.winnerId
      : outcome.playerId === playerAId
        ? playerBId
        : outcome.playerId === playerBId
          ? playerAId
          : null;

  if (winnerId !== playerAId && winnerId !== playerBId) {
    throw new Error("Round outcome references a player outside this round.");
  }

  return [
    { playerId: playerAId, points: winnerId === playerAId ? 1 : 0 },
    { playerId: playerBId, points: winnerId === playerBId ? 1 : 0 }
  ];
}

function validateReaction(reaction: PlayerReaction): void {
  if (!reaction.playerId) {
    throw new Error("Reaction player id is required.");
  }

  if (!Number.isFinite(reaction.reactionMs) || reaction.reactionMs < 0) {
    throw new Error("Reaction time must be a non-negative number.");
  }
}
