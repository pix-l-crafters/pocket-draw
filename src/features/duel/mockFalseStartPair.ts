import { createMockDuelChannelPair } from "../../contracts/mocks/mockDuelChannel";
import { FalseStartCoordinator } from "./falseStartCoordinator";

export function createMockFalseStartPair(
  hostPlayerId: string,
  guestPlayerId: string
): [FalseStartCoordinator, FalseStartCoordinator] {
  const [hostChannel, guestChannel] = createMockDuelChannelPair();

  return [
    new FalseStartCoordinator(hostChannel, hostPlayerId, guestPlayerId),
    new FalseStartCoordinator(guestChannel, guestPlayerId, hostPlayerId)
  ];
}
