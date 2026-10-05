// Contract between the round loop (Mobark, 4.17) and the backend write /
// ELO update (Mihir, 5.1-5.4).

import type { RoundOutcome } from "./roundOutcome";

export type PlayerMatchResult = "win" | "lose" | "draw";

export interface MatchResult {
  matchId: string;
  participantIds: [string, string];
  roundCount: 3;
  rounds: RoundOutcome[];
  results: Record<string, PlayerMatchResult>;
  completedAt: string; // ISO timestamp
}

// TODO(mobark): once 4.17 lands, wire the real write path and delete
// mocks/mockMatchResult.ts.
