import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, cutCornerSize } from "../theme/tokens";

type CutCornerSurfaceProps = {
  children?: React.ReactNode;
  corner?: keyof typeof cutCornerSize;
  fill?: string;
  maskColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function CutCornerSurface({
  children,
  corner = "medium",
  fill = colors.surface,
  maskColor = colors.background,
  style
}: CutCornerSurfaceProps) {
  const cut = cutCornerSize[corner];
  const maskSide = cut * Math.SQRT2;
  const maskOffset = cut - maskSide / 2;

  return (
    <View style={[styles.container, { backgroundColor: fill }, style]}>
      <View
        pointerEvents="none"
        style={[
          styles.mask,
          {
            backgroundColor: maskColor,
            bottom: maskOffset,
            height: maskSide,
            left: maskOffset,
            width: maskSide
          }
        ]}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    position: "relative"
  },
  mask: {
    position: "absolute",
    transform: [{ rotate: "45deg" }]
  },
  content: {
    position: "relative"
  }
});
