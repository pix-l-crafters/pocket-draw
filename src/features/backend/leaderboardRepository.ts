import { collection, getDocs } from "firebase/firestore";

import type { LeaderboardEntry } from "../../contracts/leaderboardEntry";
import { db } from "../../lib/firebase";
import { DEFAULT_ELO_RATING } from "./types";

const LEADERBOARD_LIMIT = 100;

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  // Read every user so players without a rating participate at the default.
  const usersSnapshot = await getDocs(collection(db, "users"));
  const entries: LeaderboardEntry[] = usersSnapshot.docs.map((docSnap) => {
    const data = docSnap.data();

    return {
      uid: docSnap.id,
      displayName:
        typeof data.displayName === "string" && data.displayName.trim()
          ? data.displayName
          : "Player",
      wins: typeof data.win === "number" ? data.win : 0,
      losses: typeof data.lose === "number" ? data.lose : 0,
      eloRating:
        typeof data.eloRating === "number" && Number.isFinite(data.eloRating)
          ? data.eloRating
          : DEFAULT_ELO_RATING,
      avgReactionMs: null
    };
  });

  return entries
    .sort(
      (left, right) =>
        right.eloRating - left.eloRating || left.uid.localeCompare(right.uid)
    )
    .slice(0, LEADERBOARD_LIMIT);
}
