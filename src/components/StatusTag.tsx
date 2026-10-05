import { StyleSheet, Text } from "react-native";

import { colors, fonts } from "../theme/tokens";

type StatusTagProps = {
  children: string;
  tone?: "muted" | "success" | "warning";
};

const toneColors = {
  muted: colors.textMuted45,
  success: colors.success,
  warning: colors.warning
} as const;

export function StatusTag({ children, tone = "muted" }: StatusTagProps) {
  return (
    <Text style={[styles.tag, { color: toneColors[tone] }]}>{children}</Text>
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
