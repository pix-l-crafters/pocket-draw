import type { DuelChannel } from "../../../contracts/duelChannel";

export type DuelRole = "host" | "guest";

export type DuelSessionParams = {
  role: DuelRole;
  matchId: string;
  discoveryToken: string;
  /** The other player's uid, for display. */
  opponentId: string;
};

/**
 * Lifecycle of a duel connection.
 *
 * - `connecting` while an attempt is in flight; `attempt` counts from 1.
 * - `retrying` between automatic attempts (see PRESENCE-style backoff constants).
 * - `connected` carries the live channel handed to the duel logic.
 * - `failed` means the automatic retries are exhausted; the user can retry manually.
 * - `disconnected` means the link dropped after it was established — the duel aborts.
 */
export type DuelSessionState =
  | { status: "idle" }
  | { status: "connecting"; attempt: number }
  | { status: "retrying"; attempt: number; message: string }
  | { status: "connected"; channel: DuelChannel }
  | { status: "failed"; message: string }
  | { status: "disconnected"; message: string };
