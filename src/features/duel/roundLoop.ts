// 4.17 — round loop / match-decided logic: tracks round wins across a
// best-of-3/5/7 match and decides when it's over.
//
// Round rules (docs/superpowers/specs/2026-09-06-map-duel-implementation-design.md §10):
// - "win": winnerId gets a round win.
// - "falseStart": the false-starting player loses the round (opponent gets
//   the win); the match continues.
// - "tie": sudden-death replay for that round — no win tally change. Still
//   appended to `rounds` so the summary can show it happened.

import assert from "node:assert";

import type { RoundOutcome } from "../../contracts/roundOutcome";
import type { MatchResult } from "../../contracts/matchResult";

export interface RoundLoopState {
  participantIds: [string, string];
  roundCount: 3 | 5 | 7;
  rounds: RoundOutcome[];
  wins: Record<string, number>;
}

export function createRoundLoop(
  participantIds: [string, string],
  roundCount: 3 | 5 | 7
): RoundLoopState {
  const [a, b] = participantIds;
  return {
    participantIds,
    roundCount,
    rounds: [],
    wins: { [a]: 0, [b]: 0 }
  };
}

export function applyRoundOutcome(
  state: RoundLoopState,
  outcome: RoundOutcome
): RoundLoopState {
  const wins = { ...state.wins };
  if (outcome.kind === "win") {
    wins[outcome.winnerId] = (wins[outcome.winnerId] ?? 0) + 1;
  } else if (outcome.kind === "falseStart") {
    const opponentId = state.participantIds.find(
      (id) => id !== outcome.playerId
    );
    if (opponentId) wins[opponentId] = (wins[opponentId] ?? 0) + 1;
  }
  return { ...state, rounds: [...state.rounds, outcome], wins };
}

function winsNeeded(roundCount: 3 | 5 | 7): number {
  return Math.ceil(roundCount / 2);
}

export function matchWinnerId(state: RoundLoopState): string | undefined {
  const needed = winsNeeded(state.roundCount);
  return state.participantIds.find((id) => state.wins[id] >= needed);
}

export function isMatchDecided(state: RoundLoopState): boolean {
  return matchWinnerId(state) !== undefined;
}

export function toMatchResult(
  state: RoundLoopState,
  matchId: string,
  completedAt: string = new Date().toISOString()
): MatchResult {
  const winnerId = matchWinnerId(state);
  if (!winnerId) {
    throw new Error("toMatchResult called before the match was decided");
  }
  return {
    matchId,
    participantIds: state.participantIds,
    roundCount: state.roundCount,
    rounds: state.rounds,
    winnerId,
    completedAt
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // best-of-3: 2 wins ends it, third round never needed
  let s = createRoundLoop(["a", "b"], 3);
  s = applyRoundOutcome(s, {
    kind: "win",
    winnerId: "a",
    reactionMs: 200,
    opponentReactionMs: 300
  });
  assert.equal(isMatchDecided(s), false);
  s = applyRoundOutcome(s, {
    kind: "win",
    winnerId: "a",
    reactionMs: 210,
    opponentReactionMs: 290
  });
  assert.equal(isMatchDecided(s), true);
  assert.equal(matchWinnerId(s), "a");
  assert.equal(toMatchResult(s, "match-1").winnerId, "a");

  // false start counts as a round loss for the false-starter
  let s2 = createRoundLoop(["a", "b"], 3);
  s2 = applyRoundOutcome(s2, { kind: "falseStart", playerId: "a" });
  assert.deepEqual(s2.wins, { a: 0, b: 1 });
  assert.equal(isMatchDecided(s2), false);

  // ties don't move the score and don't decide the match
  let s3 = createRoundLoop(["a", "b"], 5);
  s3 = applyRoundOutcome(s3, { kind: "tie", reactionMs: 250 });
  assert.deepEqual(s3.wins, { a: 0, b: 0 });
  assert.equal(s3.rounds.length, 1);
  assert.equal(isMatchDecided(s3), false);

  console.log("roundLoop self-check passed");
}
