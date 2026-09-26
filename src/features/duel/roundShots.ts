// Turns the pair of reaction times a round produces into a RoundOutcome.
// Kept free of React so the rule "first to fire takes the round" is testable
// without mounting the duel screens.

import type { RoundOutcome } from "../../contracts/roundOutcome";
import { resolveRoundOutcome, type PlayerShot } from "./roundJudge";

/** A shot has to land inside this window after FIRE, or it counts as a miss. */
export const FIRE_WINDOW_MS = 3000;

export type RoundShots = {
  /** `null` means the player never fired inside the window. */
  selfReactionMs: number | null;
  opponentReactionMs: number | null;
};

export type RoundPlayer = {
  id: string;
  name: string;
};

/**
 * No shot becomes a miss at the window's edge, so the judge always has two
 * comparable shots to rank.
 *
 * ponytail: every landed shot is a flat bodyshot — the pitch-zone classifier
 * isn't wired into this flow, so any zone here would be invented.
 */
export function toPlayerShot(
  playerId: string,
  reactionMs: number | null
): PlayerShot {
  return reactionMs === null
    ? { playerId, reactionMs: FIRE_WINDOW_MS, zone: "miss" }
    : { playerId, reactionMs, zone: "bodyshot" };
}

/**
 * Whoever fired first takes the round. The tie window is zero, so only an
 * exactly equal pair of reaction times ties.
 *
 * Both devices run this over the same two numbers — each sends its own
 * reaction time across the channel — so they reach the same outcome without
 * either side acting as the scorer.
 */
export function judgeRoundShots(
  self: RoundPlayer,
  opponent: RoundPlayer,
  shots: RoundShots
): RoundOutcome {
  return resolveRoundOutcome(
    toPlayerShot(self.id, shots.selfReactionMs),
    toPlayerShot(opponent.id, shots.opponentReactionMs),
    0
  );
}
