// Contract between the Challenge/BLE session (Siheng, ticket 3.8) and the
// Duel game logic (Tanachat, Tianze, Mobark). Duel code should depend on
// this interface, not on BleScreen/react-native-ble-manager directly, so it
// can be built and tested before the real BLE session exists.

export type DuelMessage =
  | { type: "ready" }
  | { type: "buzz"; delayMs: number }
  | { type: "countdown"; value: 3 | 2 | 1 }
  | { type: "fire"; atMs: number }
  | { type: "raised"; atMs: number }
  | { type: "falseStart"; atMs: number };

export interface DuelChannel {
  send(message: DuelMessage): void;
  onMessage(handler: (message: DuelMessage) => void): () => void; // returns unsubscribe
  isConnected(): boolean;
}

// TODO(siheng): once 3.8 lands, replace this with a real BLE-backed
// DuelChannel and delete mocks/mockDuelChannel.ts.
