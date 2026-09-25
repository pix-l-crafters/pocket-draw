import type { LeaderboardEntry } from "../../contracts/leaderboardEntry";
import type { MatchResult } from "../../contracts/matchResult";
import { ELO_K_FACTOR, updateEloPair } from "./elo";
import { DEFAULT_ELO_RATING } from "./types";

export type LeaderboardSortBy = "eloRating" | "avgReactionMs";

/**
 * Replays matchResults chronologically into per-player wins/losses/ELO,
 * plus average reaction time over decisive (won) rounds — ties don't record
 * which participant was faster (see RoundOutcome), so they're excluded.
 */
export function computeLeaderboard(
  matchResults: MatchResult[],
  displayNames: Map<string, string>,
  sortBy: LeaderboardSortBy = "eloRating"
): LeaderboardEntry[] {
  const elo = new Map<string, number>();
  const wins = new Map<string, number>();
  const losses = new Map<string, number>();
  const reactionSum = new Map<string, number>();
  const reactionCount = new Map<string, number>();
  const uids = new Set<string>();

  const sorted = [...matchResults].sort((left, right) =>
    left.completedAt.localeCompare(right.completedAt)
  );

  for (const match of sorted) {
    const [playerA, playerB] = match.participantIds;
    uids.add(playerA);
    uids.add(playerB);

    const ratingA = elo.get(playerA) ?? DEFAULT_ELO_RATING;
    const ratingB = elo.get(playerB) ?? DEFAULT_ELO_RATING;
    const outcome = match.winnerId === playerA ? "win" : "loss";
    const [nextA, nextB] = updateEloPair(
      ratingA,
      ratingB,
      outcome,
      ELO_K_FACTOR
    );
    elo.set(playerA, nextA);
    elo.set(playerB, nextB);

    const loserId = match.winnerId === playerA ? playerB : playerA;
    wins.set(match.winnerId, (wins.get(match.winnerId) ?? 0) + 1);
    losses.set(loserId, (losses.get(loserId) ?? 0) + 1);

    for (const round of match.rounds) {
      if (round.kind !== "win") {
        continue;
      }

      const roundLoserId = round.winnerId === playerA ? playerB : playerA;

      reactionSum.set(
        round.winnerId,
        (reactionSum.get(round.winnerId) ?? 0) + round.reactionMs
      );
      reactionCount.set(
        round.winnerId,
        (reactionCount.get(round.winnerId) ?? 0) + 1
      );
      reactionSum.set(
        roundLoserId,
        (reactionSum.get(roundLoserId) ?? 0) + round.opponentReactionMs
      );
      reactionCount.set(
        roundLoserId,
        (reactionCount.get(roundLoserId) ?? 0) + 1
      );
    }
  }

  const entries: LeaderboardEntry[] = Array.from(uids).map((uid) => {
    const count = reactionCount.get(uid) ?? 0;

    return {
      uid,
      displayName: displayNames.get(uid) ?? "Player",
      wins: wins.get(uid) ?? 0,
      losses: losses.get(uid) ?? 0,
      eloRating: elo.get(uid) ?? DEFAULT_ELO_RATING,
      avgReactionMs:
        count > 0 ? Math.round((reactionSum.get(uid) ?? 0) / count) : null
    };
  });

  if (sortBy === "avgReactionMs") {
    return entries.sort((left, right) => {
      if (left.avgReactionMs === null) return 1;
      if (right.avgReactionMs === null) return -1;
      return left.avgReactionMs - right.avgReactionMs;
    });
  }

  return entries.sort((left, right) => right.eloRating - left.eloRating);
}
