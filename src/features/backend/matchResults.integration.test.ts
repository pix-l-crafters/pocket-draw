import { renderHook } from "@testing-library/react-native";
import { addNetworkStateListener, getNetworkStateAsync } from "expo-network";
import { runTransaction } from "firebase/firestore";

import { mockMatchResult } from "../../contracts/mocks/mockMatchResult";
import { useMatchResultQueueSync } from "../../hooks/useMatchResultQueueSync";
import { auth } from "../../lib/firebase";
import {
  clearMatchResultQueue,
  listQueuedMatchResults
} from "./matchResultQueue";
import {
  flushQueuedMatchResults,
  startMatchResultQueueSync,
  subscribeMatchResultStatus,
  submitMatchResult
} from "./matchResultsService";
import { playerStatsRepository } from "./playerStatsRepository";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("expo-network", () => ({
  getNetworkStateAsync: jest.fn(),
  addNetworkStateListener: jest.fn()
}));
jest.mock("../../lib/firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "player-a" } }
}));
jest.mock("firebase/firestore", () => {
  const documents = new Map<string, unknown>();
  let pending: Promise<unknown> = Promise.resolve();
  const get = async (path: string) => ({
    exists: () => documents.has(path),
    data: () => documents.get(path)
  });
  return {
    doc: (_db: unknown, ...parts: string[]) => parts.join("/"),
    collection: (_db: unknown, path: string) => path,
    where: (_field: string, _op: string, uid: string) => uid,
    query: (path: string, uid: string) => ({ path, uid }),
    getDoc: get,
    getDocs: async ({ path, uid }: { path: string; uid: string }) => ({
      docs: [...documents.entries()]
        .filter(
          ([key, data]) =>
            key.startsWith(`${path}/`) &&
            (data as { participantIds: string[] }).participantIds.includes(uid)
        )
        .map(([, data]) => ({ data: () => data }))
    }),
    serverTimestamp: () => "server-time",
    runTransaction: jest.fn(
      (_db: unknown, callback: (transaction: unknown) => Promise<unknown>) => {
        const result = pending.then(() =>
          callback({
            get,
            set: (path: string, data: unknown, options?: { merge: boolean }) =>
              documents.set(
                path,
                options?.merge
                  ? { ...(documents.get(path) as object), ...(data as object) }
                  : data
              )
          })
        );
        pending = result.catch(() => undefined);
        return result;
      }
    )
  };
});

const result = {
  ...mockMatchResult("player-a", "player-b"),
  matchId: "offline-integration",
  participantIds: ["player-a", "player-b"] as [string, string],
  results: { "player-a": "win", "player-b": "lose" } as const
};

beforeEach(async () => {
  await clearMatchResultQueue();
  (auth as unknown as { currentUser: { uid: string } | null }).currentUser = {
    uid: "player-a"
  };
  jest.mocked(getNetworkStateAsync).mockResolvedValue({ isConnected: false });
  jest.mocked(addNetworkStateListener).mockReturnValue({ remove: jest.fn() });
});

test("offline completion survives restart, reconnect writes it, and retries keep stats unchanged", async () => {
  const observed: string[] = [];
  const unsubscribe = subscribeMatchResultStatus(
    result.matchId,
    "player-a",
    (status) => observed.push(status)
  );
  expect((await submitMatchResult(result, "player-a")).status).toBe("queued");
  expect(await listQueuedMatchResults()).toEqual([
    expect.objectContaining({ result, uploadedBy: "player-a" })
  ]);
  jest
    .mocked(getNetworkStateAsync)
    .mockResolvedValue({ isConnected: true, isInternetReachable: true });
  const stop = startMatchResultQueueSync(() => auth.currentUser?.uid ?? null);
  await flushQueuedMatchResults("player-a");
  stop();
  expect(observed[0]).toBe("queued");
  expect(observed.at(-1)).toBe("written");
  unsubscribe();
  expect(await listQueuedMatchResults()).toEqual([]);
  expect(
    await playerStatsRepository.getPlayerStats("player-a", "Alice")
  ).toMatchObject({ wins: 1, eloRating: 1520 });
  await submitMatchResult(result, "player-a");
  expect(
    await playerStatsRepository.getPlayerStats("player-a", "Alice")
  ).toMatchObject({ wins: 1, eloRating: 1520 });
  (auth as unknown as { currentUser: { uid: string } }).currentUser = {
    uid: "player-b"
  };
  await submitMatchResult(result, "player-b");
  const firstStats = await playerStatsRepository.getPlayerStats(
    "player-b",
    "Bob"
  );
  await submitMatchResult(result, "player-b");
  expect(await playerStatsRepository.getPlayerStats("player-b", "Bob")).toEqual(
    firstStats
  );
  expect(
    await playerStatsRepository.getPlayerStats("player-b", "Bob")
  ).toMatchObject({ losses: 1 });
});

test("switching accounts cannot upload another account's queued result", async () => {
  const owned = { ...result, matchId: "owned-by-a" };
  await submitMatchResult(owned, "player-a");
  (auth as unknown as { currentUser: { uid: string } }).currentUser = {
    uid: "player-b"
  };
  jest.mocked(getNetworkStateAsync).mockResolvedValue({ isConnected: true });
  await flushQueuedMatchResults("player-b");
  expect(
    (await listQueuedMatchResults()).map((entry) => entry.result.matchId)
  ).toEqual(["owned-by-a"]);
  await expect(submitMatchResult(owned, "player-a")).rejects.toThrow(
    "signed-in account"
  );
});

