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
// `src/features/backend/` (wins/losses from matchResults; eloRating is still
// DEFAULT_ELO_RATING until Tanachat's 5.4). Consumers can swap
// mocks/mockPlayerStats.ts once they wire that import; delete the mock then.
// TODO(mihir): after 5.4/5.5, surface live ELO and remove the default.
