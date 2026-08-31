import { FAB } from "react-native-paper";

type RecenterButtonProps = {
  disabled?: boolean;
  onPress: () => void;
};

export function RecenterButton({
  disabled = false,
  onPress
}: RecenterButtonProps) {
  return (
    <FAB
      accessibilityHint="Moves the map back to your location"
      accessibilityLabel="Recenter map"
      disabled={disabled}
      icon="crosshairs-gps"
      label="Recenter"
      mode="elevated"
      onPress={onPress}
      size="medium"
      variant="primary"
    />
  );
}
