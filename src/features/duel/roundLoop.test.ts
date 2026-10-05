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
  reactionMs,
  opponentReactionMs: reactionMs + 100
});

const tie = () => ({
  kind: "tie" as const,
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

    state = applyRoundOutcome(state, { kind: "falseStart", playerId: "b" });

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
});
