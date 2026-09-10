import { collection, getDocs, query, where } from "firebase/firestore";

import type { MatchResult } from "../../contracts/matchResult";
import type { PlayerStats } from "../../contracts/playerStats";
import { db } from "../../lib/firebase";
import { DEFAULT_ELO_RATING, type PlayerStatsRepository } from "./types";

function isMatchResultDocument(data: unknown): data is MatchResult {
  if (!data || typeof data !== "object") {
    return false;
  }

  const record = data as Record<string, unknown>;

  return (
    typeof record.matchId === "string" &&
    Array.isArray(record.participantIds) &&
    record.participantIds.length === 2 &&
    typeof record.winnerId === "string"
  );
}

/**
 * Aggregates wins/losses from `matchResults` for a player.
 * eloRating stays at DEFAULT_ELO_RATING until Tanachat's 5.4 lands.
 */
export const playerStatsRepository: PlayerStatsRepository = {
  async getPlayerStats(uid, displayName): Promise<PlayerStats> {
    if (!uid.trim()) {
      throw new Error("uid is required to load player stats.");
    }

    const trimmedName = displayName.trim() || "Player";
    const matchResultsQuery = query(
      collection(db, "matchResults"),
      where("participantIds", "array-contains", uid)
    );
    const snapshot = await getDocs(matchResultsQuery);

    let wins = 0;
    let losses = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();

      if (!isMatchResultDocument(data)) {
        continue;
      }

      if (data.winnerId === uid) {
        wins += 1;
      } else if (data.participantIds.includes(uid)) {
        losses += 1;
      }
    }

    return {
      uid,
      displayName: trimmedName,
      wins,
      losses,
      eloRating: DEFAULT_ELO_RATING
    };
  }
};
