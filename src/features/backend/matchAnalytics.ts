import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";

import type { MatchAnalytics } from "../../contracts/matchAnalytics";
import { auth, db } from "../../lib/firebase";
import { isNetworkAvailable, subscribeNetworkChanges } from "./connectivity";

const STORAGE_KEY = "@pocket-draw/match-analytics-queue";
export type AnalyticsSaveStatus = "saving" | "written" | "queued" | "error";
const listeners = new Set<{
  id: string;
  listener: (status: AnalyticsSaveStatus) => void;
}>();
let pendingMutation = Promise.resolve();
const pendingUploads = new Map<string, Promise<"written" | "queued">>();

function analyticsId(data: MatchAnalytics): string {
  return `${data.matchId}_${data.playerId}`;
}

function validate(data: MatchAnalytics): void {
  if (
    data.schemaVersion !== 1 ||
    !data.matchId ||
    data.matchId.includes("/") ||
    !data.playerId ||
    data.playerId.includes("/") ||
    data.participantIds?.length !== 2 ||
    new Set(data.participantIds).size !== 2 ||
    !data.participantIds.every(
      (id) => typeof id === "string" && id.length > 0
    ) ||
    !data.participantIds.includes(data.playerId) ||
    !Array.isArray(data.rounds) ||
    data.rounds.length < 3 ||
    data.rounds.length > 4 ||
    data.rounds.some((round, index) => round.roundNumber !== index + 1) ||
    !Number.isFinite(data.calibration?.thetaReady) ||
    !Number.isFinite(data.calibration?.thetaShoulder) ||
    !data.completedAt ||
    !data.thresholds ||
    typeof data.platform !== "string" ||
    !Number.isFinite(data.clockOffsetMs)
  ) {
    throw new Error("Invalid match analytics.");
  }
}

function requireSession(playerId: string) {
  const user = auth.currentUser;
  if (!user || user.uid !== playerId)
    throw new Error("Analytics must belong to the signed-in player.");
  return () => {
    if (auth.currentUser !== user)
      throw new Error("Analytics upload session has ended.");
  };
}

async function readQueue(): Promise<MatchAnalytics[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const entries: unknown = JSON.parse(raw);
    if (!Array.isArray(entries)) return [];
    return entries.filter((entry) => {
      try {
        validate(entry);
        return true;
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

function mutateQueue(operation: (queue: MatchAnalytics[]) => MatchAnalytics[]) {
  const next = pendingMutation.then(async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(operation(await readQueue()))
    );
  });
  pendingMutation = next.catch(() => undefined);
  return next;
}

export function subscribeAnalyticsStatus(
  matchId: string,
  playerId: string,
  listener: (status: AnalyticsSaveStatus) => void
) {
  const subscription = { id: `${matchId}_${playerId}`, listener };
  listeners.add(subscription);
  return () => {
    listeners.delete(subscription);
  };
}

function publish(id: string, status: AnalyticsSaveStatus) {
  for (const subscription of listeners)
    if (subscription.id === id) subscription.listener(status);
}

/** Persist locally before attempting the create-only Firestore transaction. */
export async function submitMatchAnalytics(
  input: MatchAnalytics
): Promise<"written" | "queued"> {
  validate(input);
  const checkSession = requireSession(input.playerId);
  // Firestore rejects undefined and sensor APIs may report non-finite values.
  const data: MatchAnalytics = JSON.parse(
    JSON.stringify(input, (_key, value) =>
      value === undefined ||
      (typeof value === "number" && !Number.isFinite(value))
        ? null
        : value
    )
  );
  const id = analyticsId(data);
  const previous = pendingUploads.get(id);
  const upload = (async () => {
    const prior = await previous?.catch(() => undefined);
    checkSession();
    if (prior === "written") return prior;
    await mutateQueue((queue) =>
      queue.some((entry) => analyticsId(entry) === id)
        ? queue
        : [...queue, data]
    );
    checkSession();
    if (!(await isNetworkAvailable())) {
      checkSession();
      publish(id, "queued");
      return "queued" as const;
    }
    checkSession();
    try {
      const ref = doc(db, "analytics", id);
      await runTransaction(db, async (transaction) => {
        checkSession();
        const existing = await transaction.get(ref);
        checkSession();
        if (!existing.exists())
          transaction.set(ref, { ...data, createdAt: serverTimestamp() });
      });
      checkSession();
      await mutateQueue((queue) =>
        queue.filter((entry) => analyticsId(entry) !== id)
      );
      publish(id, "written");
      return "written" as const;
    } catch (error) {
      checkSession();
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "";
      if (code.includes("unavailable") || code.includes("network")) {
        publish(id, "queued");
        return "queued" as const;
      }
      publish(id, "error");
      throw error;
    }
  })();
  pendingUploads.set(id, upload);
  try {
    return await upload;
  } finally {
    if (pendingUploads.get(id) === upload) pendingUploads.delete(id);
  }
}

export async function flushQueuedAnalytics(
  playerId: string,
  isActive: () => boolean = () => true
): Promise<void> {
  const checkSession = requireSession(playerId);
  for (const data of await readQueue()) {
    if (!isActive()) return;
    checkSession();
    if (data.playerId !== playerId) continue;
    try {
      await submitMatchAnalytics(data);
    } catch (error) {
      checkSession();
      console.warn("Could not synchronize match analytics:", error);
    }
  }
}

export function startAnalyticsQueueSync(
  getPlayerId: () => string | null
): () => void {
  let active = true;
  let flushing = false;
  let requested = false;
  const flush = async () => {
    const playerId = getPlayerId();
    if (!active || !playerId) return;
    if (flushing) {
      requested = true;
      return;
    }
    flushing = true;
    try {
      if ((await isNetworkAvailable()) && active && getPlayerId() === playerId)
        await flushQueuedAnalytics(
          playerId,
          () => active && getPlayerId() === playerId
        );
    } catch (error) {
      console.warn("Could not synchronize match analytics:", error);
    } finally {
      flushing = false;
      if (requested) {
        requested = false;
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
