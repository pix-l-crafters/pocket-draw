// Match-level structure: exactly three regular rounds, followed by one
// tiebreaker only when the total points are level. The match ends after the
// tiebreaker even if the final result is a draw.

import type { RoundOutcome } from "../../contracts/roundOutcome";
import type {
  MatchResult,
  PlayerMatchResult
} from "../../contracts/matchResult";
import { scoreRoundOutcome } from "./roundJudge.ts";

export const REGULAR_ROUND_COUNT = 3;
export const MAX_ROUND_COUNT = 4;

export interface RoundLoopState {
  participantIds: [string, string];
  roundCount: 3;
  rounds: RoundOutcome[];
  scores: Record<string, number>;
}

export function createRoundLoop(
  participantIds: [string, string]
): RoundLoopState {
  const [a, b] = participantIds;
  return {
    participantIds,
    roundCount: REGULAR_ROUND_COUNT,
    rounds: [],
    scores: { [a]: 0, [b]: 0 }
  };
}

function tallyOutcome(
  scores: Record<string, number>,
  participantIds: [string, string],
  outcome: RoundOutcome
): Record<string, number> {
  const [a, b] = participantIds;
  const [scoreA, scoreB] = scoreRoundOutcome(outcome, a, b);

  return {
    ...scores,
    [a]: (scores[a] ?? 0) + scoreA.points,
    [b]: (scores[b] ?? 0) + scoreB.points
  };
}

export function applyRoundOutcome(
  state: RoundLoopState,
  outcome: RoundOutcome
): RoundLoopState {
  if (isMatchDecided(state)) {
    throw new Error("Cannot add a round after the match has ended.");
  }

  return {
    ...state,
    rounds: [...state.rounds, outcome],
    scores: tallyOutcome(state.scores, state.participantIds, outcome)
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
    (scores, outcome) => tallyOutcome(scores, participantIds, outcome),
    { [a]: 0, [b]: 0 }
  );
}

function scoresAreLevel(state: RoundLoopState): boolean {
  const [a, b] = state.participantIds;
  return (state.scores[a] ?? 0) === (state.scores[b] ?? 0);
}

export function matchWinnerId(state: RoundLoopState): string | undefined {
  if (!isMatchDecided(state) || scoresAreLevel(state)) {
    return undefined;
  }

  const [a, b] = state.participantIds;
  return (state.scores[a] ?? 0) > (state.scores[b] ?? 0) ? a : b;
}

export function isMatchDecided(state: RoundLoopState): boolean {
  if (state.rounds.length < REGULAR_ROUND_COUNT) {
    return false;
  }

  return !scoresAreLevel(state) || state.rounds.length >= MAX_ROUND_COUNT;
}

export function matchResults(
  state: RoundLoopState
): Record<string, PlayerMatchResult> | undefined {
  if (!isMatchDecided(state)) {
    return undefined;
  }

  const [a, b] = state.participantIds;
  const scoreA = state.scores[a] ?? 0;
  const scoreB = state.scores[b] ?? 0;

  if (scoreA === scoreB) {
    return { [a]: "draw", [b]: "draw" };
  }

  return scoreA > scoreB
    ? { [a]: "win", [b]: "lose" }
    : { [a]: "lose", [b]: "win" };
}

export function toMatchResult(
  state: RoundLoopState,
  matchId: string,
  completedAt: string = new Date().toISOString()
): MatchResult {
  const results = matchResults(state);
  if (!results) {
    throw new Error("toMatchResult called before the match was decided");
  }
  return {
    matchId,
    participantIds: state.participantIds,
    roundCount: state.roundCount,
    rounds: state.rounds,
    results,
    completedAt
  };
}
