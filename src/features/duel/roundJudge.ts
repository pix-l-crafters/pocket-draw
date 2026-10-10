import {
  type RoundOutcome,
  type Zone,
  ZONE_POINTS
} from "../../contracts/roundOutcome.ts";

export const TIE_WINDOW_MS = 100;

export interface PlayerShot {
  playerId: string;
  reactionMs: number;
  zone: Zone;
}

export interface PlayerRoundScore {
  playerId: string;
  points: number;
}

/**
 * Gameplay v2 round scoring. Outside the tie window, only the faster shot's
 * zone is eligible to decide the round, falling through to the slower shot's
 * zone if the faster one misses. Within the tie window, both shots score
 * independently. Either way, the two point totals are compared: equal points
 * ties (zone is unambiguous when tied, since miss/bodyshot/headshot points are
 * a 0/1/2 bijection), unequal points wins for whoever scored higher.
 */
export function resolveRoundOutcome(
  playerA: PlayerShot,
  playerB: PlayerShot,
  tieWindowMs = TIE_WINDOW_MS
): RoundOutcome {
  validateShot(playerA);
  validateShot(playerB);

  if (playerA.playerId === playerB.playerId) {
    throw new Error("Round shots must belong to different players.");
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

  const withinTieWindow = slower.reactionMs - faster.reactionMs <= tieWindowMs;

  // Outside the tie window, only the faster shot's zone is eligible; the
  // slower shot only counts as a fallthrough when the faster shot missed.
  let fasterScore: { zone: Zone; points: number };
  let slowerScore: { zone: Zone; points: number };
  if (withinTieWindow) {
    fasterScore = { zone: faster.zone, points: ZONE_POINTS[faster.zone] };
    slowerScore = { zone: slower.zone, points: ZONE_POINTS[slower.zone] };
  } else if (ZONE_POINTS[faster.zone] > 0) {
    fasterScore = { zone: faster.zone, points: ZONE_POINTS[faster.zone] };
    slowerScore = { zone: "miss", points: 0 };
  } else {
    fasterScore = { zone: "miss", points: 0 };
    slowerScore = { zone: slower.zone, points: ZONE_POINTS[slower.zone] };
  }

  if (fasterScore.points === slowerScore.points) {
    return {
      kind: "tie",
      zone: fasterScore.zone,
      pointsEach: fasterScore.points,
      reactionMs: faster.reactionMs,
      opponentReactionMs: slower.reactionMs
    };
  }

  const fasterWins = fasterScore.points > slowerScore.points;
  const winner = fasterWins ? faster : slower;
  const loser = fasterWins ? slower : faster;
  const winnerScore = fasterWins ? fasterScore : slowerScore;
  const loserScore = fasterWins ? slowerScore : fasterScore;

  return {
    kind: "win",
    winnerId: winner.playerId,
    winnerZone: winnerScore.zone,
    loserZone: loser.zone,
    winnerPoints: winnerScore.points,
    loserPoints: loserScore.points,
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

  if (outcome.kind === "falseStart") {
    const expectedNonOffenderId =
      outcome.playerId === playerAId ? playerBId : playerAId;
    if (
      ![playerAId, playerBId].includes(outcome.playerId) ||
      outcome.nonOffenderId !== expectedNonOffenderId
    ) {
      throw new Error("Round outcome references a player outside this round.");
    }
    const shot = outcome.nonOffenderShot;
    if (
      shot &&
      (!Number.isFinite(shot.reactionMs) ||
        shot.reactionMs < 0 ||
        shot.points !== ZONE_POINTS[shot.zone])
    ) {
      throw new Error("False-start shot reaction or zone points are invalid.");
    }
    return [
      {
        playerId: playerAId,
        points: outcome.nonOffenderId === playerAId ? (shot?.points ?? 0) : 0
      },
      {
        playerId: playerBId,
        points: outcome.nonOffenderId === playerBId ? (shot?.points ?? 0) : 0
      }
    ];
  }

  if (outcome.winnerId !== playerAId && outcome.winnerId !== playerBId) {
    throw new Error("Round outcome references a player outside this round.");
  }

  return [
    {
      playerId: playerAId,
      points:
        outcome.winnerId === playerAId
          ? outcome.winnerPoints
          : outcome.loserPoints
    },
    {
      playerId: playerBId,
      points:
        outcome.winnerId === playerBId
          ? outcome.winnerPoints
          : outcome.loserPoints
    }
  ];
}

function validateShot(shot: PlayerShot): void {
  if (!shot.playerId) {
    throw new Error("Shot player id is required.");
  }

  if (!Number.isFinite(shot.reactionMs) || shot.reactionMs < 0) {
    throw new Error("Reaction time must be a non-negative number.");
  }
}
