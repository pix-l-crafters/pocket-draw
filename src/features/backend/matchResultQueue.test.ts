import type { MatchResult } from "../../contracts/matchResult";
import {
  clearMatchResultQueue,
  enqueueMatchResult,
  listQueuedMatchResults
} from "./matchResultQueue";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

describe("match result queue", () => {
  afterEach(async () => {
    await clearMatchResultQueue();
  });

  it("preserves a false-start shot through storage serialization", async () => {
    const result: MatchResult = {
      matchId: "false-start-match",
      participantIds: ["a", "b"],
      roundCount: 3,
      rounds: [
        {
          kind: "falseStart",
          playerId: "a",
          nonOffenderId: "b",
          nonOffenderShot: { reactionMs: 215, zone: "headshot", points: 2 }
        },
        {
          kind: "tie",
          zone: "miss",
          pointsEach: 0,
          reactionMs: 300,
          opponentReactionMs: 330
        },
        {
          kind: "tie",
          zone: "miss",
          pointsEach: 0,
          reactionMs: 320,
          opponentReactionMs: 350
        }
      ],
      results: { a: "lose", b: "win" },
      completedAt: "2026-10-05T00:00:00.000Z"
    };

    await enqueueMatchResult(result);
    expect((await listQueuedMatchResults())[0]?.result.rounds[0]).toEqual(
      result.rounds[0]
    );
  });
});
