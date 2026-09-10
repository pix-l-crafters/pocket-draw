import { useMemo } from "react";

import type { DuelChannel } from "../../contracts/duelChannel";
import { createMockDuelChannelPair } from "../../contracts/mocks/mockDuelChannel";
import { PreRound, type RssiReader } from "./PreRound";

/**
 * Local demo host for the pre-round flow. Replace the mock pair with the real
 * DuelChannel once the BLE session producer lands.
 */
type DuelScreenProps = {
  channel?: DuelChannel;
  readRssi?: RssiReader;
};

export function DuelScreen({
  channel: providedChannel,
  readRssi
}: DuelScreenProps = {}) {
  const mockChannel = useMemo(() => createMockDuelChannelPair()[0], []);

  return (
    <PreRound
      channel={providedChannel ?? mockChannel}
      readRssi={readRssi ?? (async () => -75)}
    />
  );
}
