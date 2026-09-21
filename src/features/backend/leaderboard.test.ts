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
    roundCount: 3,
    winnerId,
    completedAt,
    rounds: [
      {
        kind: "win",
        winnerId,
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
