import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile
} from "firebase/auth";

import { auth } from "./firebase";
import { userProfileRepository } from "../features/backend/userProfileRepository";

/**
 * Mirrors the Auth display name into `users/{uid}` without letting a failure
 * fail the caller. Auth is the source of truth; a missed mirror is repaired by
 * `syncUserProfileFromAuth` on the next sign-in, so surfacing it here would
 * only make a rename that *did* succeed look like it failed.
 */
const mirrorUserProfile = (uid: string, displayName: string) => {
  void userProfileRepository
    .syncUserProfile(uid, displayName)
    .catch((error: unknown) => {
      console.warn("Could not mirror the public profile:", error);
    });
};

/**
 * Backfills `users/{uid}` on sign-in: for accounts created before the profile
 * collection existed, and as the retry for any mirror write that failed.
 *
 * Reads `displayName` straight off the Auth user on purpose. The fallback chain
 * elsewhere in the app ends at the email address, and writing that here would
 * publish the player's email to every signed-in user. An account with no name
 * yet simply gets no document until they set one.
 */
export const syncUserProfileFromAuth = () => {
  const currentUser = auth.currentUser;

  if (!currentUser?.displayName) {
    return;
  }

  mirrorUserProfile(currentUser.uid, currentUser.displayName);
};

// `onAuthStateChanged` only fires when the signed-in user changes, not when
// that user's profile is edited — so `updateProfile` alone would leave every
// screen showing a stale display name until the next app launch. These
// listeners close that gap; `useAuthUser` subscribes on the UI side.
const profileChangeListeners = new Set<() => void>();

export const subscribeToProfileChange = (listener: () => void) => {
  profileChangeListeners.add(listener);

  return () => {
    profileChangeListeners.delete(listener);
  };
};

const notifyProfileChange = () => {
  for (const listener of profileChangeListeners) {
    listener();
  }
};

export const registerUser = async (
  email: string,
  password: string,
  username: string
) => {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  // If the account is created but naming it fails (offline, say), the user is
  // already signed in. Deliberately no rollback — deleting a just-created
  // account is worse than an unnamed one. They fall back to the email-derived
  // name and can set a username from the profile screen.
  await updateProfile(credential.user, { displayName: username });
  mirrorUserProfile(credential.user.uid, username);
  notifyProfileChange();

  return credential;
};

export const loginUser = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const updateUsername = async (username: string) => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Cannot update the username while signed out.");
  }

  // Auth first — it is the source of truth the mirror is derived from.
  await updateProfile(currentUser, { displayName: username });
  mirrorUserProfile(currentUser.uid, username);
  notifyProfileChange();
};

/**
 * Re-authenticates with the current password before changing it. Asking for the
 * password rather than mailing a reset link keeps the flow in-app, and the
 * fresh credential is also what keeps `updatePassword` from failing with
 * `auth/requires-recent-login` on a long-lived session.
 */
export const changePassword = async (
  currentPassword: string,
  newPassword: string
) => {
  const currentUser = auth.currentUser;

  if (!currentUser?.email) {
    throw new Error("Cannot change the password while signed out.");
  }

  const credential = EmailAuthProvider.credential(
    currentUser.email,
    currentPassword
  );

  await reauthenticateWithCredential(currentUser, credential);
  await updatePassword(currentUser, newPassword);
};

export const logoutUser = async () => {
  return signOut(auth);
};
