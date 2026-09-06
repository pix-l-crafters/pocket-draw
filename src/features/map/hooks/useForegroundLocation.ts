import {
  Accuracy,
  getCurrentPositionAsync,
  getForegroundPermissionsAsync,
  hasServicesEnabledAsync,
  requestForegroundPermissionsAsync
} from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";

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

  const loadLocation = useCallback(async (isUserRetry: boolean) => {
    const requestSequence = ++requestSequenceRef.current;
    const isCurrentRequest = () =>
      isMountedRef.current && requestSequenceRef.current === requestSequence;

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
    } catch (error) {
      if (!isCurrentRequest()) {
        return;
      }

      setLocationState({
        status: "error",
        message: getLocationErrorMessage(error)
      });
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void loadLocation(false);

    return () => {
      isMountedRef.current = false;
      requestSequenceRef.current += 1;
    };
  }, [loadLocation]);

  const retry = useCallback(() => {
    void loadLocation(true);
  }, [loadLocation]);

  return { locationState, retry };
}
