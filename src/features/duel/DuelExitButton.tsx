import { Pressable, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";

import { colors } from "../../theme/tokens";

export function DuelExitButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Exit duel"
      accessibilityRole="button"
      onPress={onPress}
      style={styles.button}
    >
      {({ pressed }) => (
        <Svg
          accessibilityElementsHidden
          accessible={false}
          height={48}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          viewBox="0 0 48 48"
          width={48}
        >
          <Path
            d="M1 1H47V47H9L1 39Z"
            fill={pressed ? colors.accentPressed : colors.accent}
            stroke={pressed ? colors.accentPressed : colors.accent}
          />
          <Path
            d="M14 14L34 34M34 14L14 34"
            stroke={colors.background}
            strokeLinecap="round"
            strokeWidth={2}
          />
        </Svg>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    width: 48
  }
});
