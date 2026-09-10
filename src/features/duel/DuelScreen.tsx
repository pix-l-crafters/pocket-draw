import { useMemo } from "react";

import { createMockDuelChannelPair } from "../../contracts/mocks/mockDuelChannel";
import { PreRound, type RssiReader } from "./PreRound";

/**
 * Local demo host for the pre-round flow. Replace the mock pair with the real
 * DuelChannel once the BLE session producer lands.
 */
type DuelScreenProps = {
  readRssi?: RssiReader;
};

export function DuelScreen({ readRssi }: DuelScreenProps = {}) {
  const channel = useMemo(() => createMockDuelChannelPair()[0], []);

  return (
    <PreRound channel={channel} readRssi={readRssi ?? (async () => -75)} />
  );
}
