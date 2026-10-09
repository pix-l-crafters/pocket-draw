// Turns captured shot zones, reaction times and false starts into a RoundOutcome.

import {
  ZONE_POINTS,
  type MissReason,
  type RoundMiss,
  type RoundOutcome,
  type Zone
} from "../../contracts/roundOutcome";
import { resolveRoundOutcome, type PlayerShot } from "./roundJudge";

/** A shot has to land inside this window after FIRE, or it counts as a miss. */
export const FIRE_WINDOW_MS = 3000;

export type RoundShots = {
  /** `null` means the player never fired inside the window. */
  selfReactionMs: number | null;
  opponentReactionMs: number | null;
  selfZone: Zone;
  opponentZone: Zone;
  selfMissReason?: Exclude<MissReason, "noShot">;
  opponentMissReason?: Exclude<MissReason, "noShot">;
  falseStartPlayer: "self" | "opponent" | null;
};

export type RoundPlayer = {
  id: string;
  name: string;
};

/**
 * No shot becomes a miss at the window's edge, so the judge always has two
 * comparable shots to rank.
 */
export function toPlayerShot(
  playerId: string,
  reactionMs: number | null,
  zone: Zone
): PlayerShot {
  return reactionMs === null
    ? { playerId, reactionMs: FIRE_WINDOW_MS, zone: "miss" }
    : { playerId, reactionMs, zone };
}

/**
 * Both devices judge the same captured zones and reaction times with the
 * configured tie window, without either side acting as the scorer.
 */
export function judgeRoundShots(
  self: RoundPlayer,
  opponent: RoundPlayer,
  shots: RoundShots
): RoundOutcome {
  const misses: RoundMiss[] = [];
  const captured = [
    {
      playerId: self.id,
      side: "self",
      reactionMs: shots.selfReactionMs,
      zone: shots.selfZone,
      reason: shots.selfMissReason
    },
    {
      playerId: opponent.id,
      side: "opponent",
      reactionMs: shots.opponentReactionMs,
      zone: shots.opponentZone,
      reason: shots.opponentMissReason
    }
  ] as const;
  for (const shot of captured) {
    if (shot.side === shots.falseStartPlayer) continue;
    const reason =
      shot.reactionMs === null
        ? "noShot"
        : shot.zone === "miss"
          ? shot.reason
          : undefined;
    if (reason) misses.push({ playerId: shot.playerId, reason });
  }
  misses.sort((a, b) =>
    a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0
  );
  const diagnostics = misses.length ? { misses } : {};
  if (shots.falseStartPlayer !== null) {
    const selfOffended = shots.falseStartPlayer === "self";
    const reactionMs = selfOffended
      ? shots.opponentReactionMs
      : shots.selfReactionMs;
    const zone = selfOffended ? shots.opponentZone : shots.selfZone;
    return {
      kind: "falseStart",
      playerId: selfOffended ? self.id : opponent.id,
      nonOffenderId: selfOffended ? opponent.id : self.id,
      nonOffenderShot:
        reactionMs === null
          ? null
          : { reactionMs, zone, points: ZONE_POINTS[zone] },
      ...diagnostics
    };
  }
  return {
    ...resolveRoundOutcome(
      toPlayerShot(self.id, shots.selfReactionMs, shots.selfZone),
      toPlayerShot(opponent.id, shots.opponentReactionMs, shots.opponentZone)
    ),
    ...diagnostics
  };
}
