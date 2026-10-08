// Contract for the leaderboard screen (#42/#52): the top 100 users by ELO.

export interface LeaderboardRanking {
  uid: string;
  displayName: string;
  eloRating: number;
}

/** Detailed statistics produced by the match-replay helper. */
export interface LeaderboardEntry extends LeaderboardRanking {
  wins: number;
  losses: number;
  /** Average reaction time across decisive (won) rounds; null with no wins yet. */
  avgReactionMs: number | null;
}
