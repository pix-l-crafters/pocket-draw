import type { MatchResult } from "../../contracts/matchResult";
import type { PlayerStats } from "../../contracts/playerStats";

/** Starting ELO for every player (Tanachat 5.4). */
export const DEFAULT_ELO_RATING = 1500;

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

/** A player's public profile, as stored in `users/{uid}`. Never holds PII. */
export type UserProfile = {
  uid: string;
  displayName: string;
};

export type UserProfileRepository = {
  getUserProfile(uid: string): Promise<UserProfile | null>;
  /** Writes `displayName` through to Firestore; a no-op when unchanged. */
  syncUserProfile(uid: string, displayName: string): Promise<void>;
};
