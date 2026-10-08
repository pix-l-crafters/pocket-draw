import { useEffect, useState } from "react";

import type { PlayerStats } from "../contracts/playerStats";
import { playerStatsRepository } from "../features/backend/playerStatsRepository";

type PlayerIdentity = {
  uid: string;
  displayName: string;
};

/** Loads match outcomes and ELO for a player. */
export function usePlayerStats(
  player: PlayerIdentity | null
): PlayerStats | null {
  const [stats, setStats] = useState<PlayerStats | null>(null);

  const uid = player?.uid ?? null;
  const displayName = player?.displayName ?? null;

  useEffect(() => {
    if (uid === null || displayName === null) {
      setStats(null);
      return;
    }

    let active = true;

    void playerStatsRepository
      .getPlayerStats(uid, displayName)
      .then((result) => {
        if (active) {
          setStats(result);
        }
      })
      .catch(() => {
        if (active) {
          setStats(null);
        }
      });

    return () => {
      active = false;
    };
  }, [uid, displayName]);

  return stats;
}
