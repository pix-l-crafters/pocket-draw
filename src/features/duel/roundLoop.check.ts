// Runnable self-check for roundLoop.ts (no test framework in this repo yet):
//   node src/features/duel/roundLoop.check.ts
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

console.log("roundLoop self-check passed");
