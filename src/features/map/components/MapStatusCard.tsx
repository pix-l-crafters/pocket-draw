import { StyleSheet } from "react-native";
import { Surface, Text } from "react-native-paper";

import type { LocationState } from "../hooks/useForegroundLocation";

type MapStatusCardProps = {
  locationState: LocationState;
};

function getLocationSummary(locationState: LocationState) {
  switch (locationState.status) {
    case "loading":
      return "Finding your location...";
    case "granted":
      return "Your location and 3 mock players";
    case "denied":
      return "Location permission is required to show you";
    case "error":
      return "Map available without your location";
  }
}

export function MapStatusCard({ locationState }: MapStatusCardProps) {
  return (
    <Surface elevation={3} style={styles.card}>
      <Text style={styles.eyebrow} variant="labelSmall">
        MAP PREVIEW
      </Text>
      <Text variant="headlineSmall">Players nearby</Text>
      <Text style={styles.subtitle} variant="bodySmall">
        {getLocationSummary(locationState)}
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
