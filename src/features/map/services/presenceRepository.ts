import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "../../../lib/firebase";
import type { PublishPresenceInput } from "../types/map.types";
import { coarsenCoordinates } from "../utils/map.utils";

export type PresenceRepository = {
  publishPresence(input: PublishPresenceInput): Promise<void>;
};

function validateIdentity(uid: string, displayName: string) {
  if (!uid.trim()) {
    throw new Error("A signed-in user is required to publish presence.");
  }

  const trimmedDisplayName = displayName.trim();

  if (!trimmedDisplayName || trimmedDisplayName.length > 100) {
    throw new Error("Display name must contain between 1 and 100 characters.");
  }

  return trimmedDisplayName;
}

export const presenceRepository: PresenceRepository = {
  async publishPresence(input) {
    const displayName = validateIdentity(input.uid, input.displayName);
    const coordinates = coarsenCoordinates(input);
    const presenceRef = doc(db, "presence", input.uid);

    await setDoc(presenceRef, {
      displayName,
      ...coordinates,
      isVisible: true,
      lastSeen: serverTimestamp()
    });
  }
};
