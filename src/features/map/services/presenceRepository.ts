import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
  type Unsubscribe
} from "firebase/firestore";

import { db } from "../../../lib/firebase";
import type { NearbyPlayer, PublishPresenceInput } from "../types/map.types";
import { coarsenCoordinates } from "../utils/map.utils";

type PresenceSubscriptionHandlers = {
  onData: (players: NearbyPlayer[]) => void;
  onError: (error: Error) => void;
};

export type PresenceRepository = {
  publishPresence(input: PublishPresenceInput): Promise<void>;
  subscribeToVisiblePresence(
    handlers: PresenceSubscriptionHandlers
  ): Unsubscribe;
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

function parsePresence(uid: string, data: DocumentData): NearbyPlayer | null {
  const { displayName, latitude, longitude, lastSeen } = data;

  if (
    typeof displayName !== "string" ||
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    return null;
  }

  // `lastSeen` is null while a server timestamp write is still pending locally.
  const lastSeenDate =
    lastSeen && typeof lastSeen.toDate === "function"
      ? (lastSeen.toDate() as Date)
      : null;

  if (!lastSeenDate) {
    return null;
  }

  return {
    uid,
    displayName,
    coordinate: { latitude, longitude },
    lastSeen: lastSeenDate
  };
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
  },

  subscribeToVisiblePresence({ onData, onError }) {
    const visiblePresenceQuery = query(
      collection(db, "presence"),
      where("isVisible", "==", true)
    );

    return onSnapshot(
      visiblePresenceQuery,
      (snapshot) => {
        const players = snapshot.docs
          .map((entry) => parsePresence(entry.id, entry.data()))
          .filter((player): player is NearbyPlayer => player !== null);

        onData(players);
      },
      (error) => {
        onError(error);
      }
    );
  }
};