test("logout during connectivity lookup retains the result without writing stats", async () => {
  const owned = { ...result, matchId: "logout-during-upload" };
  jest.mocked(getNetworkStateAsync).mockImplementationOnce(async () => {
    (auth as unknown as { currentUser: null }).currentUser = null;
    return { isConnected: true };
  });
  await expect(submitMatchResult(owned, "player-a")).rejects.toThrow(
    "session has ended"
  );
  expect((await listQueuedMatchResults())[0].result.matchId).toBe(
    owned.matchId
  );
});

test("reconnect flushes retained results and cleanup removes only its subscription", async () => {
  const owned = { ...result, matchId: "reconnect-only" };
  await submitMatchResult(owned, "player-a");
  const stop = startMatchResultQueueSync(() => auth.currentUser?.uid ?? null);
  await new Promise((resolve) => setTimeout(resolve, 0));
  jest.mocked(getNetworkStateAsync).mockResolvedValue({ isConnected: true });
  jest
    .mocked(addNetworkStateListener)
    .mock.calls.at(-1)![0]({ isConnected: true });
  for (
    let attempt = 0;
    attempt < 20 && (await listQueuedMatchResults()).length;
    attempt += 1
  )
    await new Promise((resolve) => setTimeout(resolve, 0));
  expect(await listQueuedMatchResults()).toEqual([]);
  const subscription = jest
    .mocked(addNetworkStateListener)
    .mock.results.at(-1)!.value;
  stop();
  expect(subscription.remove).toHaveBeenCalledTimes(1);
});

test("auth-ready mounting flushes after restart and account changes clean up listeners", async () => {
  const owned = { ...result, matchId: "auth-ready-restart" };
  await submitMatchResult(owned, "player-a");
  jest.mocked(getNetworkStateAsync).mockResolvedValue({ isConnected: true });
  const view = await renderHook(
    ({ uid }: { uid: string | null }) => useMatchResultQueueSync(uid),
    { initialProps: { uid: "player-a" as string | null } }
  );
  for (
    let attempt = 0;
    attempt < 20 && (await listQueuedMatchResults()).length;
    attempt += 1
  )
    await new Promise((resolve) => setTimeout(resolve, 0));
  expect(await listQueuedMatchResults()).toEqual([]);
  const subscription = jest
    .mocked(addNetworkStateListener)
    .mock.results.at(-1)!.value;
  (auth as unknown as { currentUser: null }).currentUser = null;
  await view.rerender({ uid: null });
  expect(subscription.remove).toHaveBeenCalledTimes(1);
  await view.unmount();
});

test("a rating failure after the match write is recoverable without another win or repeated rating", async () => {
  const owned = { ...result, matchId: "partial-write-retry" };
  jest.mocked(getNetworkStateAsync).mockResolvedValue({ isConnected: true });
  const implementation = jest.mocked(runTransaction).getMockImplementation()!;
  jest
    .mocked(runTransaction)
    .mockImplementationOnce(implementation)
    .mockRejectedValueOnce(new Error("Rating permission denied"));
  await expect(submitMatchResult(owned, "player-a")).rejects.toThrow(
    "Rating permission denied"
  );
  expect((await listQueuedMatchResults())[0].result.matchId).toBe(
    owned.matchId
  );
  const before = await playerStatsRepository.getPlayerStats(
    "player-a",
    "Alice"
  );
  await submitMatchResult(owned, "player-a");
  const after = await playerStatsRepository.getPlayerStats("player-a", "Alice");
  expect(after.wins).toBe(before.wins);
  expect(after.eloRating).toBeGreaterThan(before.eloRating);
  await submitMatchResult(owned, "player-a");
  expect(
    await playerStatsRepository.getPlayerStats("player-a", "Alice")
  ).toEqual(after);
});

test("overlapping UI and background submissions cannot downgrade a written result", async () => {
  const owned = { ...result, matchId: "overlapping-submit" };
  const observed: string[] = [];
  const unsubscribe = subscribeMatchResultStatus(
    owned.matchId,
    "player-a",
    (status) => observed.push(status)
  );
  let resolveNetwork!: (state: { isConnected: boolean }) => void;
  jest
    .mocked(getNetworkStateAsync)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveNetwork = resolve;
        })
    )
    .mockResolvedValue({ isConnected: true });
  const first = submitMatchResult(owned, "player-a");
  await new Promise((resolve) => setTimeout(resolve, 0));
  const second = submitMatchResult(owned, "player-a");
  await new Promise((resolve) => setTimeout(resolve, 0));
  resolveNetwork({ isConnected: false });
  await Promise.all([first, second]);
  expect(observed.at(-1)).toBe("written");
  expect(await listQueuedMatchResults()).toEqual([]);
  unsubscribe();
});

test("an overlapping retry reuses a successful write even if connectivity drops", async () => {
  const owned = { ...result, matchId: "written-before-offline" };
  const observed: string[] = [];
  const unsubscribe = subscribeMatchResultStatus(
    owned.matchId,
    "player-a",
    (status) => observed.push(status)
  );
  let resolveNetwork!: (state: { isConnected: boolean }) => void;
  jest
    .mocked(getNetworkStateAsync)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveNetwork = resolve;
        })
    )
    .mockResolvedValue({ isConnected: false });
  const first = submitMatchResult(owned, "player-a");
  await new Promise((resolve) => setTimeout(resolve, 0));
  const second = submitMatchResult(owned, "player-a");
  resolveNetwork({ isConnected: true });
  expect(
    (await Promise.all([first, second])).map((outcome) => outcome.status)
  ).toEqual(["written", "written"]);
  expect(observed.at(-1)).toBe("written");
  expect(await listQueuedMatchResults()).toEqual([]);
  unsubscribe();
});
