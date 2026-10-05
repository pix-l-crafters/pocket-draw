import { resolveRoundOutcome, scoreRoundOutcome } from "./roundJudge";

describe("resolveRoundOutcome outside the tie window", () => {
  it("wins for the faster player when their shot lands a bodyshot", () => {
    const outcome = resolveRoundOutcome(
      { playerId: "a", reactionMs: 200, zone: "bodyshot" },
      { playerId: "b", reactionMs: 400, zone: "headshot" }
    );

    expect(outcome).toEqual({
      kind: "win",
      winnerId: "a",
      winnerZone: "bodyshot",
      winnerPoints: 1,
      loserPoints: 0,
      reactionMs: 200,
      opponentReactionMs: 400
    });
  });

  it("wins for the faster player when their shot lands a headshot", () => {
    const outcome = resolveRoundOutcome(
      { playerId: "a", reactionMs: 200, zone: "headshot" },
      { playerId: "b", reactionMs: 400, zone: "bodyshot" }
    );

    expect(outcome).toMatchObject({
      kind: "win",
      winnerId: "a",
      winnerZone: "headshot",
      winnerPoints: 2,
      loserPoints: 0
    });
  });

  it("falls through to the slower player's shot when the faster shot misses", () => {
    const outcome = resolveRoundOutcome(
      { playerId: "a", reactionMs: 200, zone: "miss" },
      { playerId: "b", reactionMs: 400, zone: "bodyshot" }
    );

    expect(outcome).toMatchObject({
      kind: "win",
      winnerId: "b",
      winnerZone: "bodyshot",
      winnerPoints: 1,
      loserPoints: 0
    });
  });

  it("ties at 0-0 when both shots miss", () => {
    const outcome = resolveRoundOutcome(
      { playerId: "a", reactionMs: 200, zone: "miss" },
      { playerId: "b", reactionMs: 400, zone: "miss" }
    );

    expect(outcome).toEqual({
      kind: "tie",
      zone: "miss",
      pointsEach: 0,
      reactionMs: 200,
      opponentReactionMs: 400
    });
  });
});

describe("resolveRoundOutcome inside the tie window", () => {
  it("scores both shots independently and wins for the higher zone", () => {
    const outcome = resolveRoundOutcome(
      { playerId: "a", reactionMs: 200, zone: "bodyshot" },
      { playerId: "b", reactionMs: 250, zone: "headshot" },
      100
    );

    expect(outcome).toEqual({
      kind: "win",
      winnerId: "b",
      winnerZone: "headshot",
      winnerPoints: 2,
      loserPoints: 1,
      reactionMs: 200,
      opponentReactionMs: 250
    });
  });

  it("ties when both players land the same zone", () => {
    const outcome = resolveRoundOutcome(
      { playerId: "a", reactionMs: 200, zone: "bodyshot" },
      { playerId: "b", reactionMs: 250, zone: "bodyshot" },
      100
    );

    expect(outcome).toEqual({
      kind: "tie",
      zone: "bodyshot",
      pointsEach: 1,
      reactionMs: 200,
      opponentReactionMs: 250
    });
  });

  it("ties at 0-0 on a double miss even within the tie window", () => {
    const outcome = resolveRoundOutcome(
      { playerId: "a", reactionMs: 200, zone: "miss" },
      { playerId: "b", reactionMs: 250, zone: "miss" },
      100
    );

    expect(outcome).toEqual({
      kind: "tie",
      zone: "miss",
      pointsEach: 0,
      reactionMs: 200,
      opponentReactionMs: 250
    });
  });

  it("still wins for a hit over a miss within the tie window", () => {
    const outcome = resolveRoundOutcome(
      { playerId: "a", reactionMs: 200, zone: "miss" },
      { playerId: "b", reactionMs: 250, zone: "bodyshot" },
      100
    );

    expect(outcome).toEqual({
      kind: "win",
      winnerId: "b",
      winnerZone: "bodyshot",
      winnerPoints: 1,
      loserPoints: 0,
      reactionMs: 200,
      opponentReactionMs: 250
    });
  });
});

describe("resolveRoundOutcome validation", () => {
  it("throws when both shots belong to the same player", () => {
    expect(() =>
      resolveRoundOutcome(
        { playerId: "a", reactionMs: 200, zone: "miss" },
        { playerId: "a", reactionMs: 400, zone: "miss" }
      )
    ).toThrow(/different players/);
  });

  it("throws on a negative reaction time", () => {
    expect(() =>
      resolveRoundOutcome(
        { playerId: "a", reactionMs: -1, zone: "miss" },
        { playerId: "b", reactionMs: 400, zone: "miss" }
      )
    ).toThrow(/non-negative/);
  });
});

describe("scoreRoundOutcome", () => {
  it.each([
    [null, 0],
    [{ reactionMs: 320, zone: "miss", points: 0 }, 0],
    [{ reactionMs: 260, zone: "bodyshot", points: 1 }, 1],
    [{ reactionMs: 240, zone: "headshot", points: 2 }, 2]
  ] as const)(
    "scores a false start's opposing shot %p as %i",
    (shot, points) => {
      expect(
        scoreRoundOutcome(
          {
            kind: "falseStart",
            playerId: "a",
            nonOffenderId: "b",
            nonOffenderShot: shot
          },
          "a",
          "b"
        )
      ).toEqual([
        { playerId: "a", points: 0 },
        { playerId: "b", points }
      ]);
    }
  );

  it("rejects a false start whose opposing shot points disagree with its zone", () => {
    expect(() =>
      scoreRoundOutcome(
        {
          kind: "falseStart",
          playerId: "a",
          nonOffenderId: "b",
          nonOffenderShot: { reactionMs: 220, zone: "headshot", points: 1 }
        },
        "a",
        "b"
      )
    ).toThrow(/zone/);
  });

  it("credits the non-offender in either participant order", () => {
    expect(
      scoreRoundOutcome(
        {
          kind: "falseStart",
          playerId: "b",
          nonOffenderId: "a",
          nonOffenderShot: { reactionMs: 205, zone: "headshot", points: 2 }
        },
        "a",
        "b"
      )
    ).toEqual([
      { playerId: "a", points: 2 },
      { playerId: "b", points: 0 }
    ]);
  });

  it("rejects a false start with inconsistent participant identities", () => {
    expect(() =>
      scoreRoundOutcome(
        {
          kind: "falseStart",
          playerId: "a",
          nonOffenderId: "a",
          nonOffenderShot: null
        },
        "a",
        "b"
      )
    ).toThrow(/outside this round/);
  });
  it("returns each player's points for a win outcome", () => {
    const outcome = resolveRoundOutcome(
      { playerId: "a", reactionMs: 200, zone: "headshot" },
      { playerId: "b", reactionMs: 400, zone: "bodyshot" }
    );

    expect(scoreRoundOutcome(outcome, "a", "b")).toEqual([
      { playerId: "a", points: 2 },
      { playerId: "b", points: 0 }
    ]);
  });

  it("returns equal points for a tie outcome", () => {
    const outcome = resolveRoundOutcome(
      { playerId: "a", reactionMs: 200, zone: "bodyshot" },
      { playerId: "b", reactionMs: 250, zone: "bodyshot" },
      100
    );

    expect(scoreRoundOutcome(outcome, "a", "b")).toEqual([
      { playerId: "a", points: 1 },
      { playerId: "b", points: 1 }
    ]);
  });
});
