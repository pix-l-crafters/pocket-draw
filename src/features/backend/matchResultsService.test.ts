import type { MatchResult } from "../../contracts/matchResult";
import { isNetworkAvailable } from "./connectivity";
import { matchResultsRepository } from "./matchResultsRepository";
import { submitMatchResult } from "./matchResultsService";
import { playerStatsRepository } from "./playerStatsRepository";

jest.mock("./connectivity", () => ({
  isNetworkAvailable: jest.fn(),
  subscribeNetworkChanges: jest.fn()
}));

jest.mock("./matchResultQueue", () => ({
  bumpQueuedMatchResultAttempt: jest.fn(),
  enqueueMatchResult: jest.fn(),
  listQueuedMatchResults: jest.fn(),
  removeQueuedMatchResult: jest.fn()
}));

jest.mock("./matchResultsRepository", () => ({
  matchResultsRepository: { writeMatchResult: jest.fn() }
}));

jest.mock("./playerStatsRepository", () => ({
  playerStatsRepository: { updateEloRating: jest.fn() }
}));

const result: MatchResult = {
  matchId: "match-1",
  participantIds: ["player-a", "player-b"],
  roundCount: 3,
  rounds: [
    {
      kind: "falseStart",
      playerId: "player-b",
      nonOffenderId: "player-a",
      nonOffenderShot: null
    },
    {
      kind: "falseStart",
      playerId: "player-b",
      nonOffenderId: "player-a",
      nonOffenderShot: null
    },
    {
      kind: "falseStart",
      playerId: "player-a",
      nonOffenderId: "player-b",
      nonOffenderShot: null
    }
  ],
  results: { "player-a": "win", "player-b": "lose" },
  completedAt: "2026-10-05T00:00:00.000Z"
};

describe("submitMatchResult", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isNetworkAvailable).mockResolvedValue(true);
    jest.mocked(matchResultsRepository.writeMatchResult).mockResolvedValue();
    jest.mocked(playerStatsRepository.updateEloRating).mockResolvedValue(1520);
  });

  test("updates the uploading player's ELO after saving the match", async () => {
    await submitMatchResult(result, "player-a");

    expect(playerStatsRepository.updateEloRating).toHaveBeenCalledWith(
      "player-a",
      "player-b",
      "win"
    );
  });
});
