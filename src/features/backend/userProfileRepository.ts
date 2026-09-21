import { doc, getDoc, setDoc } from "firebase/firestore";

import { db } from "../../lib/firebase";
import type { UserProfile, UserProfileRepository } from "./types";

/**
 * Mirrors the Firebase Auth `displayName` into `users/{uid}`.
 *
 * Auth's own `displayName` is readable only by its owner, so it cannot answer
 * "what is player X called?" for anyone else. `presence` carries a copy, but it
 * is deleted when a player stops sharing their location — this collection is
 * what survives.
 */
export const userProfileRepository: UserProfileRepository = {
  async getUserProfile(uid): Promise<UserProfile | null> {
    if (!uid.trim()) {
      throw new Error("uid is required to load a user profile.");
    }

    const snapshot = await getDoc(doc(db, "users", uid));
    const data = snapshot.data();

    // Defensive like `presenceRepository.parsePresence`: a malformed document
    // reads as "no profile" rather than throwing at the call site.
    if (!data || typeof data.displayName !== "string") {
      return null;
    }

    return { uid, displayName: data.displayName };
  },

  async syncUserProfile(uid, displayName): Promise<void> {
    if (!uid.trim()) {
      throw new Error("uid is required to sync a user profile.");
    }

    const trimmedName = displayName.trim();

    if (!trimmedName) {
      throw new Error("A display name is required to sync a user profile.");
    }

    const profileRef = doc(db, "users", uid);
    const snapshot = await getDoc(profileRef);

    // Nothing changed — skip the write so merely launching the app does not
    // cost a Firestore write on every start.
    if (snapshot.data()?.displayName === trimmedName) {
      return;
    }

    // `displayName` is the only field the security rules admit
    // (`hasOnly(['displayName'])`), so this is a whole-document write.
    await setDoc(profileRef, { displayName: trimmedName });
  }
};
