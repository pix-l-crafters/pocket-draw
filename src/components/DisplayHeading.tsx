import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

import { colors, fonts } from "../theme/tokens";

type DisplayHeadingProps = {
  children: string;
  size?: number;
  style?: StyleProp<TextStyle>;
};

export function DisplayHeading({
  children,
  size = 34,
  style
}: DisplayHeadingProps) {
  return (
    <Text
      style={[
        styles.heading,
        { fontSize: size, lineHeight: size * 0.92 },
        style
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    textTransform: "uppercase"
  }
});
