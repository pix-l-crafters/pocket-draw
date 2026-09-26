// Contract between the Challenge/local-network session and the
// Duel game logic (Tanachat, Tianze, Mobark). Duel code should depend on
// this interface, not on a WebRTC or signaling implementation directly.

export type DuelMessage =
  | { type: "ready" }
  | { type: "buzz"; delayMs: number }
  | { type: "countdown"; value: 3 | 2 | 1 }
  | { type: "fire"; atMs: number }
  | { type: "raised"; atMs: number }
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
