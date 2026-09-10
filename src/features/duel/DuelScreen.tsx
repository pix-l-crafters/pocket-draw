import { useMemo } from "react";

import { createMockDuelChannelPair } from "../../contracts/mocks/mockDuelChannel";
import { PreRound } from "./PreRound";

/**
 * Local demo host for the pre-round flow. Replace the mock pair with the real
 * DuelChannel once the BLE session producer lands.
 */
export function DuelScreen() {
  const channel = useMemo(() => createMockDuelChannelPair()[0], []);

  return <PreRound channel={channel} readRssi={async () => -75} />;
}
