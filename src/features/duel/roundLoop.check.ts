// Runnable self-check for roundLoop.ts (no test framework in this repo yet):
//
//   node src/features/duel/roundLoop.check.ts
//
// Deliberately avoids "node:assert" — this file lives under src/ and is
// type-checked with the app's React Native tsconfig, which doesn't reliably
// resolve Node-only ambient types across every dependency state.

import {
  applyRoundOutcome,
  createRoundLoop,
  isMatchDecided,
  matchResults,
  matchWinnerId,
  scoreFromRounds,
  toMatchResult
} from "./roundLoop.ts";

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

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

// -----------------------------------------------------------------------------
// Version 1 checks
// -----------------------------------------------------------------------------
{
  // Every match plays all three regular rounds, even if one player leads 2-0.
  let s = createRoundLoop(["a", "b"]);

  s = applyRoundOutcome(s, win("a"));
  assertEqual(isMatchDecided(s), false, "one round cannot decide a match");

  s = applyRoundOutcome(s, win("a", 210));
  assertEqual(isMatchDecided(s), false, "two rounds cannot decide a match");

  s = applyRoundOutcome(s, {
    kind: "falseStart",
    playerId: "b"
  });

  assertEqual(isMatchDecided(s), true, "three rounds with a lead decide a match");
  assertEqual(s.scores, { a: 3, b: 0 }, "round points are summed");
  assertEqual(matchWinnerId(s), "a", "higher total points should win");

  assertEqual(
    matchResults(s),
    { a: "win", b: "lose" },
    "results should be explicit for both players"
  );

  assertEqual(
    toMatchResult(s, "match-1").results,
    { a: "win", b: "lose" },
    "MatchResult should store both player outcomes"
  );

  // A level score after three rounds opens exactly one tiebreaker.
  let s2 = createRoundLoop(["a", "b"]);

  s2 = applyRoundOutcome(s2, win("a"));
  s2 = applyRoundOutcome(s2, win("b"));
  s2 = applyRoundOutcome(s2, tie());

  assertEqual(s2.scores, { a: 2, b: 2 }, "regular rounds can finish level");

  assertEqual(
    isMatchDecided(s2),
    false,
    "a level score after three rounds requires a tiebreaker"
  );

  s2 = applyRoundOutcome(s2, win("b"));

  assertEqual(isMatchDecided(s2), true, "the tiebreaker ends the match");
  assertEqual(matchWinnerId(s2), "b", "tiebreaker points count in the total");

  assertEqual(
    matchResults(s2),
    { a: "lose", b: "win" },
    "tiebreaker winner should be reflected for both players"
  );

  // A level score after the tiebreaker is a final draw; no fifth round exists.
  let s3 = createRoundLoop(["a", "b"]);

  s3 = applyRoundOutcome(s3, tie());
  s3 = applyRoundOutcome(s3, tie());
  s3 = applyRoundOutcome(s3, tie());

  assertEqual(isMatchDecided(s3), false, "three tied rounds need a tiebreaker");

  s3 = applyRoundOutcome(s3, tie());

  assertEqual(isMatchDecided(s3), true, "a tied tiebreaker still ends the match");
  assertEqual(matchWinnerId(s3), undefined, "a drawn match has no winner");

  assertEqual(
    matchResults(s3),
    { a: "draw", b: "draw" },
    "both players should receive an explicit draw"
  );

  let rejectedExtraRound = false;

  try {
    applyRoundOutcome(s3, win("a"));
  } catch {
    rejectedExtraRound = true;
  }

  assertEqual(rejectedExtraRound, true, "a fifth round must be rejected");

  // scoreFromRounds agrees with the live tally kept by applyRoundOutcome.
  assertEqual(
    scoreFromRounds(["a", "b"], s.rounds),
    s.scores,
    "scoreFromRounds vs live tally (decided in three)"
  );

  assertEqual(
    scoreFromRounds(["a", "b"], s2.rounds),
    s2.scores,
    "scoreFromRounds vs live tally (tiebreaker)"
  );

  // A malformed outcome referencing a third player is rejected by the scorer.
  let rejectedUnknownPlayer = false;

  try {
    applyRoundOutcome(createRoundLoop(["a", "b"]), {
      kind: "win",
      winnerId: "c",
      reactionMs: 200,
      opponentReactionMs: 300
    });
  } catch {
    rejectedUnknownPlayer = true;
  }

  assertEqual(rejectedUnknownPlayer, true, "unknown players must be rejected");
}

