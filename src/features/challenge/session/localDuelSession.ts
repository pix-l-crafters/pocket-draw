import { releaseHotspotNetworks } from "../network/hotspot";
import type { DuelTransportConnection } from "./duelSessionTransport";

// Duel screens only receive a `DuelChannel`, which cannot close itself. Once a
// connecting screen hands its link to the duel, ownership moves here so the
// peer connection and any hotspot are released when the duel is over.
let activeConnection: DuelTransportConnection | null = null;

/** Takes ownership of a connected link that now outlives its screen. */
export function adoptDuelConnection(connection: DuelTransportConnection): void {
  if (activeConnection && activeConnection !== connection) {
    activeConnection.disconnect();
  }
  activeConnection = connection;
}

/**
 * Ends the local duel session: closes the adopted link, stops an Android host's
 * hotspot, and leaves a hotspot joined as a guest. Call it whenever the player
 * leaves a duel or a challenge — finished, declined, or abandoned.
 */
export function endLocalDuelSession(
  releaseNetworks: () => Promise<void> = releaseHotspotNetworks
): void {
  const connection = activeConnection;
  activeConnection = null;
  connection?.disconnect();
  void releaseNetworks();
}
