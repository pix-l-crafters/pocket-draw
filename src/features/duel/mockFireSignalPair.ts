import { createMockDuelChannelPair } from "../../contracts/mocks/mockDuelChannel";

import { FireSignalCoordinator } from "./fireSignalCoordinator";

export interface MockFireSignalPair {
  guest: FireSignalCoordinator;
  host: FireSignalCoordinator;
}

/**
 * Local two-player stand-in until the BLE-backed DuelChannel is available.
 */
export function createMockFireSignalPair(
  now: () => number = Date.now
): MockFireSignalPair {
  const [hostChannel, guestChannel] = createMockDuelChannelPair();

  return {
    guest: new FireSignalCoordinator(guestChannel, "guest"),
    host: new FireSignalCoordinator(hostChannel, "host", now)
  };
}
