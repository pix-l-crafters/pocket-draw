import { StyleSheet } from "react-native";
import { Chip } from "react-native-paper";

type SharingToggleProps = {
  isSharing: boolean | null;
  onToggle: () => void;
};

export function SharingToggle({ isSharing, onToggle }: SharingToggleProps) {
  if (isSharing === null) {
    return null;
  }

  return (
    <Chip
      accessibilityLabel={
        isSharing
          ? "Location sharing is on. Tap to hide your location."
          : "Location sharing is off. Tap to share your location."
      }
      compact
      icon={isSharing ? "eye" : "eye-off"}
      onPress={onToggle}
      selected={isSharing}
      style={styles.chip}
    >
      {isSharing ? "Sharing" : "Hidden"}
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start"
  }
});
