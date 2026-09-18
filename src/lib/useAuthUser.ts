import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";

import { auth } from "./firebase";
import { subscribeToProfileChange, syncUserProfileFromAuth } from "./auth";

type AuthUserState = {
  /** `null` once loading finishes and nobody is signed in. */
  user: User | null;
  /** Always a renderable name: the username, else the email, else a stand-in. */
  displayName: string;
  loading: boolean;
};

function resolveDisplayName(user: User | null): string {
  return user?.displayName ?? user?.email ?? "Player";
}

/**
 * The signed-in user plus a display name that stays fresh across renames.
 *
 * The name is kept as its own state string rather than read off `user` on each
 * render: Firebase mutates the same `User` object in place, so a profile edit
 * changes no reference React could notice.
 */
export function useAuthUser(): AuthUserState {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("Player");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setDisplayName(resolveDisplayName(currentUser));
      setLoading(false);

      if (currentUser) {
        syncUserProfileFromAuth();
      }
    });
  }, []);

  const syncDisplayName = useCallback(() => {
    setDisplayName(resolveDisplayName(auth.currentUser));
  }, []);

  useEffect(() => subscribeToProfileChange(syncDisplayName), [syncDisplayName]);

  return { user, displayName, loading };
}
