import { StyleSheet } from "react-native";
import { Surface, Text } from "react-native-paper";

import type { LocationState } from "../hooks/useForegroundLocation";
import type {
  NearbyPlayersState,
  PresencePublishState
} from "../types/map.types";

type MapStatusCardProps = {
  isAuthenticated: boolean;
  locationState: LocationState;
  nearbyPlayersState: NearbyPlayersState;
  presenceState: PresencePublishState;
};

function getNearbyHeadline(nearbyPlayersState: NearbyPlayersState) {
  switch (nearbyPlayersState.status) {
    case "loading":
      return "Players nearby";
    case "error":
      return "Couldn't load nearby players";
    case "ready": {
      const count = nearbyPlayersState.players.length;

      if (count === 0) {
        return "No players nearby";
      }

      return `${count} ${count === 1 ? "player" : "players"} nearby`;
    }
  }
}

function getMapSummary(
  locationState: LocationState,
  isAuthenticated: boolean,
  presenceState: PresencePublishState
) {
  if (presenceState.status === "off") {
    return "Location sharing is off";
  }

  switch (locationState.status) {
    case "loading":
      return "Finding your location...";
    case "denied":
      return "Location permission is required to show you";
    case "error":
      return "Map available without your location";
    case "granted":
      if (!isAuthenticated) {
        return "Your location is ready; sign in to share";
      }

      switch (presenceState.status) {
        case "idle":
          return "Your location is ready to share";
        case "publishing":
          return "Sharing your location...";
        case "published":
          return "Your location is visible on the map";
        case "error":
          return "Map available; location sharing failed";
      }
  }
}

export function MapStatusCard({
  isAuthenticated,
  locationState,
  nearbyPlayersState,
  presenceState
}: MapStatusCardProps) {
  return (
    <Surface elevation={3} style={styles.card}>
      <Text style={styles.eyebrow} variant="labelSmall">
        MAP PREVIEW
      </Text>
      <Text variant="headlineSmall">
        {getNearbyHeadline(nearbyPlayersState)}
      </Text>
      <Text style={styles.subtitle} variant="bodySmall">
        {getMapSummary(locationState, isAuthenticated, presenceState)}
      </Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "flex-start",
    marginLeft: 12,
    marginRight: 16,
    marginTop: 4,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14
  },
  eyebrow: {
    fontWeight: "800",
    letterSpacing: 1.2
  },
  subtitle: {
    marginTop: 2
  }
});
