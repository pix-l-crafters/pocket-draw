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

// 3.8: the session layer lives in src/features/challenge/session/. It currently
// hands back a real DuelChannel over mockDuelSessionTransport (an in-process
// channel) because BLE peripheral-mode discovery is unsolved — see the map-duel
// design doc §9 and session/bleDuelSessionTransport.ts. Duel logic still depends
// only on this interface. mocks/mockDuelChannel.ts stays until a real transport
// exists.
