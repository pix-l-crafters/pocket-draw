// Contract for the leaderboard screen (#42/#52): the top 100 users by ELO.

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  wins: number;
  losses: number;
  eloRating: number;
  /** Average reaction time across decisive (won) rounds; null with no wins yet. */
  avgReactionMs: number | null;
}