// -----------------------------------------------------------------------------
// Version 2 checks
// -----------------------------------------------------------------------------
{
  // best-of-3: 2 wins ends it, third round never needed
  let s = createRoundLoop(["a", "b"], 3);

  s = applyRoundOutcome(s, {
    kind: "win",
    winnerId: "a",
    winnerZone: "bodyshot",
    winnerPoints: 1,
    loserPoints: 0,
    reactionMs: 200,
    opponentReactionMs: 300
  });

  assertEqual(isMatchDecided(s), false, "one win should not decide a best-of-3");

  s = applyRoundOutcome(s, {
    kind: "win",
    winnerId: "a",
    winnerZone: "bodyshot",
    winnerPoints: 1,
    loserPoints: 0,
    reactionMs: 210,
    opponentReactionMs: 290
  });

  assertEqual(isMatchDecided(s), true, "two wins should decide a best-of-3");
  assertEqual(matchWinnerId(s), "a", "winner should be a");
  assertEqual(toMatchResult(s, "match-1").winnerId, "a", "MatchResult winnerId");

  // false start counts as a round loss for the false-starter
  let s2 = createRoundLoop(["a", "b"], 3);

  s2 = applyRoundOutcome(s2, { kind: "falseStart", playerId: "a" });

  assertEqual(s2.wins, { a: 0, b: 1 }, "false start gives opponent the round");
  assertEqual(isMatchDecided(s2), false, "one round loss should not decide it");

  // a tie scores a point for both players and never decides the match on its own
  let s3 = createRoundLoop(["a", "b"], 5);

  s3 = applyRoundOutcome(s3, {
    kind: "tie",
    zone: "bodyshot",
    reactionMs: 250,
    opponentReactionMs: 260,
    pointsEach: 1
  });

  assertEqual(s3.wins, { a: 1, b: 1 }, "tie gives both players a point");
  assertEqual(s3.rounds.length, 1, "tie is still recorded in round history");
  assertEqual(isMatchDecided(s3), false, "a tie should not decide the match");

  // simultaneous majority (both players hit the threshold on the same tie
  // round) is a draw, not a win — the match plays a sudden-death decider.
  // best-of-3 needs 2 points; split the first two rounds 1-1, then tie the
  // third so both land on 2 at once.
  let s4 = createRoundLoop(["a", "b"], 3);

  s4 = applyRoundOutcome(s4, {
    kind: "win",
    winnerId: "a",
    winnerZone: "bodyshot",
    winnerPoints: 1,
    loserPoints: 0,
    reactionMs: 200,
    opponentReactionMs: 300
  });

  s4 = applyRoundOutcome(s4, {
    kind: "win",
    winnerId: "b",
    winnerZone: "bodyshot",
    winnerPoints: 1,
    loserPoints: 0,
    reactionMs: 200,
    opponentReactionMs: 300
  });

  s4 = applyRoundOutcome(s4, {
    kind: "tie",
    zone: "bodyshot",
    reactionMs: 250,
    opponentReactionMs: 250,
    pointsEach: 1
  });

  assertEqual(s4.wins, { a: 2, b: 2 }, "both players should be tied at 2-2");

  assertEqual(
    isMatchDecided(s4),
    false,
    "both players reaching the threshold together should not decide it"
  );

  s4 = applyRoundOutcome(s4, {
    kind: "win",
    winnerId: "a",
    winnerZone: "bodyshot",
    winnerPoints: 1,
    loserPoints: 0,
    reactionMs: 200,
    opponentReactionMs: 300
  });

  assertEqual(
    matchWinnerId(s4),
    "a",
    "a decider round should resolve a simultaneous-majority tie"
  );

  // scoreFromRounds agrees with the live tally kept by applyRoundOutcome
  assertEqual(
    scoreFromRounds(["a", "b"], s.rounds),
    s.wins,
    "scoreFromRounds vs live tally (s)"
  );

  assertEqual(
    scoreFromRounds(["a", "b"], s2.rounds),
    s2.wins,
    "scoreFromRounds vs live tally (s2)"
  );
}

console.log("roundLoop merged self-check passed");
