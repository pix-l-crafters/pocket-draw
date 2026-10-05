import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fonts } from "../theme/tokens";
import { CutCornerSurface } from "./CutCornerSurface";

type CutCornerButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

export function CutCornerButton({
  disabled = false,
  label,
  onPress
}: CutCornerButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        disabled && styles.disabled,
        pressed && styles.pressed
      ]}
    >
      <CutCornerSurface
        corner="medium"
        fill={colors.accent}
        style={styles.surface}
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
    paddingVertical: 17,
    width: "100%"
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
