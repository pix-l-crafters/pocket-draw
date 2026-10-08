import { collection, getDocs } from "firebase/firestore";

import type { LeaderboardRanking } from "../../contracts/leaderboardEntry";
import { db } from "../../lib/firebase";
import { DEFAULT_ELO_RATING } from "./types";

const LEADERBOARD_LIMIT = 100;

export async function getLeaderboard(): Promise<LeaderboardRanking[]> {
  // Read every user so players without a rating participate at the default.
  const usersSnapshot = await getDocs(collection(db, "users"));
  const entries: LeaderboardRanking[] = usersSnapshot.docs.map((docSnap) => {
    const data = docSnap.data();

    return {
      uid: docSnap.id,
      displayName:
        typeof data.displayName === "string" && data.displayName.trim()
          ? data.displayName
          : "Player",
      eloRating:
        typeof data.eloRating === "number" && Number.isFinite(data.eloRating)
          ? data.eloRating
          : DEFAULT_ELO_RATING
    };
  });

  return entries
    .sort(
      (left, right) =>
        right.eloRating - left.eloRating || left.uid.localeCompare(right.uid)
    )
    .slice(0, LEADERBOARD_LIMIT);
}
