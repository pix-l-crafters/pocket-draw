// Runnable self-check for roundLoop.ts (no test framework in this repo yet):
//   node src/features/duel/roundLoop.check.ts
// Deliberately avoids "node:assert" — this file lives under src/ and is
// type-checked with the app's React Native tsconfig, which doesn't reliably
// resolve Node-only ambient types across every dependency state.

import {
  applyRoundOutcome,
  createRoundLoop,
  isMatchDecided,
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

// best-of-3: 2 wins ends it, third round never needed
let s = createRoundLoop(["a", "b"], 3);
s = applyRoundOutcome(s, {
  kind: "win",
  winnerId: "a",
  reactionMs: 200,
  opponentReactionMs: 300
});
assertEqual(isMatchDecided(s), false, "one win should not decide a best-of-3");
s = applyRoundOutcome(s, {
  kind: "win",
  winnerId: "a",
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
  reactionMs: 200,
  opponentReactionMs: 300
});
s4 = applyRoundOutcome(s4, {
  kind: "win",
  winnerId: "b",
  reactionMs: 200,
  opponentReactionMs: 300
});
s4 = applyRoundOutcome(s4, {
  kind: "tie",
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

console.log("roundLoop self-check passed");
