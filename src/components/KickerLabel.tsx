import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

import { colors, fonts } from "../theme/tokens";

type KickerLabelProps = {
  children: string;
  color?: string;
  style?: StyleProp<TextStyle>;
};

export function KickerLabel({
  children,
  color = colors.accent,
  style
}: KickerLabelProps) {
  return <Text style={[styles.label, { color }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 2,
    textTransform: "uppercase"
  }
});
