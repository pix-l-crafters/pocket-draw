import { useEffect, useState } from "react";

import {
  NEARBY_RADIUS_METRES,
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_STALE_AFTER_MS
} from "../constants/map.constants";
import { presenceRepository } from "../services/presenceRepository";
import type {
  Coordinates,
  NearbyPlayer,
  NearbyPlayersState,
  VisiblePlayersState
} from "../types/map.types";
import { distanceBetweenCoordinatesMetres } from "../utils/map.utils";

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
 * Keeps fresh visible players for the map and derives the nearby subset from
 * the current location. Movement recalculates distance without subscribing
 * again. The timer only expires resolved presence; it preserves loading and
 * errors.
 */
export function useNearbyPlayers(
  currentUserId: string | null,
  position: Coordinates | null
): NearbyPlayersState {
  const [state, setState] = useState<VisiblePlayersState>({
    status: "loading"
  });

  useEffect(() => {
    setState({ status: "loading" });

    const unsubscribe = presenceRepository.subscribeToVisiblePresence({
      onData: (players) => {
        const now = Date.now();
        setState({
          status: "ready",
          players: players.filter(
            (player) => player.uid !== currentUserId && isRecent(player, now)
          )
        });
      },
      onError: (error) => {
        setState({
          status: "error",
          message: getSubscriptionErrorMessage(error)
        });
      }
    });

    const staleTimer = setInterval(() => {
      const now = Date.now();
      setState((current) =>
        current.status === "ready"
          ? {
              ...current,
              players: current.players.filter((player) => isRecent(player, now))
            }
          : current
      );
    }, PRESENCE_HEARTBEAT_MS);

    return () => {
      unsubscribe();
      clearInterval(staleTimer);
    };
  }, [currentUserId]);

  return {
    ...state,
    nearbyPlayers:
      state.status === "ready" && position
        ? state.players.filter(
            (player) =>
              distanceBetweenCoordinatesMetres(position, player.coordinate) <=
              NEARBY_RADIUS_METRES
          )
        : null
  };
}
