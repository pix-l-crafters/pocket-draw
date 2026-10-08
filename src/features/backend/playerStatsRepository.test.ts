import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  runTransaction,
  where
} from "firebase/firestore";

import { playerStatsRepository } from "./playerStatsRepository";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  setDoc: jest.fn(),
  runTransaction: jest.fn(),
  where: jest.fn()
}));

jest.mock("../../lib/firebase", () => ({
  db: { name: "test-database" }
}));

const userReferences = {
  playerA: { path: "users/player-a" },
  playerB: { path: "users/player-b" }
};

function snapshot(data: Record<string, unknown> | undefined) {
  return { exists: () => data !== undefined, data: () => data } as never;
}

describe("playerStatsRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(collection).mockReturnValue({ path: "matches" } as never);
    jest.mocked(where).mockReturnValue({ field: "participantIds" } as never);
    jest.mocked(query).mockReturnValue({ path: "matches-query" } as never);
    jest.mocked(getDocs).mockResolvedValue({ docs: [] } as never);
    jest
      .mocked(doc)
      .mockImplementation((_, __, uid) =>
        uid === "player-a"
          ? (userReferences.playerA as never)
          : (userReferences.playerB as never)
      );
    jest.mocked(setDoc).mockResolvedValue(undefined as never);
    jest
      .mocked(runTransaction)
      .mockImplementation(async (_, update) =>
        update({ get: getDoc, set: setDoc } as never)
      );
  });

  test("counts draws from the player's match results", async () => {
    jest.mocked(getDocs).mockResolvedValue({
      docs: [
        {
          data: () => ({
            matchId: "drawn-match",
            participantIds: ["player-a", "player-b"],
            results: { "player-a": "draw", "player-b": "draw" },
            completedAt: "2026-10-07T12:00:00.000Z"
          })
        }
      ]
    } as never);
    jest.mocked(getDoc).mockResolvedValue(snapshot({ eloRating: 1510 }));

    await expect(
      playerStatsRepository.getPlayerStats("player-a", "Quick Draw")
    ).resolves.toMatchObject({
      wins: 0,
      losses: 0,
      draws: 1,
      eloRating: 1510
    });
  });
  test("loads the stored ELO rating instead of replaying match history", async () => {
    jest.mocked(getDoc).mockResolvedValue(snapshot({ eloRating: 1624 }));

    await expect(
      playerStatsRepository.getPlayerStats("player-a", "Quick Draw")
    ).resolves.toMatchObject({ eloRating: 1624 });
  });

  test.each([undefined, {}, { eloRating: "high" }])(
    "uses 1500 when the user document has no valid ELO rating",
    async (data) => {
      jest.mocked(getDoc).mockResolvedValue(snapshot(data));

      await expect(
        playerStatsRepository.getPlayerStats("player-a", "Quick Draw")
      ).resolves.toMatchObject({ eloRating: 1500 });
    }
  );

  test("calculates and saves only the local player's new ELO rating", async () => {
    jest
      .mocked(getDoc)
      .mockResolvedValueOnce(snapshot({ eloRating: 1500 }))
      .mockResolvedValueOnce(snapshot({ eloRating: 1500 }))
      .mockResolvedValueOnce(snapshot(undefined));

    await expect(
      playerStatsRepository.updateEloRating(
        "player-a",
        "player-b",
        "win",
        "match-1"
      )
    ).resolves.toBe(1520);

    expect(setDoc).toHaveBeenCalledWith(
      userReferences.playerA,
      { eloRating: 1520 },
      { merge: true }
    );
  });
});
