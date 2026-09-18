import { doc, setDoc } from "firebase/firestore";

import { db } from "../../lib/firebase";

/**
 * Creates or updates the caller's own `users/{uid}` doc so other players can
 * resolve a display name for them (leaderboard, match history) without
 * relying on ephemeral `presence` docs, which are deleted when the player
 * goes offline.
 */
export async function upsertUserProfile(
  uid: string,
  displayName: string
): Promise<void> {
  if (!uid.trim() || !displayName.trim()) {
    throw new Error("uid and displayName are required.");
  }

  await setDoc(doc(db, "users", uid), { displayName: displayName.trim() });
}
