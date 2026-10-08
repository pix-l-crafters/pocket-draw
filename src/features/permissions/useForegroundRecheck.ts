import { useEffect } from "react";
import { AppState } from "react-native";

/**
 * Re-runs `recheck` every time the app returns to the foreground — the moment a
 * player comes back from the Settings app. Without it a permission granted
 * outside the app only takes effect on the next launch, which is why testers
 * kept having to close and reopen Pocket Draw.
 *
 * `recheck` must be stable (`useCallback`), or the listener re-subscribes on
 * every render.
 */
export function useForegroundRecheck(recheck: () => void): void {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        recheck();
      }
    });

    return () => subscription.remove();
  }, [recheck]);
}
