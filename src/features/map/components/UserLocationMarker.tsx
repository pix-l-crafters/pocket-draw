import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Marker, type LatLng } from "react-native-maps";

const DOT_SIZE = 18;
const HALO_SIZE = 34;
const CENTER_ANCHOR = { x: 0.5, y: 0.5 };
/** Above every player pin and cluster bubble. */
const USER_MARKER_Z_INDEX = 1000;

type UserLocationMarkerProps = {
  coordinate: LatLng;
};

/**
 * The current player's position: a haloed dot centred on the coordinate, so it
 * reads differently from other players' pins. It has no title or press handler,
 * so tapping it does nothing.
 */
export function UserLocationMarker({ coordinate }: UserLocationMarkerProps) {
  // Custom marker views must be tracked until drawn once, then frozen for
  // performance. Moving the coordinate does not need tracking.
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Marker
      accessibilityLabel="Your location"
      anchor={CENTER_ANCHOR}
      coordinate={coordinate}
      tracksViewChanges={tracksViewChanges}
      zIndex={USER_MARKER_Z_INDEX}
    >
      <View style={styles.halo}>
        <View style={styles.dot} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  halo: {
    alignItems: "center",
    backgroundColor: "rgba(46, 144, 250, 0.22)",
    borderRadius: HALO_SIZE / 2,
    height: HALO_SIZE,
    justifyContent: "center",
    width: HALO_SIZE
  },
  dot: {
    backgroundColor: "#2E90FA",
    borderColor: "#FFFFFF",
    borderRadius: DOT_SIZE / 2,
    borderWidth: 3,
    height: DOT_SIZE,
    width: DOT_SIZE
  }
});
