import type { Timestamp } from "firebase/firestore";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type CurrentUser = {
  uid: string;
  displayName: string;
};

export type PlayerPresenceDocument = {
  displayName: string;
  latitude: number;
  longitude: number;
  isVisible: boolean;
  lastSeen: Timestamp;
};

export type PublishPresenceInput = CurrentUser & Coordinates;

export type PresencePublishState =
  | { status: "idle" }
  | { status: "publishing" }
  | { status: "published" }
  | { status: "error"; message: string };
