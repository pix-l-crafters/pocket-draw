import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

import { colors, fonts } from "../theme/tokens";

type StatusTagProps = {
  children: string;
  style?: StyleProp<TextStyle>;
  tone?: "muted" | "success" | "warning";
};

const toneColors = {
  muted: colors.textMuted45,
  success: colors.success,
  warning: colors.warning
} as const;

export function StatusTag({ children, style, tone = "muted" }: StatusTagProps) {
  return (
    <Text style={[styles.tag, { color: toneColors[tone] }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  tag: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 1.5,
    textTransform: "uppercase"
  }
});
