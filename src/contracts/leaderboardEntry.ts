// Contract for the leaderboard screen (#42/#52): ranks every player who has
// appeared in at least one matchResults doc.

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  wins: number;
  losses: number;
  eloRating: number;
  /** Average reaction time across decisive (won) rounds; null with no wins yet. */
  avgReactionMs: number | null;
}
