import { useCallback, useEffect, useState } from "react";

import {
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_MAX_PUBLISH_RETRIES,
  PRESENCE_RETRY_BASE_DELAY_MS
} from "../constants/map.constants";
import type {
  Coordinates,
  CurrentUser,
  PresencePublishState
} from "../types/map.types";
import { presenceRepository } from "../services/presenceRepository";
import { coarsenCoordinate } from "../utils/map.utils";

type UsePresencePublisherInput = {
  currentUser: CurrentUser | null;
  position: Coordinates | null;
};

function getPublishErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to share your location. Please try again.";
}

export function usePresencePublisher({
  currentUser,
  position
}: UsePresencePublisherInput) {
  const [presenceState, setPresenceState] = useState<PresencePublishState>({
    status: "idle"
  });
  const [retrySequence, setRetrySequence] = useState(0);

  const uid = currentUser?.uid ?? null;
  const displayName = currentUser?.displayName ?? null;
  // Publishing is keyed on the coarsened cell, so small GPS jitter within the
  // same ~110 m cell does not trigger a write; a heartbeat keeps it fresh.
  const coarseLatitude = position ? coarsenCoordinate(position.latitude) : null;
  const coarseLongitude = position
    ? coarsenCoordinate(position.longitude)
    : null;

  useEffect(() => {
    if (
      uid === null ||
      displayName === null ||
      coarseLatitude === null ||
      coarseLongitude === null
    ) {
      setPresenceState({ status: "idle" });
      return;
    }

    const input = {
      uid,
      displayName,
      latitude: coarseLatitude,
      longitude: coarseLongitude
    };

    let cancelled = false;
    let retryCount = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const publish = async () => {
      if (cancelled) {
        return;
      }

      setPresenceState((previous) =>
        previous.status === "published" ? previous : { status: "publishing" }
      );

      try {
        await presenceRepository.publishPresence(input);

        if (cancelled) {
          return;
        }

        retryCount = 0;
        setPresenceState({ status: "published" });
        timer = setTimeout(() => void publish(), PRESENCE_HEARTBEAT_MS);
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (retryCount < PRESENCE_MAX_PUBLISH_RETRIES) {
          retryCount += 1;
          const delay = PRESENCE_RETRY_BASE_DELAY_MS * 2 ** (retryCount - 1);
          timer = setTimeout(() => void publish(), delay);
          return;
        }

        setPresenceState({
          status: "error",
          message: getPublishErrorMessage(error)
        });
      }
    };

    void publish();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [uid, displayName, coarseLatitude, coarseLongitude, retrySequence]);

  useEffect(() => {
    if (uid === null) {
      return;
    }

    return () => {
      // Best effort: on logout or leaving the map, drop out of everyone's view.
      // A missed delete ages out on its own via the staleness window.
      void presenceRepository.removePresence(uid).catch(() => undefined);
    };
  }, [uid]);

  const retry = useCallback(() => {
    setRetrySequence((sequence) => sequence + 1);
  }, []);

  const dismissError = useCallback(() => {
    setPresenceState({ status: "idle" });
  }, []);

  return { dismissError, presenceState, retry };
}
