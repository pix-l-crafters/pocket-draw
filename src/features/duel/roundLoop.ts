// 4.17 — round loop / match-decided logic: tracks round wins across a
// best-of-3/5/7 match and decides when it's over.
//
// Round rules (docs/superpowers/specs/2026-09-06-map-duel-implementation-design.md §10):
// - "win": winnerId gets a round win.
// - "falseStart": the false-starting player loses the round (opponent gets
//   the win); the match continues.
// - "tie": sudden-death replay for that round — no win tally change. Still
//   appended to `rounds` so the summary can show it happened.

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
  return wins;
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
