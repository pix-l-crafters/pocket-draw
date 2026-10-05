import {
  applyRoundOutcome,
  createRoundLoop,
  isMatchDecided,
  matchResults,
  scoreFromRounds,
  toMatchResult
} from "./roundLoop";

const win = (winnerId: string, reactionMs = 200) => ({
  kind: "win" as const,
  winnerId,
  winnerZone: "bodyshot" as const,
  winnerPoints: 1,
  loserPoints: 0,
  reactionMs,
  opponentReactionMs: reactionMs + 100
});

const tie = () => ({
  kind: "tie" as const,
  zone: "bodyshot" as const,
  reactionMs: 250,
  opponentReactionMs: 250,
  pointsEach: 1 as const
});

describe("roundLoop", () => {
  it("plays all three regular rounds and decides by total points", () => {
    let state = createRoundLoop(["a", "b"]);

    state = applyRoundOutcome(state, win("a"));
    state = applyRoundOutcome(state, win("a", 210));

    expect(isMatchDecided(state)).toBe(false);

    state = applyRoundOutcome(state, {
      kind: "falseStart",
      playerId: "b",
      nonOffenderId: "a",
      nonOffenderShot: { reactionMs: 240, zone: "bodyshot", points: 1 }
    });

    expect(isMatchDecided(state)).toBe(true);
    expect(state.scores).toEqual({ a: 3, b: 0 });
    expect(matchResults(state)).toEqual({ a: "win", b: "lose" });
    expect(toMatchResult(state, "match-1")).toMatchObject({
      matchId: "match-1",
      roundCount: 3,
      results: { a: "win", b: "lose" }
    });
  });

  it("plays one tiebreaker when regular-round points are level", () => {
    let state = createRoundLoop(["a", "b"]);

    state = applyRoundOutcome(state, win("a"));
    state = applyRoundOutcome(state, win("b"));
    state = applyRoundOutcome(state, tie());

    expect(state.scores).toEqual({ a: 2, b: 2 });
    expect(isMatchDecided(state)).toBe(false);

    state = applyRoundOutcome(state, win("b"));

    expect(isMatchDecided(state)).toBe(true);
    expect(matchResults(state)).toEqual({ a: "lose", b: "win" });
    expect(state.rounds).toHaveLength(4);
  });

  it("ends in a draw when points remain level after the tiebreaker", () => {
    let state = createRoundLoop(["a", "b"]);

    for (let round = 0; round < 4; round += 1) {
      state = applyRoundOutcome(state, tie());
    }

    expect(isMatchDecided(state)).toBe(true);
    expect(matchResults(state)).toEqual({ a: "draw", b: "draw" });
    expect(() => applyRoundOutcome(state, win("a"))).toThrow(
      "Cannot add a round after the match has ended."
    );
  });

  it("rebuilds the same point totals from persisted rounds", () => {
    let state = createRoundLoop(["a", "b"]);
    state = applyRoundOutcome(state, win("a"));
    state = applyRoundOutcome(state, win("b"));
    state = applyRoundOutcome(state, tie());
    state = applyRoundOutcome(state, win("a"));

    expect(scoreFromRounds(state.participantIds, state.rounds)).toEqual(
      state.scores
    );
  });

  it.each([
    [null, 0],
    [{ reactionMs: 310, zone: "miss", points: 0 }, 0],
    [{ reactionMs: 260, zone: "bodyshot", points: 1 }, 1],
    [{ reactionMs: 210, zone: "headshot", points: 2 }, 2]
  ] as const)(
    "retains false-start shot %p in a saved match",
    (shot, points) => {
      let state = createRoundLoop(["a", "b"]);
      const outcome = {
        kind: "falseStart" as const,
        playerId: "a",
        nonOffenderId: "b",
        nonOffenderShot: shot
      };
      state = applyRoundOutcome(state, outcome);
      state = applyRoundOutcome(state, win("b"));
      state = applyRoundOutcome(state, win("b"));

      const saved = JSON.parse(
        JSON.stringify(
          toMatchResult(state, "match-false-start", "2026-10-05T00:00:00.000Z")
        )
      );
      expect(saved.rounds[0]).toEqual(outcome);
      expect(saved.rounds[0].nonOffenderShot).toEqual(shot);
      expect(scoreFromRounds(saved.participantIds, saved.rounds)).toEqual({
        a: 0,
        b: points + 2
      });
    }
  );
});
