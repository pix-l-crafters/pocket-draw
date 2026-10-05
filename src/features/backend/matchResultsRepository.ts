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

  if (result.roundCount !== 3) {
    throw new Error("roundCount must be 3.");
  }

  if (result.rounds.length < 3 || result.rounds.length > 4) {
    throw new Error(
      "rounds must contain 3 regular rounds and at most 1 tiebreaker."
    );
  }

  const resultKeys = Object.keys(result.results);
  const hasExactlyBothPlayers =
    resultKeys.length === 2 &&
    result.participantIds.every((participantId) =>
      resultKeys.includes(participantId)
    );
  const playerAResult = result.results[playerA];
  const playerBResult = result.results[playerB];
  const hasValidOutcome =
    (playerAResult === "win" && playerBResult === "lose") ||
    (playerAResult === "lose" && playerBResult === "win") ||
    (playerAResult === "draw" && playerBResult === "draw");

  if (!hasExactlyBothPlayers || !hasValidOutcome) {
    throw new Error(
      "results must contain a valid outcome for both participants."
    );
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
      results: result.results,
      completedAt: result.completedAt,
      uploadedBy,
      createdAt: serverTimestamp()
    });
  }
};
