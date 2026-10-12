import type { MatchResult } from "../../contracts/matchResult";
import { computeLeaderboard } from "./leaderboard";

function match(
  matchId: string,
  a: string,
  b: string,
  winnerId: string,
  completedAt: string
): MatchResult {
  return {
    matchId,
    participantIds: [a, b],
    results: {
      [a]: winnerId === a ? "win" : "lose",
      [b]: winnerId === b ? "win" : "lose"
    },
    completedAt,
    rounds: [
      {
        kind: "win",
        winnerId,
        winnerZone: "bodyshot",
        loserZone: "miss",
        winnerPoints: 1,
        loserPoints: 0,
        reactionMs: winnerId === a ? 200 : 250,
        opponentReactionMs: winnerId === a ? 250 : 200
      }
    ]
  };
}

describe("computeLeaderboard", () => {
  const names = new Map([
    ["alice", "Alice"],
    ["bob", "Bob"]
  ]);

  test("ranks by ELO descending after replaying matches in order", () => {
    const matches: MatchResult[] = [
      match("m1", "alice", "bob", "alice", "2026-01-01T00:00:00.000Z"),
      match("m2", "alice", "bob", "alice", "2026-01-02T00:00:00.000Z")
    ];

    const board = computeLeaderboard(matches, names, "eloRating");

    expect(board.map((entry) => entry.uid)).toEqual(["alice", "bob"]);
    expect(board[0].wins).toBe(2);
    expect(board[1].losses).toBe(2);
    expect(board[0].eloRating).toBeGreaterThan(board[1].eloRating);
  });

  test("counts a win for the second participant", () => {
    const board = computeLeaderboard(
      [match("m1", "alice", "bob", "bob", "2026-01-01T00:00:00.000Z")],
      names
    );

    expect(board.find((entry) => entry.uid === "bob")).toMatchObject({
      wins: 1,
      losses: 0,
      eloRating: 1520
    });
    expect(board.find((entry) => entry.uid === "alice")).toMatchObject({
      wins: 0,
      losses: 1,
      eloRating: 1480
    });
  });

  test("updates ELO for a draw without adding a win or loss", () => {
    const drawnMatch: MatchResult = {
      matchId: "m2",
      participantIds: ["alice", "bob"],
      results: { alice: "draw", bob: "draw" },
      completedAt: "2026-01-02T00:00:00.000Z",
      rounds: Array.from({ length: 4 }, () => ({
        kind: "tie",
        zone: "bodyshot",
        pointsEach: 1,
        reactionMs: 250,
        opponentReactionMs: 250
      }))
    };
    const board = computeLeaderboard(
      [
        drawnMatch,
        match("m1", "alice", "bob", "alice", "2026-01-01T00:00:00.000Z")
      ],
      names
    );

    expect(board.find((entry) => entry.uid === "alice")).toMatchObject({
      wins: 1,
      losses: 0,
      eloRating: 1518,
      avgReactionMs: 200
    });
    expect(board.find((entry) => entry.uid === "bob")).toMatchObject({
      wins: 0,
      losses: 1,
      eloRating: 1482,
      avgReactionMs: 250
    });
  });

  test("ranks by average reaction time ascending, unranked players last", () => {
    const matches: MatchResult[] = [
      match("m1", "alice", "bob", "alice", "2026-01-01T00:00:00.000Z")
    ];

    const board = computeLeaderboard(matches, names, "avgReactionMs");

    expect(board[0].uid).toBe("alice");
    expect(board[0].avgReactionMs).toBe(200);
    expect(board[1].avgReactionMs).toBe(250);
  });

  test("falls back to a generic name when no users doc exists", () => {
    const matches: MatchResult[] = [
      match("m1", "alice", "carol", "alice", "2026-01-01T00:00:00.000Z")
    ];

    const board = computeLeaderboard(matches, names, "eloRating");
    const carol = board.find((entry) => entry.uid === "carol");

    expect(carol?.displayName).toBe("Player");
  });
});
