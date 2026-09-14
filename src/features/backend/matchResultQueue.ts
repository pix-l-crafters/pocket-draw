import AsyncStorage from "@react-native-async-storage/async-storage";

import type { MatchResult } from "../../contracts/matchResult";

const QUEUE_STORAGE_KEY = "@pocket-draw/match-result-queue";

export type QueuedMatchResult = {
  result: MatchResult;
  enqueuedAt: string;
  attempts: number;
};

async function readQueue(): Promise<QueuedMatchResult[]> {
  const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isQueuedMatchResult);
  } catch {
    return [];
  }
}

function isQueuedMatchResult(value: unknown): value is QueuedMatchResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const result = record.result;

  return (
    typeof record.enqueuedAt === "string" &&
    typeof record.attempts === "number" &&
    !!result &&
    typeof result === "object" &&
    typeof (result as MatchResult).matchId === "string"
  );
}

async function writeQueue(entries: QueuedMatchResult[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(entries));
}

export async function enqueueMatchResult(result: MatchResult): Promise<void> {
  const queue = await readQueue();
  const existing = queue.find(
    (entry) => entry.result.matchId === result.matchId
  );
  const nextEntry: QueuedMatchResult = {
    result,
    enqueuedAt: existing?.enqueuedAt ?? new Date().toISOString(),
    attempts: existing?.attempts ?? 0
  };
  const withoutDuplicate = queue.filter(
    (entry) => entry.result.matchId !== result.matchId
  );

  await writeQueue([...withoutDuplicate, nextEntry]);
}

export async function listQueuedMatchResults(): Promise<QueuedMatchResult[]> {
  return readQueue();
}

export async function removeQueuedMatchResult(matchId: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((entry) => entry.result.matchId !== matchId));
}

export async function clearMatchResultQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
}

export async function bumpQueuedMatchResultAttempt(
  matchId: string
): Promise<void> {
  const queue = await readQueue();
  const next = queue.map((entry) =>
    entry.result.matchId === matchId
      ? { ...entry, attempts: entry.attempts + 1 }
      : entry
  );

  await writeQueue(next);
}
