// Match-level structure: exactly three regular rounds, followed by one
// tiebreaker only when the total points are level. The match ends after the
// tiebreaker even if the final result is a draw.

import type {
  MatchResult,
  PlayerMatchResult
} from "../../contracts/matchResult";
import type { RoundOutcome } from "../../contracts/roundOutcome";
import { scoreRoundOutcome } from "./roundJudge.ts";

export const REGULAR_ROUND_COUNT = 3;
export const MAX_ROUND_COUNT = 4;

export interface RoundLoopState {
  participantIds: [string, string];
  rounds: RoundOutcome[];
  scores: Record<string, number>;
  warningCounts: Record<string, number>;
}

export function createRoundLoop(
  participantIds: [string, string]
): RoundLoopState {
  const [a, b] = participantIds;
  return {
    participantIds,
    rounds: [],
    scores: { [a]: 0, [b]: 0 },
    warningCounts: { [a]: 0, [b]: 0 }
  };
}

export function applyFalseStartWarning(
  state: RoundLoopState,
  playerId: string
): RoundLoopState {
  if (!state.participantIds.includes(playerId)) return state;
  return {
    ...state,
    warningCounts: { ...state.warningCounts, [playerId]: 1 }
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
    rounds: state.rounds,
    results,
    completedAt
  };
}

// Object key order is not part of an outcome's identity, so keys are sorted
// before comparing what each phone recorded.
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, field]) => field !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries
      .map(([key, field]) => `${JSON.stringify(key)}:${canonicalJson(field)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** One comparable key per judged round, exchanged after a reconnect. */
export function roundKeys(state: RoundLoopState): string[] {
  return state.rounds.map(canonicalJson);
}

/**
 * Resumes from the rounds both phones agree on. A round only one phone judged —
 * or judged differently because a shot was lost in the drop — is discarded and
 * replayed, rather than scoring the missing shot as a miss.
 */
export function reconcileRounds(
  state: RoundLoopState,
  peerRoundKeys: readonly string[]
): RoundLoopState {
  const localKeys = roundKeys(state);
  let agreed = 0;
  while (
    agreed < localKeys.length &&
    agreed < peerRoundKeys.length &&
    localKeys[agreed] === peerRoundKeys[agreed]
  ) {
    agreed += 1;
  }
  if (agreed === state.rounds.length) return state;

  const rounds = state.rounds.slice(0, agreed);
  return {
    ...state,
    rounds,
    scores: scoreFromRounds(state.participantIds, rounds)
  };
}
