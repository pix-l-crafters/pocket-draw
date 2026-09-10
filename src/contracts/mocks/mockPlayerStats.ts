import type { PlayerStats } from "../playerStats";

/**
 * Plausible fake stats, so UI that shows wins/ELO (2.2, 3.3, 6.1) can be
 * built before the real backend stats (5.1/5.4/5.5) exist. Delete once
 * they land.
 */
export function mockPlayerStats(uid: string, displayName: string): PlayerStats {
  return { uid, displayName, wins: 4, losses: 2, eloRating: 1050 };
}
