import { collection, getDocs } from "firebase/firestore";

import { getLeaderboard } from "./leaderboardRepository";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  getDocs: jest.fn()
}));

jest.mock("../../lib/firebase", () => ({
  db: { name: "test-database" }
}));

function mockUsers(
  users: Array<{ id: string; data: Record<string, unknown> }>
) {
  jest.mocked(getDocs).mockResolvedValue({
    docs: users.map((user) => ({ id: user.id, data: () => user.data }))
  } as never);
}

describe("getLeaderboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("reads all users and ranks stored ratings, including players without matches", async () => {
    mockUsers([
      { id: "low", data: { displayName: "Low", eloRating: 1400 } },
      { id: "new", data: { displayName: "New" } },
      {
        id: "high",
        data: {
          displayName: "High",
          eloRating: 1800,
          win: 4,
          lose: 2,
          draw: 1,
          matchesPlayed: 7
        }
      }
    ]);

    const board = await getLeaderboard();

    expect(collection).toHaveBeenCalledTimes(1);
    expect(collection).toHaveBeenCalledWith({ name: "test-database" }, "users");
    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(board.map((entry) => [entry.uid, entry.eloRating])).toEqual([
      ["high", 1800],
      ["new", 1500],
      ["low", 1400]
    ]);
    expect(board[0]).toEqual({
      uid: "high",
      displayName: "High",
      eloRating: 1800
    });
  });

  test.each([
    undefined,
    null,
    "",
    "   ",
    "invalid",
    Number.NaN,
    Number.POSITIVE_INFINITY
  ])("defaults an empty or invalid rating (%s) to 1500", async (eloRating) => {
    mockUsers([{ id: "player", data: { displayName: "Player", eloRating } }]);
    expect((await getLeaderboard())[0].eloRating).toBe(1500);
  });

  test("preserves a zero rating and uses a fallback for an empty display name", async () => {
    mockUsers([{ id: "player", data: { displayName: "", eloRating: 0 } }]);
    expect((await getLeaderboard())[0]).toMatchObject({
      eloRating: 0,
      displayName: "Player"
    });
  });

  test("limits to the top 100 after sorting the entire users collection", async () => {
    mockUsers([
      ...Array.from({ length: 105 }, (_, index) => ({
        id: `player-${index}`,
        data: { displayName: `Player ${index}`, eloRating: 1400 + index }
      })),
      { id: "new", data: { displayName: "New" } }
    ]);

    const board = await getLeaderboard();

    expect(board).toHaveLength(100);
    expect(board[0].eloRating).toBe(1504);
    expect(board[99].eloRating).toBe(1406);
    expect(board.find((entry) => entry.uid === "new")).toBeDefined();
  });

  test("returns an empty list when there are no users", async () => {
    mockUsers([]);
    await expect(getLeaderboard()).resolves.toEqual([]);
  });

  test("propagates a Firestore read failure", async () => {
    jest.mocked(getDocs).mockRejectedValue(new Error("Read failed"));
    await expect(getLeaderboard()).rejects.toThrow("Read failed");
  });
});
