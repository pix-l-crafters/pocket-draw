import type { MatchResult } from "../../contracts/matchResult";
import { isNetworkAvailable, subscribeNetworkChanges } from "./connectivity";
import {
  bumpQueuedMatchResultAttempt,
  enqueueMatchResult,
  listQueuedMatchResults,
  removeQueuedMatchResult
} from "./matchResultQueue";
import { matchResultsRepository } from "./matchResultsRepository";
import type { SubmitMatchResultOutcome } from "./types";

function isLikelyOfflineError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message).toLowerCase() : "";

  return (
    code.includes("unavailable") ||
    code.includes("network") ||
    message.includes("network") ||
    message.includes("offline") ||
    message.includes("unavailable")
  );
}

/**
 * Writes a completed match to Firestore, or queues it when offline (5.2/5.3).
 * Uses the shared MatchResult contract; callers can pass mockMatchResult today.
 */
export async function submitMatchResult(
  result: MatchResult,
  uploadedBy: string
): Promise<SubmitMatchResultOutcome> {
  const online = await isNetworkAvailable();

  if (!online) {
    await enqueueMatchResult(result);
    return {
      status: "queued",
      matchId: result.matchId,
      reason: "device appears offline"
    };
  }

  try {
    await matchResultsRepository.writeMatchResult(result, uploadedBy);
    await removeQueuedMatchResult(result.matchId);
    return { status: "written", matchId: result.matchId };
  } catch (error) {
    if (isLikelyOfflineError(error)) {
      await enqueueMatchResult(result);
      return {
        status: "queued",
        matchId: result.matchId,
        reason: "firestore write failed; queued for retry"
      };
    }

    throw error;
  }
}

/**
 * Flushes the local offline queue. Safe to call on app resume / reconnect.
 */
export async function flushQueuedMatchResults(
  uploadedBy: string
): Promise<{ written: string[]; remaining: string[] }> {
  const queued = await listQueuedMatchResults();
  const written: string[] = [];
  const remaining: string[] = [];

  for (const entry of queued) {
    try {
      await matchResultsRepository.writeMatchResult(entry.result, uploadedBy);
      await removeQueuedMatchResult(entry.result.matchId);
      written.push(entry.result.matchId);
    } catch (error) {
      await bumpQueuedMatchResultAttempt(entry.result.matchId);
      remaining.push(entry.result.matchId);

      if (!isLikelyOfflineError(error)) {
        // Keep non-network failures in the queue but surface them.
        console.warn(
          `Failed to flush match result ${entry.result.matchId}:`,
          error
        );
      }
    }
  }

  return { written, remaining };
}

let stopNetworkSubscription: (() => void) | null = null;

/**
 * Start listening for reconnect and flush queued results for the signed-in user.
 * Call once after auth is ready; returns an unsubscribe function.
 */
export function startMatchResultQueueSync(
  getUploadedBy: () => string | null
): () => void {
  if (stopNetworkSubscription) {
    stopNetworkSubscription();
  }

  stopNetworkSubscription = subscribeNetworkChanges((online) => {
    if (!online) {
      return;
    }

    const uploadedBy = getUploadedBy();

    if (!uploadedBy) {
      return;
    }

    void flushQueuedMatchResults(uploadedBy);
  });

  return () => {
    stopNetworkSubscription?.();
    stopNetworkSubscription = null;
  };
}
