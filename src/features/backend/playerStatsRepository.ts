import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where
} from "firebase/firestore";

import type { MatchResult } from "../../contracts/matchResult";
import type { PlayerStats } from "../../contracts/playerStats";
import { db } from "../../lib/firebase";
import { updateEloPair } from "./elo";
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

function storedElo(data: Record<string, unknown> | undefined): number {
  return typeof data?.eloRating === "number"
    ? data.eloRating
    : DEFAULT_ELO_RATING;
}

/** Aggregates match outcomes and loads persisted ELO from `users/{uid}`. */
export const playerStatsRepository: PlayerStatsRepository = {
  async getPlayerStats(uid, displayName): Promise<PlayerStats> {
    if (!uid.trim()) {
      throw new Error("uid is required to load player stats.");
    }

    const trimmedName = displayName.trim() || "Player";
    const matchesQuery = query(
      collection(db, "matches"),
      where("participantIds", "array-contains", uid)
    );
    const [snapshot, userSnapshot] = await Promise.all([
      getDocs(matchesQuery),
      getDoc(doc(db, "users", uid))
    ]);
    let wins = 0;
    let losses = 0;
    let draws = 0;

    for (const data of snapshot.docs
      .map((docSnap) => docSnap.data())
      .filter(isMatchResultDocument)) {
      if (data.results[uid] === "win") wins += 1;
      if (data.results[uid] === "lose") losses += 1;
      if (data.results[uid] === "draw") draws += 1;
    }
    return {
      uid,
      displayName: trimmedName,
      wins,
      losses,
      draws,
      eloRating: storedElo(userSnapshot.data())
    };
  },

  async updateEloRating(uid, opponentUid, outcome, matchId): Promise<number> {
    if (!uid.trim() || !opponentUid.trim() || uid === opponentUid) {
      throw new Error("Two distinct player uids are required to update ELO.");
    }

    const userRef = doc(db, "users", uid);
    const opponentRef = doc(db, "users", opponentUid);
    if (!matchId.trim()) throw new Error("matchId is required to update ELO.");
    const receiptRef = doc(db, "users", uid, "ratedMatches", matchId);
    return runTransaction(db, async (transaction) => {
      const [userSnapshot, opponentSnapshot, receipt] = await Promise.all([
        transaction.get(userRef),
        transaction.get(opponentRef),
        transaction.get(receiptRef)
      ]);
      if (receipt.exists()) return storedElo(userSnapshot.data());
      const [nextRating] = updateEloPair(
        storedElo(userSnapshot.data()),
        storedElo(opponentSnapshot.data()),
        outcome
      );
      // The receipt and rating commit together, including SDK transaction retries.
      transaction.set(userRef, { eloRating: nextRating }, { merge: true });
      transaction.set(receiptRef, { matchId });
      return nextRating;
    });
  }
};
