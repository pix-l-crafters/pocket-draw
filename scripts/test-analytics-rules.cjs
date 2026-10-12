// Run with Firebase emulators:exec --only firestore, never against production.
const assert = require("node:assert/strict");
const { initializeApp, deleteApp } = require("firebase/app");
const {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
  runTransaction,
  terminate,
  setLogLevel
} = require("firebase/firestore");

const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!host || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) {
  throw new Error("A local FIRESTORE_EMULATOR_HOST is required.");
}
const [hostname, port] = host.split(":");
const clients = [];
function client(uid) {
  const app = initializeApp(
    { projectId: "demo-pocket-draw-analytics" },
    uid ?? "anonymous"
  );
  const db = getFirestore(app);
  connectFirestoreEmulator(
    db,
    hostname,
    Number(port),
    uid ? { mockUserToken: { sub: uid, user_id: uid } } : undefined
  );
  clients.push({ app, db });
  return db;
}
function data(playerId = "a") {
  return {
    schemaVersion: 1,
    matchId: "rules-test",
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
    })),
    createdAt: serverTimestamp()
  };
}
async function denied(operation) {
  await assert.rejects(
    operation,
    (error) => error.code === "permission-denied"
  );
}

async function main() {
  setLogLevel("silent");
  const a = client("a");
  const b = client("b");
  const anonymous = client();
  const ref = doc(a, "analytics", "rules-test_a");
  assert.equal((await getDoc(ref)).exists(), false);
  await runTransaction(a, async (transaction) => {
    assert.equal((await transaction.get(ref)).exists(), false);
    transaction.set(ref, data());
  });
  assert.equal((await getDoc(ref)).data().playerId, "a");
  await runTransaction(a, async (transaction) => {
    assert.equal((await transaction.get(ref)).exists(), true);
  });
  await setDoc(doc(b, "analytics", "rules-test_b"), data("b"));
  assert.equal(
    (
      await getDocs(
        query(collection(a, "analytics"), where("playerId", "==", "a"))
      )
    ).size,
    1
  );
  await denied(() => setDoc(ref, data()));
  await denied(() => getDoc(doc(b, "analytics", "rules-test_a")));
  await denied(() => getDocs(collection(b, "analytics")));
  await denied(() => getDoc(doc(anonymous, "analytics", "rules-test_a")));
  await denied(() =>
    setDoc(doc(anonymous, "analytics", "rules-test_a"), data())
  );
  await denied(() =>
    setDoc(doc(b, "analytics", "impersonate_a"), {
      ...data(),
      matchId: "impersonate"
    })
  );
  await denied(() => setDoc(doc(a, "analytics", "wrong-path"), data()));
  await denied(() =>
    setDoc(doc(a, "analytics", "invalid_a"), {
      ...data(),
      matchId: "invalid",
      rounds: []
    })
  );
  console.log(
    "Analytics rules passed: owner create/read/query, separate player uploads, immutable retry, unauthorized reads/writes, invalid path and payload."
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all(
      clients.map(async ({ app, db }) => {
        await terminate(db);
        await deleteApp(app);
      })
    );
  });
