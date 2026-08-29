import { Pressable, StyleSheet, Text, View } from "react-native";

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
    <View accessibilityLiveRegion="polite" style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={isPermanentlyDenied ? onOpenSettings : onRetry}
          style={({ pressed }) => [
            styles.button,
            pressed ? styles.buttonPressed : undefined
          ]}
        >
          <Text style={styles.buttonLabel}>
            {isPermanentlyDenied ? "Open settings" : "Try again"}
          </Text>
        </Pressable>
        {isPermanentlyDenied ? (
          <Pressable
            accessibilityHint="Checks location permission after you return from settings"
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.secondaryButtonPressed : undefined
            ]}
          >
            <Text style={styles.secondaryButtonLabel}>Check again</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    right: 16,
    bottom: 84,
    left: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4
  },
  title: {
    color: "#101828",
    fontSize: 16,
    fontWeight: "800"
  },
  message: {
    marginTop: 4,
    color: "#475467",
    fontSize: 14,
    lineHeight: 20
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  button: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#6941C6",
    paddingHorizontal: 18
  },
  buttonPressed: {
    backgroundColor: "#53389E"
  },
  buttonLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700"
  },
  secondaryButton: {
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18
  },
  secondaryButtonPressed: {
    backgroundColor: "#F2F4F7"
  },
  secondaryButtonLabel: {
    color: "#344054",
    fontSize: 14,
    fontWeight: "700"
  }
});
