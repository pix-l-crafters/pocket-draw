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

// TODO(mihir): once 5.1/5.5/5.4 land, replace mockPlayerStats with the real
// Firestore-backed lookup and delete mocks/mockPlayerStats.ts.
