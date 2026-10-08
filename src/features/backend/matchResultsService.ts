import type { MatchResult } from "../../contracts/matchResult";
import { auth } from "../../lib/firebase";
import { isNetworkAvailable, subscribeNetworkChanges } from "./connectivity";
import {
  bumpQueuedMatchResultAttempt,
  enqueueMatchResult,
  listQueuedMatchResults,
  removeQueuedMatchResult
} from "./matchResultQueue";
import {
  matchResultsRepository,
  validateMatchResult
} from "./matchResultsRepository";
import { playerStatsRepository } from "./playerStatsRepository";
import type { SubmitMatchResultOutcome } from "./types";

type MatchSaveStatus = SubmitMatchResultOutcome["status"] | "error";
const statusListeners = new Set<{
  matchId: string;
  uploadedBy: string;
  listener: (status: MatchSaveStatus) => void;
}>();

/** Summaries observe writes performed by background queue synchronization. */
export function subscribeMatchResultStatus(
  matchId: string,
  uploadedBy: string,
  listener: (status: MatchSaveStatus) => void
): () => void {
  const subscription = { matchId, uploadedBy, listener };
  statusListeners.add(subscription);
  return () => {
    statusListeners.delete(subscription);
  };
}

function publishStatus(
  matchId: string,
  uploadedBy: string,
  status: MatchSaveStatus
): void {
  for (const subscription of statusListeners) {
    if (
      subscription.matchId === matchId &&
      subscription.uploadedBy === uploadedBy
    )
      subscription.listener(status);
  }
}

async function updateUploaderElo(
  result: MatchResult,
  uploadedBy: string
): Promise<void> {
  const opponentId = result.participantIds.find((id) => id !== uploadedBy);
  if (!opponentId) {
    throw new Error("Match result does not contain an opponent.");
  }

  const playerResult = result.results[uploadedBy];
  const outcome =
    playerResult === "win" ? "win" : playerResult === "lose" ? "loss" : "draw";

  await playerStatsRepository.updateEloRating(
    uploadedBy,
    opponentId,
    outcome,
    result.matchId
  );
}

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

/** Keep the uploader tied to the auth session that initiated the operation. */
function requireSession(uploadedBy: string) {
  const user = auth.currentUser;
  if (!user || user.uid !== uploadedBy)
    throw new Error("The match uploader must be the signed-in account.");
  return () => {
    if (auth.currentUser !== user)
      throw new Error("The match upload session has ended.");
  };
}

const pendingSubmissions = new Map<string, Promise<SubmitMatchResultOutcome>>();

/**
 * Order UI and background attempts so older outcomes cannot overwrite newer
 * ones.
 */
export async function submitMatchResult(
  result: MatchResult,
  uploadedBy: string
): Promise<SubmitMatchResultOutcome> {
  const checkSession = requireSession(uploadedBy);
  const key = JSON.stringify([uploadedBy, result.matchId]);
  const previous = pendingSubmissions.get(key);
  const submission = (async () => {
    const previousOutcome = await previous?.catch(() => undefined);
    checkSession();
    if (previousOutcome?.status === "written") return previousOutcome;
    return persistMatchResult(result, uploadedBy);
  })();
  pendingSubmissions.set(key, submission);
  try {
    return await submission;
  } finally {
    if (pendingSubmissions.get(key) === submission)
      pendingSubmissions.delete(key);
  }
}

/** Persist locally first so restarts and recoverable errors retain the result. */
async function persistMatchResult(
  result: MatchResult,
  uploadedBy: string
): Promise<SubmitMatchResultOutcome> {
  const checkSession = requireSession(uploadedBy);
  validateMatchResult(result, uploadedBy);
  await enqueueMatchResult(result, uploadedBy);
  checkSession();
  const online = await isNetworkAvailable();
  checkSession();
  if (!online) {
    publishStatus(result.matchId, uploadedBy, "queued");
    return {
      status: "queued",
      matchId: result.matchId,
      reason: "device appears offline"
    };
  }
  try {
    await matchResultsRepository.writeMatchResult(result, uploadedBy);
    checkSession();
    await updateUploaderElo(result, uploadedBy);
    checkSession();
    await removeQueuedMatchResult(result.matchId);
    publishStatus(result.matchId, uploadedBy, "written");
    return { status: "written", matchId: result.matchId };
  } catch (error) {
    if (isLikelyOfflineError(error)) {
      publishStatus(result.matchId, uploadedBy, "queued");
      return {
        status: "queued",
        matchId: result.matchId,
        reason: "write failed; queued for retry"
      };
    }
    publishStatus(result.matchId, uploadedBy, "error");
    throw error;
  }
}

/** Flush only results owned by this account, stopping when its session ends. */
export async function flushQueuedMatchResults(
  uploadedBy: string,
  isActive: () => boolean = () => true
): Promise<{ written: string[]; remaining: string[] }> {
  const checkSession = requireSession(uploadedBy);
  const queued = await listQueuedMatchResults();
  const written: string[] = [];
  const remaining: string[] = [];
  for (const entry of queued) {
    if (!isActive()) break;
    checkSession();
    // Legacy entries have no provable owner: retain them instead of impersonating it.
    if (entry.uploadedBy !== uploadedBy) continue;
    try {
      const outcome = await submitMatchResult(entry.result, uploadedBy);
      (outcome.status === "written" ? written : remaining).push(
        entry.result.matchId
      );
    } catch (error) {
      await bumpQueuedMatchResultAttempt(entry.result.matchId);
      remaining.push(entry.result.matchId);
      if (!isLikelyOfflineError(error))
        console.warn(
          `Failed to flush match result ${entry.result.matchId}:`,
          error
        );
    }
  }
  return { written, remaining };
}

/**
 * Initial auth-ready flush and reconnect sync; each subscription owns its
 * cleanup.
 */
export function startMatchResultQueueSync(
  getUploadedBy: () => string | null
): () => void {
  let active = true;
  let flushing = false;
  let flushRequested = false;
  const flush = async () => {
    const uploadedBy = getUploadedBy();
    if (!active || !uploadedBy) return;
    if (flushing) {
      flushRequested = true;
      return;
    }
    flushing = true;
    try {
      if (await isNetworkAvailable()) {
        if (active && getUploadedBy() === uploadedBy)
          await flushQueuedMatchResults(
            uploadedBy,
            () => active && getUploadedBy() === uploadedBy
          );
      }
    } catch (error) {
      console.warn("Could not synchronize queued match results:", error);
    } finally {
      flushing = false;
      if (flushRequested) {
        flushRequested = false;
        void flush();
      }
    }
  };
  const stop = subscribeNetworkChanges((online) => {
    if (online) void flush();
  });
  void flush();
  return () => {
    active = false;
    stop();
  };
}
