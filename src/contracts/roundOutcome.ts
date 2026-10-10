// Contract between round detection (Tianze: raise/fire/false-start, tickets
// 4.10-4.13; Tanachat: tie handling, ticket 4.15) and the round loop /
// result screen (Mobark, tickets 4.16-4.17).

export type Zone = "miss" | "bodyshot" | "headshot";

/** A detected miss cause, not a reconstructed physical bullet trajectory. */
export type MissReason =
  | "tooLow"
  | "tooHigh"
  | "offTarget"
  | TrackingMissReason
  | "noShot";

/**
 * The shot could not be verified, named by the reading that was missing so the
 * player knows what to fix. `trackingUnavailable` is the cause-unknown
 * fallback: rounds and peers from before the split, or a bearing that GPS alone
 * cannot define.
 */
export type TrackingMissReason =
  | "tiltUnavailable"
  | "compassUnavailable"
  | "locationUnavailable"
  | "opponentLocationUnavailable"
  | "trackingUnavailable";

export type RoundMiss = {
  playerId: string;
  reason: MissReason;
};

export type ScoredShot = {
  reactionMs: number;
  zone: Zone;
  points: 0 | 1 | 2;
};

export const ZONE_POINTS: Record<Zone, 0 | 1 | 2> = {
  miss: 0,
  bodyshot: 1,
  headshot: 2
};

// Gameplay v2 zone-based scoring. Outside the tie window, only the faster
// shot's zone decides (falling through to the slower shot on a miss); within
// the tie window, both shots score independently. Either way the two zone
// point totals are compared: equal points is a "tie" (zone is unambiguous
// there since miss/bodyshot/headshot points are 0/1/2, a bijection), unequal
// points is a "win". See
// docs/superpowers/specs/2026-09-17-fire-mechanic-scoring-design.md.
export type RoundOutcome = (
  | {
      kind: "win";
      winnerId: string;
      winnerZone: Zone;
      /** The losing player's detected zone, even when timing made it score 0. */
      loserZone: Zone;
      winnerPoints: number;
      loserPoints: number;
      reactionMs: number;
      opponentReactionMs: number;
    }
  | {
      kind: "tie";
      zone: Zone;
      pointsEach: number;
      reactionMs: number;
      opponentReactionMs: number;
    }
  | {
      kind: "falseStart";
      playerId: string;
      nonOffenderId: string;
      // null means no shot was captured; a captured miss has zone "miss".
      nonOffenderShot: ScoredShot | null;
    }
) & {
  /** Absent for older rounds that did not capture miss diagnostics. */
  misses?: RoundMiss[];
};

// Producer implementation: src/features/duel/roundJudge.ts.
// TODO(mobark): once the producer branch lands, replace mockRoundOutcome with
// the real pipeline and delete mocks/mockRoundOutcome.ts.
