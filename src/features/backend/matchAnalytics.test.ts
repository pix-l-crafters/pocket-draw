import AsyncStorage from "@react-native-async-storage/async-storage";
import { waitFor } from "@testing-library/react-native";
import { doc, getDoc, runTransaction } from "firebase/firestore";

import type { MatchAnalytics } from "../../contracts/matchAnalytics";
import { auth } from "../../lib/firebase";
import { isNetworkAvailable, subscribeNetworkChanges } from "./connectivity";
import {
  flushQueuedAnalytics,
  submitMatchAnalytics,
  startAnalyticsQueueSync
} from "./matchAnalytics";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../../lib/firebase", () => ({
  db: {},
  auth: { currentUser: null }
}));
jest.mock("./connectivity", () => ({
  isNetworkAvailable: jest.fn(),
  subscribeNetworkChanges: jest.fn(() => () => undefined)
}));
jest.mock("firebase/firestore", () => {
  const documents = new Map();
  let pending = Promise.resolve();
  const getDoc = async (ref: string) => ({
    exists: () => documents.has(ref),
    data: () => documents.get(ref)
  });
  return {
    doc: (_db: unknown, collection: string, id: string) =>
      `${collection}/${id}`,
    getDoc,
    serverTimestamp: () => "server-time",
    runTransaction: jest.fn(
      (_db: unknown, update: (transaction: unknown) => Promise<void>) => {
        const next = pending.then(() =>
          update({
            get: getDoc,
            set: (ref: string, data: unknown) => documents.set(ref, data)
          })
        );
        pending = next.catch(() => undefined);
        return next;
      }
    )
  };
});

function analytics(matchId: string, playerId = "a"): MatchAnalytics {
  return {
    schemaVersion: 1,
    matchId,
    playerId,
    participantIds: ["a", "b"],
    platform: "ios",
    completedAt: "2026-10-10T01:00:00Z",
    clockOffsetMs: 0,
    calibration: { thetaReady: 0, thetaShoulder: 1 },
    thresholds: {
      bodyshotMinF: 0.8,
      bodyshotMaxF: 1,
      headshotMaxF: 1.2,
      aimToleranceDegrees: 30
    },
    rounds: [1, 2, 3].map((roundNumber) => ({
      roundNumber,
      reactionMs: null,
      zone: "miss",
      missReason: "noShot",
      shot: null
    }))
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  Object.assign(auth, { currentUser: { uid: "a" } });
  jest.mocked(isNetworkAvailable).mockResolvedValue(true);
});

test("saves separate immutable documents for both players and retries without overwriting", async () => {
  const first = analytics("both");
  await expect(submitMatchAnalytics(first)).resolves.toBe("written");
  await submitMatchAnalytics({ ...first, clockOffsetMs: 999 });
  expect(
    (await getDoc(doc({} as never, "analytics", "both_a"))).data()
  ).toMatchObject({ clockOffsetMs: 0, createdAt: "server-time" });
  Object.assign(auth, { currentUser: { uid: "b" } });
  await submitMatchAnalytics(analytics("both", "b"));
  expect(
    (await getDoc(doc({} as never, "analytics", "both_b"))).data()
  ).toMatchObject({ playerId: "b" });
});

test("queues offline analytics durably and flushes only the current account", async () => {
  jest.mocked(isNetworkAvailable).mockResolvedValue(false);
  await expect(submitMatchAnalytics(analytics("offline"))).resolves.toBe(
    "queued"
  );
  Object.assign(auth, { currentUser: { uid: "b" } });
  await submitMatchAnalytics(analytics("offline", "b"));
  jest.mocked(isNetworkAvailable).mockResolvedValue(true);
  await flushQueuedAnalytics("b");
  expect(
    (await getDoc(doc({} as never, "analytics", "offline_a"))).exists()
  ).toBe(false);
  expect(
    (await getDoc(doc({} as never, "analytics", "offline_b"))).exists()
  ).toBe(true);
  Object.assign(auth, { currentUser: { uid: "a" } });
  await flushQueuedAnalytics("a");
  expect(
    (await getDoc(doc({} as never, "analytics", "offline_a"))).data()
  ).toMatchObject({ rounds: analytics("offline").rounds });
});

test("rejects impersonated or malformed uploads before queuing", async () => {
  await expect(submitMatchAnalytics(analytics("wrong", "b"))).rejects.toThrow();
  await expect(
    submitMatchAnalytics({ ...analytics("invalid"), rounds: [] })
  ).rejects.toThrow();
  expect(await AsyncStorage.getAllKeys()).toEqual([]);
});

test.each(["unavailable", "permission-denied"])(
  "retains a failed %s upload for retry",
  async (code) => {
    jest
      .mocked(runTransaction)
      .mockRejectedValueOnce(Object.assign(new Error(code), { code }));
    const data = analytics(`failed-${code}`);
    if (code === "unavailable")
      await expect(submitMatchAnalytics(data)).resolves.toBe("queued");
    else await expect(submitMatchAnalytics(data)).rejects.toThrow(code);
    expect(
      await AsyncStorage.getItem("@pocket-draw/match-analytics-queue")
    ).toContain(data.matchId);
    await expect(submitMatchAnalytics(data)).resolves.toBe("written");
    expect(
      (
        await getDoc(doc({} as never, "analytics", `${data.matchId}_a`))
      ).exists()
    ).toBe(true);
  }
);

test("does not upload after the initiating auth session ends during connectivity checking", async () => {
  jest.mocked(isNetworkAvailable).mockImplementationOnce(async () => {
    Object.assign(auth, { currentUser: { uid: "b" } });
    return true;
  });
  await expect(
    submitMatchAnalytics(analytics("session-ended"))
  ).rejects.toThrow("session has ended");
  expect(
    (await getDoc(doc({} as never, "analytics", "session-ended_a"))).exists()
  ).toBe(false);
  expect(
    await AsyncStorage.getItem("@pocket-draw/match-analytics-queue")
  ).toContain("session-ended");
});

test("reconnection flushes queued analytics and releases its network listener", async () => {
  jest.mocked(isNetworkAvailable).mockResolvedValue(false);
  await submitMatchAnalytics(analytics("reconnect"));
  const stop = startAnalyticsQueueSync(() => "a");
  await waitFor(() => expect(subscribeNetworkChanges).toHaveBeenCalled());
  jest.mocked(isNetworkAvailable).mockResolvedValue(true);
  const listener = jest.mocked(subscribeNetworkChanges).mock.calls.at(-1)![0];
  listener(true);
  await waitFor(async () =>
    expect(
      (await getDoc(doc({} as never, "analytics", "reconnect_a"))).exists()
    ).toBe(true)
  );
  stop();
});

test("serializes concurrent retries without duplicating or replacing the first snapshot", async () => {
  const data = analytics("concurrent");
  await Promise.all([
    submitMatchAnalytics(data),
    submitMatchAnalytics({ ...data, clockOffsetMs: 99 })
  ]);
  expect(
    (await getDoc(doc({} as never, "analytics", "concurrent_a"))).data()
  ).toMatchObject({ clockOffsetMs: 0 });
  expect(await AsyncStorage.getItem("@pocket-draw/match-analytics-queue")).toBe(
    "[]"
  );
});
