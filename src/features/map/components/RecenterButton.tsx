import { Pressable, StyleSheet, Text } from "react-native";

type RecenterButtonProps = {
  disabled?: boolean;
  onPress: () => void;
};

export function RecenterButton({
  disabled = false,
  onPress
}: RecenterButtonProps) {
  return (
    <Pressable
      accessibilityHint="Moves the map back to your location"
      accessibilityLabel="Recenter map"
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled ? styles.buttonDisabled : undefined,
        pressed ? styles.buttonPressed : undefined
      ]}
    >
      <Text style={styles.label}>Recenter</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    backgroundColor: "#101828",
    paddingHorizontal: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5
  },
  buttonPressed: {
    backgroundColor: "#344054",
    transform: [{ scale: 0.98 }]
  },
  buttonDisabled: {
    opacity: 0.55
  },
  label: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700"
  }
});
