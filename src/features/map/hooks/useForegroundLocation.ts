import {
  Accuracy,
  getCurrentPositionAsync,
  getForegroundPermissionsAsync,
  hasServicesEnabledAsync,
  requestForegroundPermissionsAsync,
  watchPositionAsync,
  type LocationSubscription
} from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";

import { LOCATION_WATCH_DISTANCE_M } from "../constants/map.constants";
import type { Coordinates } from "../types/map.types";

export type LocationState =
  | { status: "loading" }
  | { status: "granted"; position: Coordinates }
  | { status: "denied"; canAskAgain: boolean }
  | { status: "error"; message: string };

function getLocationErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to get your location. Please try again.";
}

export function useForegroundLocation() {
  const [locationState, setLocationState] = useState<LocationState>({
    status: "loading"
  });
  const isMountedRef = useRef(false);
  const requestSequenceRef = useRef(0);
  const watchSubscriptionRef = useRef<LocationSubscription | null>(null);

  const stopWatching = useCallback(() => {
    watchSubscriptionRef.current?.remove();
    watchSubscriptionRef.current = null;
  }, []);

  const loadLocation = useCallback(
    async (isUserRetry: boolean) => {
      const requestSequence = ++requestSequenceRef.current;
      const isCurrentRequest = () =>
        isMountedRef.current && requestSequenceRef.current === requestSequence;

      stopWatching();

      if (isMountedRef.current) {
        setLocationState({ status: "loading" });
      }

      try {
        let permission = await getForegroundPermissionsAsync();

        if (!isCurrentRequest()) {
          return;
        }

        const shouldRequestPermission =
          permission.status === "undetermined" ||
          (isUserRetry && permission.canAskAgain);

        if (shouldRequestPermission) {
          permission = await requestForegroundPermissionsAsync();
        }

        if (!isCurrentRequest()) {
          return;
        }

        if (!permission.granted) {
          setLocationState({
            status: "denied",
            canAskAgain: permission.canAskAgain
          });
          return;
        }

        const areLocationServicesEnabled = await hasServicesEnabledAsync();

        if (!isCurrentRequest()) {
          return;
        }

        if (!areLocationServicesEnabled) {
          setLocationState({
            status: "error",
            message:
              "Location services are turned off. Enable them and try again."
          });
          return;
        }

        const location = await getCurrentPositionAsync({
          accuracy: Accuracy.Balanced
        });

        if (!isCurrentRequest()) {
          return;
        }

        setLocationState({
          status: "granted",
          position: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          }
        });

        const subscription = await watchPositionAsync(
          {
            accuracy: Accuracy.Balanced,
            distanceInterval: LOCATION_WATCH_DISTANCE_M
          },
          (update) => {
            if (!isCurrentRequest()) {
              return;
            }

            setLocationState({
              status: "granted",
              position: {
                latitude: update.coords.latitude,
                longitude: update.coords.longitude
              }
            });
          }
        );

        if (!isCurrentRequest()) {
          subscription.remove();
          return;
        }

        watchSubscriptionRef.current = subscription;
      } catch (error) {
        if (!isCurrentRequest()) {
          return;
        }

        setLocationState({
          status: "error",
          message: getLocationErrorMessage(error)
        });
      }
    },
    [stopWatching]
  );

  useEffect(() => {
    isMountedRef.current = true;
    void loadLocation(false);

    return () => {
      isMountedRef.current = false;
      requestSequenceRef.current += 1;
      stopWatching();
    };
  }, [loadLocation, stopWatching]);

  const retry = useCallback(() => {
    void loadLocation(true);
  }, [loadLocation]);

  return { locationState, retry };
}
