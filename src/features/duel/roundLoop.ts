// 4.17 — round loop / match-decided logic: tracks round points across a
// best-of-3/5/7 match and decides when it's over.
//
// Round rules (matches src/features/duel/roundJudge.ts, the real producer of
// RoundOutcome):
// - "win": winnerId gets 1 point.
// - "falseStart": the false-starting player loses the round (opponent gets
//   1 point); the match continues.
// - "tie": both players get `pointsEach` (roundJudge.ts's approved tie rule
//   — reactions within the tie window score for both). If that pushes both
//   players to the win threshold in the same round, the match is NOT decided
//   — a tied leaderboard always plays a sudden-death decider round.

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

function tallyOutcome(
  wins: Record<string, number>,
  participantIds: [string, string],
  outcome: RoundOutcome
): Record<string, number> {
  if (outcome.kind === "win") {
    return { ...wins, [outcome.winnerId]: (wins[outcome.winnerId] ?? 0) + 1 };
  }
  if (outcome.kind === "falseStart") {
    const opponentId = participantIds.find((id) => id !== outcome.playerId);
    if (!opponentId) return wins;
    return { ...wins, [opponentId]: (wins[opponentId] ?? 0) + 1 };
  }
  const [a, b] = participantIds;
  return {
    ...wins,
    [a]: (wins[a] ?? 0) + outcome.pointsEach,
    [b]: (wins[b] ?? 0) + outcome.pointsEach
  };
}

export function applyRoundOutcome(
  state: RoundLoopState,
  outcome: RoundOutcome
): RoundLoopState {
  return {
    ...state,
    rounds: [...state.rounds, outcome],
    wins: tallyOutcome(state.wins, state.participantIds, outcome)
  };
}

// Re-derives the win tally from a finished match's round history (e.g. a
// MatchResult loaded for the summary screen), without replaying a full
// RoundLoopState.
export function scoreFromRounds(
  participantIds: [string, string],
  rounds: RoundOutcome[]
): Record<string, number> {
  const [a, b] = participantIds;
  return rounds.reduce(
    (wins, outcome) => tallyOutcome(wins, participantIds, outcome),
    { [a]: 0, [b]: 0 }
  );
}

function winsNeeded(roundCount: 3 | 5 | 7): number {
  return Math.ceil(roundCount / 2);
}

export function matchWinnerId(state: RoundLoopState): string | undefined {
  const needed = winsNeeded(state.roundCount);
  const [a, b] = state.participantIds;
  const scoreA = state.wins[a] ?? 0;
  const scoreB = state.wins[b] ?? 0;
  if (scoreA === scoreB) return undefined;
  const [leader, leaderScore] = scoreA > scoreB ? [a, scoreA] : [b, scoreB];
  return leaderScore >= needed ? leader : undefined;
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
