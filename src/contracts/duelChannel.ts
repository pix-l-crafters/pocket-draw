// Contract between the Challenge/local-network session and the
// Duel game logic (Tanachat, Tianze, Mobark). Duel code should depend on
// this interface, not on a WebRTC or signaling implementation directly.

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
  // `atMs` is the raiser's own clock; `reactionMs` is the only cross-device
  // comparable figure, since the two clocks are never calibrated.
  | { type: "raised"; atMs: number; reactionMs: number }
  | { type: "falseStart"; atMs: number }
  | { type: "clockPing"; t0: number }
  | { type: "clockPong"; t0: number; t1: number; t2: number };

export interface DuelChannel {
  send(message: DuelMessage): void;
  onMessage(handler: (message: DuelMessage) => void): () => void; // returns unsubscribe
  isConnected(): boolean;
}

// Production QR connections hand back a WebRTC DataChannel implementation;
// isolated screens and tests can still use an in-process mock transport.
