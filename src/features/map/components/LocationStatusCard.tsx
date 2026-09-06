import { StyleSheet, View } from "react-native";
import { Button, Surface, Text } from "react-native-paper";

import type { LocationState } from "../hooks/useForegroundLocation";

type LocationStatusCardProps = {
  locationState: LocationState;
  onOpenSettings: () => void;
  onRetry: () => void;
};

export function LocationStatusCard({
  locationState,
  onOpenSettings,
  onRetry
}: LocationStatusCardProps) {
  if (
    locationState.status === "loading" ||
    locationState.status === "granted"
  ) {
    return null;
  }

  const isPermanentlyDenied =
    locationState.status === "denied" && !locationState.canAskAgain;
  const title =
    locationState.status === "denied"
      ? "Location access needed"
      : "Location unavailable";
  const message =
    locationState.status === "denied"
      ? "Allow location access to see yourself on the map."
      : locationState.message;

  return (
    <Surface accessibilityLiveRegion="polite" elevation={3} style={styles.card}>
      <Text variant="titleMedium">{title}</Text>
      <Text style={styles.message} variant="bodyMedium">
        {message}
      </Text>
      <View style={styles.actions}>
        <Button
          icon={isPermanentlyDenied ? "cog-outline" : "refresh"}
          mode="contained"
          onPress={isPermanentlyDenied ? onOpenSettings : onRetry}
        >
          {isPermanentlyDenied ? "Open settings" : "Try again"}
        </Button>
        {isPermanentlyDenied ? (
          <Button
            accessibilityHint="Checks location permission after you return from settings"
            icon="check-circle-outline"
            mode="outlined"
            onPress={onRetry}
          >
            Check again
          </Button>
        ) : null}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    right: 16,
    bottom: 84,
    left: 16,
    borderRadius: 20,
    padding: 18
  },
  message: {
    marginTop: 6
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  }
});
