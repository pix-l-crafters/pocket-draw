import { useEffect, useRef, useState } from "react";

import {
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_STALE_AFTER_MS
} from "../constants/map.constants";
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
 * Staleness is re-checked on a timer so players who stop sending heartbeats
 * drop off even without a new snapshot.
 */
export function useNearbyPlayers(
  currentUserId: string | null
): NearbyPlayersState {
  const [state, setState] = useState<NearbyPlayersState>({ status: "loading" });
  const rawPlayersRef = useRef<NearbyPlayer[]>([]);

  useEffect(() => {
    setState({ status: "loading" });
    rawPlayersRef.current = [];

    const applyFilter = () => {
      const now = Date.now();
      const players = rawPlayersRef.current.filter(
        (player) => player.uid !== currentUserId && isRecent(player, now)
      );

      setState({ status: "ready", players });
    };

    const unsubscribe = presenceRepository.subscribeToVisiblePresence({
      onData: (players) => {
        rawPlayersRef.current = players;
        applyFilter();
      },
      onError: (error) => {
        setState({
          status: "error",
          message: getSubscriptionErrorMessage(error)
        });
      }
    });

    const staleTimer = setInterval(applyFilter, PRESENCE_HEARTBEAT_MS);

    return () => {
      unsubscribe();
      clearInterval(staleTimer);
    };
  }, [currentUserId]);

  return state;
}
