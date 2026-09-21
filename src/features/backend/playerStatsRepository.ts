import { collection, getDocs, query, where } from "firebase/firestore";

import type { MatchResult } from "../../contracts/matchResult";
import type { PlayerStats } from "../../contracts/playerStats";
import { db } from "../../lib/firebase";
import { ELO_K_FACTOR, updateEloPair } from "./elo";
import { DEFAULT_ELO_RATING, type PlayerStatsRepository } from "./types";

function isMatchResultDocument(data: unknown): data is MatchResult {
  if (!data || typeof data !== "object") {
    return false;
  }

  const record = data as Record<string, unknown>;
  const results = record.results;

  return (
    typeof record.matchId === "string" &&
    Array.isArray(record.participantIds) &&
    record.participantIds.length === 2 &&
    typeof record.completedAt === "string" &&
    !!results &&
    typeof results === "object" &&
    record.participantIds.every((participantId) => {
      const result = (results as Record<string, unknown>)[
        String(participantId)
      ];
      return result === "win" || result === "lose" || result === "draw";
    })
  );
}

/**
 * Aggregates wins/losses and replays completed matches to derive current ELO.
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

    const ratings = new Map<string, number>();
    const relevantResults = snapshot.docs
      .map((docSnap) => docSnap.data())
      .filter(isMatchResultDocument)
      .sort((left, right) => left.completedAt.localeCompare(right.completedAt));

    for (const data of relevantResults) {
      if (data.results[uid] === "win") {
        wins += 1;
      } else if (data.results[uid] === "lose") {
        losses += 1;
      }

      const [playerA, playerB] = data.participantIds;
      const ratingA = ratings.get(playerA) ?? DEFAULT_ELO_RATING;
      const ratingB = ratings.get(playerB) ?? DEFAULT_ELO_RATING;
      const outcome =
        data.results[playerA] === "win"
          ? "win"
          : data.results[playerA] === "lose"
            ? "loss"
            : "draw";
      const [nextA, nextB] = updateEloPair(
        ratingA,
        ratingB,
        outcome,
        ELO_K_FACTOR
      );
      ratings.set(playerA, nextA);
      ratings.set(playerB, nextB);
    }

    return {
      uid,
      displayName: trimmedName,
      wins,
      losses,
      eloRating: ratings.get(uid) ?? DEFAULT_ELO_RATING
    };
  }
};
