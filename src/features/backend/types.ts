import type { MatchResult } from "../../contracts/matchResult";
import type { PlayerStats } from "../../contracts/playerStats";

/** Default ELO until Tanachat's 5.4 formula lands. */
export const DEFAULT_ELO_RATING = 1000;

/**
 * Firestore document written to `matchResults/{matchId}`.
 * Mirrors the shared MatchResult contract plus upload metadata.
 */
export type MatchResultDocument = MatchResult & {
  uploadedBy: string;
  createdAt: unknown;
};

export type SubmitMatchResultInput = {
  result: MatchResult;
  uploadedBy: string;
};

export type SubmitMatchResultOutcome =
  | { status: "written"; matchId: string }
  | { status: "queued"; matchId: string; reason: string };

export type MatchResultsRepository = {
  writeMatchResult(result: MatchResult, uploadedBy: string): Promise<void>;
};

export type PlayerStatsRepository = {
  getPlayerStats(uid: string, displayName: string): Promise<PlayerStats>;
};
