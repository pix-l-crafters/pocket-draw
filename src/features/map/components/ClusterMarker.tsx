import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Marker, type LatLng } from "react-native-maps";

import { colors, fonts } from "../../../theme/tokens";

const BUBBLE_SIZE = 36;
const BOTTOM_CENTER_ANCHOR = { x: 0.5, y: 1 };
const BUBBLE_CENTER_OFFSET = { x: 0, y: -BUBBLE_SIZE / 2 };

type ClusterMarkerProps = {
  coordinate: LatLng;
  count: number;
  onPress: () => void;
};

export function ClusterMarker({
  coordinate,
  count,
  onPress
}: ClusterMarkerProps) {
  // Custom marker views must be tracked until drawn once, then frozen for
  // performance. The parent keys clusters by members, so a new count remounts.
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Marker
      accessibilityLabel={`${count} players here`}
      // Sit above the coordinate like a pin, so a bubble placed above You does
      // not cover You's pin. Android uses `anchor`, Apple Maps `centerOffset`.
      anchor={BOTTOM_CENTER_ANCHOR}
      centerOffset={BUBBLE_CENTER_OFFSET}
      coordinate={coordinate}
      onPress={onPress}
      tracksViewChanges={tracksViewChanges}
    >
      <View style={styles.bubble}>
        <Text style={styles.count}>{count}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderColor: colors.text,
    borderRadius: BUBBLE_SIZE / 2,
    borderWidth: 2,
    height: BUBBLE_SIZE,
    justifyContent: "center",
    minWidth: BUBBLE_SIZE,
    paddingHorizontal: 6
  },
  count: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 16
  }
});
