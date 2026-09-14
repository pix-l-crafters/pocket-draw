import { useEffect, useState } from "react";

import { mockPlayerStats } from "../../../contracts/mocks/mockPlayerStats";
import type { PlayerStats } from "../../../contracts/playerStats";

type PlayerIdentity = {
  uid: string;
  displayName: string;
};

/**
 * Wins / losses / ELO for a player. Currently backed by `mockPlayerStats`;
 * swap for the real backend lookup once Mihir's stats work (5.1/5.4/5.5) lands
 * and delete the mock import.
 */
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

    void Promise.resolve(mockPlayerStats(uid, displayName)).then((result) => {
      if (active) {
        setStats(result);
      }
    });

    return () => {
      active = false;
    };
  }, [uid, displayName]);

  return stats;
}
