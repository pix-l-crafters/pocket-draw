import type { DuelChannel } from "./duelChannel";

// Contract between the WebRTC session (challenge/session) and the duel screens.
// The duel depends on this, not on sockets or peer connections.

/**
 * - `live` while a DataChannel is open.
 * - `dropped` after an unexpected drop, until a reconnect succeeds.
 * - `peerLeft` once the opponent announced they left; final.
 * - `closed` once this player left; final.
 */
export type DuelLinkStatus = "live" | "dropped" | "peerLeft" | "closed";

export interface DuelLink {
  /**
   * Stable for the whole session: listeners registered here keep receiving
   * after a reconnect swaps a fresh DataChannel in underneath.
   */
  readonly channel: DuelChannel;
  status(): DuelLinkStatus;
  /** An unexpected drop — not one caused by either player leaving. */
  onDrop(handler: () => void): () => void;
  onPeerLeft(handler: () => void): () => void;
  /**
   * One reconnect attempt, shaped for `DuelDisconnectRecovery`: resolves true
   * once a fresh connection carries `channel`.
   */
  reconnect(signal: AbortSignal): Promise<boolean>;
  /** Tells the opponent this player is leaving, then releases the session. */
  leave(): void;
}
