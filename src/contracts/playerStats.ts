// Contract between backend stats (Mihir, 5.1/5.4/5.5) and any UI that shows
// wins/losses/draws/ELO: the map pin popup (Siheng, 2.2), the opponent popup
// (Tingyue, 3.3), and the match summary screen (Mobark, 6.1).

export interface PlayerStats {
  uid: string;
  displayName: string;
  wins: number;
  losses: number;
  draws: number;
  eloRating: number;
}

// Real lookup: `playerStatsRepository.getPlayerStats` in
// `src/features/backend/` aggregates all three outcomes from match results and
// loads ELO from `users/{uid}`.
