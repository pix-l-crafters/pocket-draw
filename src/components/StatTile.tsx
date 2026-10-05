import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "../theme/tokens";

type StatTileProps = {
  label: string;
  tint?: string;
  unit?: string;
  value: string;
};

export function StatTile({
  label,
  tint = colors.text,
  unit,
  value
}: StatTileProps) {
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: tint }]}>
        {value}
        {unit ? <Text style={styles.unit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.backgroundAlt,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12
  },
  label: {
    color: colors.textMuted45,
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 1.5,
    textTransform: "uppercase"
  },
  value: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    lineHeight: 27,
    marginTop: 2
  },
  unit: {
    fontSize: 13
  }
});
