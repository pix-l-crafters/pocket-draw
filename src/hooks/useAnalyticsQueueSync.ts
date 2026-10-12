import { useEffect } from "react";
import { AppState } from "react-native";

import { startAnalyticsQueueSync } from "../features/backend/matchAnalytics";
import { auth } from "../lib/firebase";

export function useAnalyticsQueueSync(uid: string | null): void {
  useEffect(() => {
    if (!uid) return;
    const user = auth.currentUser;
    const getPlayerId = () =>
      auth.currentUser === user && user?.uid === uid ? uid : null;
    let stop = startAnalyticsQueueSync(getPlayerId);
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        stop();
        stop = startAnalyticsQueueSync(getPlayerId);
      }
    });
    return () => {
      stop();
      foreground.remove();
    };
  }, [uid]);
}
