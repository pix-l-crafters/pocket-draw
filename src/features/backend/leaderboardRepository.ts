import { collection, getDocs } from "firebase/firestore";

import type { LeaderboardEntry } from "../../contracts/leaderboardEntry";
import type { MatchResult } from "../../contracts/matchResult";
import { db } from "../../lib/firebase";
import { computeLeaderboard, type LeaderboardSortBy } from "./leaderboard";

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

export async function getLeaderboard(
  sortBy: LeaderboardSortBy = "eloRating"
): Promise<LeaderboardEntry[]> {
  const [matchResultsSnapshot, usersSnapshot] = await Promise.all([
    getDocs(collection(db, "matchResults")),
    getDocs(collection(db, "users"))
  ]);

  const matchResults = matchResultsSnapshot.docs
    .map((docSnap) => docSnap.data())
    .filter(isMatchResultDocument);

  const displayNames = new Map<string, string>();
  for (const docSnap of usersSnapshot.docs) {
    const displayName = docSnap.data().displayName;
    if (typeof displayName === "string") {
      displayNames.set(docSnap.id, displayName);
    }
  }

  return computeLeaderboard(matchResults, displayNames, sortBy);
}
