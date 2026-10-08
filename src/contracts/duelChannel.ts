// Contract between the Challenge/local-network session and the
// Duel game logic (Tanachat, Tianze, Mobark). Duel code should depend on
// this interface, not on a WebRTC or signaling implementation directly.

import type { Zone } from "./roundOutcome";

export type DuelMessage =
  // Handshake: the guest announces itself as soon as the channel opens, and
  // the host answers once the player accepts or declines the challenge.
  | { type: "challenge"; playerId: string; playerName: string }
  | { type: "challengeAccepted" }
  | { type: "challengeDeclined" }
  // "My pre-round ritual is done." The host gates the countdown on it.
  | { type: "ready" }
  | { type: "countdown"; value: 3 | 2 | 1 }
  | { type: "fire"; atMs: number }
  // `atMs` is the raiser's local timestamp; calibration translates received
  // FIRE timestamps before reaction timing, so `reactionMs` is comparable.
  | { type: "raised"; atMs: number; reactionMs: number; zone: Zone }
  // Precise foreground GPS is shared only with the accepted duel opponent.
  // sampleAtMs is the GPS fix time in the sender's calibrated clock domain.
  | {
      type: "aimPosition";
      latitude: number;
      longitude: number;
      accuracy: number;
      sampleAtMs: number;
    }
  | { type: "falseStart"; atMs: number }
  | { type: "clockPing"; t0: number }
  | { type: "clockPong"; t0: number; t1: number; t2: number }
  // This player is leaving the session (back to map, declined rematch), so
  // the channel closing next is not a drop to recover from.
  | { type: "leave" }
  // After a reconnect each phone sends the rounds it judged so both resume
  // from the rounds they agree on. A `reply` is never answered.
  | { type: "matchSync"; matchId: string; roundKeys: string[]; reply: boolean }
  // Rematch: whoever asks first proposes the next match's id and the other
  // accepts it. Offers that cross on the wire settle on the smaller id.
  | { type: "rematchOffer"; matchId: string }
  | { type: "rematchAccept"; matchId: string };

export interface DuelChannel {
  send(message: DuelMessage): void;
  onMessage(handler: (message: DuelMessage) => void): () => void; // returns unsubscribe
  isConnected(): boolean;
}

// Production QR connections hand back a WebRTC DataChannel implementation;
// isolated screens and tests can still use an in-process mock transport.
