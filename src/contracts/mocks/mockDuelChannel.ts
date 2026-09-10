import type { DuelChannel, DuelMessage } from "../duelChannel";

/**
 * In-memory loopback pair for local dev: messages sent on one channel are
 * delivered to the other's listeners, so Duel logic can be built and tested
 * without a real BLE session. Delete once src/contracts/duelChannel.ts has
 * a real implementation (see ticket 3.8).
 */
export function createMockDuelChannelPair(): [DuelChannel, DuelChannel] {
  const handlersA: Array<(m: DuelMessage) => void> = [];
  const handlersB: Array<(m: DuelMessage) => void> = [];

  const channelA: DuelChannel = {
    send: (m) => handlersB.forEach((h) => h(m)),
    onMessage: (h) => {
      handlersA.push(h);
      return () => {
        const i = handlersA.indexOf(h);
        if (i >= 0) handlersA.splice(i, 1);
      };
    },
    isConnected: () => true
  };

  const channelB: DuelChannel = {
    send: (m) => handlersA.forEach((h) => h(m)),
    onMessage: (h) => {
      handlersB.push(h);
      return () => {
        const i = handlersB.indexOf(h);
        if (i >= 0) handlersB.splice(i, 1);
      };
    },
    isConnected: () => true
  };

  return [channelA, channelB];
}
