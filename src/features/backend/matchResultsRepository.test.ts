import { doc, getDoc } from "firebase/firestore";

import {
  applyRoundOutcome,
  createRoundLoop,
  toMatchResult
} from "../duel/roundLoop";
import { judgeRoundShots } from "../duel/roundShots";
import { matchResultsRepository } from "./matchResultsRepository";

jest.mock("../../lib/firebase", () => ({ db: {} }));

// Model the create-only rules and serialize atomic transactions at the SDK
// boundary. Separate reads/writes can both read a missing document.
jest.mock("firebase/firestore", () => {
  const documents = new Map();
  let pending = Promise.resolve();
  const getDoc = async (ref: string) => {
    const data = documents.get(ref);
    return { exists: () => data !== undefined, data: () => data };
  };
  const setDoc = async (ref: string, data: unknown) => {
    if (documents.has(ref)) {
      throw Object.assign(new Error("Updates are forbidden"), {
        code: "permission-denied"
      });
    }
    documents.set(ref, data);
  };
  return {
    doc: (_db: unknown, collection: string, id: string) =>
      `${collection}/${id}`,
    getDoc,
    setDoc,
    serverTimestamp: () => "server-time",
    runTransaction: (
      _db: unknown,
      update: (transaction: unknown) => Promise<void>
    ) => {
      const result = pending.then(() => update({ get: getDoc, set: setDoc }));
      pending = result.catch(() => undefined);
      return result;
    }
  };
});

test("both phones can save the same completed match under create-only rules", async () => {
  let loop = createRoundLoop(["player-a", "player-b"]);
  const round = judgeRoundShots(
    { id: "player-a", name: "Alice" },
    { id: "player-b", name: "Bob" },
    { selfReactionMs: 100, opponentReactionMs: 200 }
  );
  for (let index = 0; index < 3; index += 1)
    loop = applyRoundOutcome(loop, round);
  const result = toMatchResult(loop, "concurrent-match");

  await expect(
    Promise.all([
      matchResultsRepository.writeMatchResult(result, "player-a"),
      matchResultsRepository.writeMatchResult(result, "player-b")
    ])
  ).resolves.toEqual([undefined, undefined]);
  const saved = await getDoc(doc({} as never, "matches", result.matchId));
  expect(saved.data()).toMatchObject({
    roundCount: 3,
    results: result.results
  });
  // Retries must also skip the existing immutable result.
  await expect(
    matchResultsRepository.writeMatchResult(result, "player-a")
  ).resolves.toBeUndefined();
});
