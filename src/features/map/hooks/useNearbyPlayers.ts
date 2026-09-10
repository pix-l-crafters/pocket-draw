import { useEffect, useState } from "react";

import { PRESENCE_STALE_AFTER_MS } from "../constants/map.constants";
import { presenceRepository } from "../services/presenceRepository";
import type { NearbyPlayer, NearbyPlayersState } from "../types/map.types";

function getSubscriptionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load nearby players. Please try again.";
}

function isRecent(player: NearbyPlayer, now: number) {
  return now - player.lastSeen.getTime() <= PRESENCE_STALE_AFTER_MS;
}

/**
 * Subscribes to every visible player's presence and returns the ones worth
 * drawing on the map: not the current user, and refreshed recently enough.
 */
export function useNearbyPlayers(
  currentUserId: string | null
): NearbyPlayersState {
  const [state, setState] = useState<NearbyPlayersState>({ status: "loading" });

  useEffect(() => {
    setState({ status: "loading" });

    const unsubscribe = presenceRepository.subscribeToVisiblePresence({
      onData: (players) => {
        const now = Date.now();
        const visiblePlayers = players.filter(
          (player) => player.uid !== currentUserId && isRecent(player, now)
        );

        setState({ status: "ready", players: visiblePlayers });
      },
      onError: (error) => {
        setState({
          status: "error",
          message: getSubscriptionErrorMessage(error)
        });
      }
    });

    return unsubscribe;
  }, [currentUserId]);

  return state;
}
