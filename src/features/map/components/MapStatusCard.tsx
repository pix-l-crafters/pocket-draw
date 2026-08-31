import { StyleSheet } from "react-native";
import { Surface, Text } from "react-native-paper";

import type { LocationState } from "../hooks/useForegroundLocation";
import type { PresencePublishState } from "../types/map.types";

type MapStatusCardProps = {
  isAuthenticated: boolean;
  locationState: LocationState;
  presenceState: PresencePublishState;
};

function getMapSummary(
  locationState: LocationState,
  isAuthenticated: boolean,
  presenceState: PresencePublishState
) {
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
  presenceState
}: MapStatusCardProps) {
  return (
    <Surface elevation={3} style={styles.card}>
      <Text style={styles.eyebrow} variant="labelSmall">
        MAP PREVIEW
      </Text>
      <Text variant="headlineSmall">Players nearby</Text>
      <Text style={styles.subtitle} variant="bodySmall">
        {getMapSummary(locationState, isAuthenticated, presenceState)}
      </Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "flex-start",
    marginHorizontal: 16,
    marginTop: 12,
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
