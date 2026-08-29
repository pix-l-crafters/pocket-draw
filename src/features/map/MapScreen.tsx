import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";
import MapView, { type LatLng, type Region } from "react-native-maps";

import { PlayerMarker } from "./components/PlayerMarker";
import { RecenterButton } from "./components/RecenterButton";

const INITIAL_REGION: Region = {
  latitude: -33.8688,
  longitude: 151.2093,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035
};

const MOCK_PLAYERS: ReadonlyArray<{
  id: string;
  name: string;
  coordinate: LatLng;
  pinColor: string;
}> = [
  {
    id: "mock-player-maya",
    name: "Maya",
    coordinate: { latitude: -33.865, longitude: 151.2094 },
    pinColor: "#7F56D9"
  },
  {
    id: "mock-player-noah",
    name: "Noah",
    coordinate: { latitude: -33.8722, longitude: 151.2148 },
    pinColor: "#F04438"
  },
  {
    id: "mock-player-zoe",
    name: "Zoe",
    coordinate: { latitude: -33.8681, longitude: 151.2016 },
    pinColor: "#12B76A"
  }
];

export function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const handleMapReady = useCallback(() => {
    setIsMapReady(true);
  }, []);

  const handleRecenter = useCallback(() => {
    mapRef.current?.animateToRegion(INITIAL_REGION, 450);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <MapView
        ref={mapRef}
        initialRegion={INITIAL_REGION}
        onMapReady={handleMapReady}
        rotateEnabled={false}
        style={StyleSheet.absoluteFillObject}
      >
        {MOCK_PLAYERS.map((player) => (
          <PlayerMarker
            key={player.id}
            coordinate={player.coordinate}
            name={player.name}
            pinColor={player.pinColor}
          />
        ))}
      </MapView>

      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View pointerEvents="none" style={styles.statusCard}>
          <Text style={styles.eyebrow}>MAP PREVIEW</Text>
          <Text style={styles.title}>Players nearby</Text>
          <Text style={styles.subtitle}>3 mock players in the demo area</Text>
        </View>

        <View style={styles.recenterButton}>
          <RecenterButton onPress={handleRecenter} />
        </View>
      </SafeAreaView>

      {!isMapReady ? (
        <View accessibilityLiveRegion="polite" style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#7F56D9" size="large" />
            <Text style={styles.loadingText}>Loading map...</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E6F4FE"
  },
  overlay: {
    flex: 1
  },
  statusCard: {
    alignSelf: "flex-start",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4
  },
  eyebrow: {
    color: "#6941C6",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2
  },
  title: {
    marginTop: 2,
    color: "#101828",
    fontSize: 20,
    fontWeight: "800"
  },
  subtitle: {
    marginTop: 2,
    color: "#475467",
    fontSize: 13
  },
  recenterButton: {
    position: "absolute",
    right: 20,
    bottom: 20
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(230, 244, 254, 0.82)"
  },
  loadingCard: {
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 28,
    paddingVertical: 22,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4
  },
  loadingText: {
    color: "#344054",
    fontSize: 15,
    fontWeight: "600"
  }
});
