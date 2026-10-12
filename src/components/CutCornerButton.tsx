import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fonts } from "../theme/tokens";
import { CutCornerSurface } from "./CutCornerSurface";

type CutCornerButtonProps = {
  disabled?: boolean;
  fillAvailableHeight?: boolean;
  label: string;
  onPress: () => void;
};

export function CutCornerButton({
  disabled = false,
  fillAvailableHeight = false,
  label,
  onPress
}: CutCornerButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        fillAvailableHeight && styles.fillAvailableHeight,
        disabled && styles.disabled,
        pressed && styles.pressed
      ]}
    >
      <CutCornerSurface
        corner="medium"
        fill={colors.accent}
        style={[
          styles.surface,
          fillAvailableHeight && styles.fillAvailableHeight
        ]}
      >
        <Text style={styles.label}>{label}</Text>
      </CutCornerSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  surface: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 64,
    paddingVertical: 17,
    width: "100%"
  },
  fillAvailableHeight: {
    flex: 1
  },
  label: {
    color: colors.background,
    fontFamily: fonts.displayBold,
    fontSize: 19,
    letterSpacing: 2.5,
    textTransform: "uppercase"
  },
  pressed: {
    opacity: 0.85
  },
  disabled: {
    opacity: 0.4
  }
});
