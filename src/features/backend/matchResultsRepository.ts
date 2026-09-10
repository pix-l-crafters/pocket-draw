import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import type { MatchResult } from "../../contracts/matchResult";
import { db } from "../../lib/firebase";
import type { MatchResultsRepository } from "./types";

function validateMatchResult(result: MatchResult, uploadedBy: string) {
  if (!result.matchId.trim()) {
    throw new Error("matchId is required.");
  }

  if (result.participantIds.length !== 2) {
    throw new Error("participantIds must contain exactly two uids.");
  }

  const [playerA, playerB] = result.participantIds;

  if (!playerA.trim() || !playerB.trim() || playerA === playerB) {
    throw new Error("participantIds must be two distinct non-empty uids.");
  }

  if (![3, 5, 7].includes(result.roundCount)) {
    throw new Error("roundCount must be 3, 5, or 7.");
  }

  if (!result.rounds.length || result.rounds.length > result.roundCount) {
    throw new Error("rounds must be non-empty and not exceed roundCount.");
  }

  if (!result.participantIds.includes(result.winnerId)) {
    throw new Error("winnerId must be one of the participants.");
  }

  if (!result.completedAt.trim()) {
    throw new Error("completedAt is required.");
  }

  if (!uploadedBy.trim()) {
    throw new Error("uploadedBy is required.");
  }

  if (!result.participantIds.includes(uploadedBy)) {
    throw new Error("uploadedBy must be one of the participants.");
  }
}

export const matchResultsRepository: MatchResultsRepository = {
  async writeMatchResult(result, uploadedBy) {
    validateMatchResult(result, uploadedBy);

    const matchRef = doc(db, "matchResults", result.matchId);
    const existing = await getDoc(matchRef);

    // Idempotent: either phone may upload; rules deny updates so skip if present.
    if (existing.exists()) {
      return;
    }

    await setDoc(matchRef, {
      matchId: result.matchId,
      participantIds: result.participantIds,
      roundCount: result.roundCount,
      rounds: result.rounds,
      winnerId: result.winnerId,
      completedAt: result.completedAt,
      uploadedBy,
      createdAt: serverTimestamp()
    });
  }
};
