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

export type NearbyPlayer = {
  uid: string;
  displayName: string;
  coordinate: Coordinates;
  lastSeen: Date;
};

export type NearbyPlayersState =
  | { status: "loading" }
  | { status: "ready"; players: NearbyPlayer[] }
  | { status: "error"; message: string };

export type PresencePublishState =
  | { status: "idle" }
  | { status: "off" }
  | { status: "publishing" }
  | { status: "published" }
  | { status: "error"; message: string };
