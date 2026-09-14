// Contract between backend stats (Mihir, 5.1/5.4/5.5) and any UI that shows
// wins/ELO: the map pin popup (Siheng, 2.2), the opponent popup (Tingyue,
// 3.3), and the match summary screen (Mobark, 6.1).

export interface PlayerStats {
  uid: string;
  displayName: string;
  wins: number;
  losses: number;
  eloRating: number;
}

// Real lookup: `playerStatsRepository.getPlayerStats` in
// `src/features/backend/` (wins/losses from matchResults; ELO replayed from
// match history with starting rating 1500 / K=40). Consumers can swap
// mocks/mockPlayerStats.ts once they wire that import; delete the mock then.
