import { useCallback, useEffect, useRef, useState } from "react";

import type {
  Coordinates,
  CurrentUser,
  PresencePublishState,
  PublishPresenceInput
} from "../types/map.types";
import { presenceRepository } from "../services/presenceRepository";

type UsePresencePublisherInput = {
  currentUser: CurrentUser | null;
  position: Coordinates | null;
};

type PublishAttempt = {
  key: string;
  promise: Promise<void>;
};

function getPublishErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to share your location. Please try again.";
}

function getPublishKey(input: PublishPresenceInput) {
  return JSON.stringify([
    input.uid,
    input.displayName,
    input.latitude,
    input.longitude
  ]);
}

export function usePresencePublisher({
  currentUser,
  position
}: UsePresencePublisherInput) {
  const [presenceState, setPresenceState] = useState<PresencePublishState>({
    status: "idle"
  });
  const [retrySequence, setRetrySequence] = useState(0);
  const attemptRef = useRef<PublishAttempt | null>(null);
  const uid = currentUser?.uid ?? null;
  const displayName = currentUser?.displayName ?? null;
  const latitude = position?.latitude ?? null;
  const longitude = position?.longitude ?? null;

  useEffect(() => {
    if (
      uid === null ||
      displayName === null ||
      latitude === null ||
      longitude === null
    ) {
      attemptRef.current = null;
      setPresenceState({ status: "idle" });
      return;
    }

    const input: PublishPresenceInput = {
      uid,
      displayName,
      latitude,
      longitude
    };
    const key = getPublishKey(input);
    let attempt = attemptRef.current;

    if (!attempt || attempt.key !== key) {
      attempt = {
        key,
        promise: presenceRepository.publishPresence(input)
      };
      attemptRef.current = attempt;
    }

    let isActive = true;
    setPresenceState({ status: "publishing" });

    void attempt.promise
      .then(() => {
        if (isActive) {
          setPresenceState({ status: "published" });
        }
      })
      .catch((error: unknown) => {
        if (attemptRef.current === attempt) {
          attemptRef.current = null;
        }

        if (isActive) {
          setPresenceState({
            status: "error",
            message: getPublishErrorMessage(error)
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, [displayName, latitude, longitude, retrySequence, uid]);

  const retry = useCallback(() => {
    attemptRef.current = null;
    setRetrySequence((sequence) => sequence + 1);
  }, []);

  const dismissError = useCallback(() => {
    setPresenceState({ status: "idle" });
  }, []);

  return { dismissError, presenceState, retry };
}
