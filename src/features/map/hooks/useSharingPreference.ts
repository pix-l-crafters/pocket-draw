import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pocket-draw:location-sharing-enabled";
const DEFAULT_IS_SHARING = true;

type SharingPreference = {
  /** `null` until the stored value has been read. */
  isSharing: boolean | null;
  setSharing: (next: boolean) => void;
  toggleSharing: () => void;
};

/**
 * Whether the player wants their location broadcast to other players, persisted
 * across launches. Defaults to sharing on.
 */
export function useSharingPreference(): SharingPreference {
  const [isSharing, setIsSharing] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active) {
          return;
        }

        setIsSharing(stored === null ? DEFAULT_IS_SHARING : stored === "true");
      })
      .catch(() => {
        if (active) {
          setIsSharing(DEFAULT_IS_SHARING);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const setSharing = useCallback((next: boolean) => {
    setIsSharing(next);
    void AsyncStorage.setItem(STORAGE_KEY, String(next)).catch(() => undefined);
  }, []);

  const toggleSharing = useCallback(() => {
    setIsSharing((previous) => {
      const next = !(previous ?? DEFAULT_IS_SHARING);
      void AsyncStorage.setItem(STORAGE_KEY, String(next)).catch(
        () => undefined
      );

      return next;
    });
  }, []);

  return { isSharing, setSharing, toggleSharing };
}
