import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import MapView, { type LatLng, type Region } from "react-native-maps";
import { ActivityIndicator, Surface, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { LocationStatusCard } from "./components/LocationStatusCard";
import { MapStatusCard } from "./components/MapStatusCard";
import { PlayerMarker } from "./components/PlayerMarker";
import { PresenceStatusSnackbar } from "./components/PresenceStatusSnackbar";
import { RecenterButton } from "./components/RecenterButton";
import { useForegroundLocation } from "./hooks/useForegroundLocation";
import { usePresencePublisher } from "./hooks/usePresencePublisher";
import type { Coordinates, CurrentUser } from "./types/map.types";

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

function getRegionForCoordinate(coordinate: Coordinates): Region {
  return {
    ...coordinate,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012
  };
}

type MapScreenProps = {
  currentUser: CurrentUser | null;
};

export function MapScreen({ currentUser }: MapScreenProps) {
  const mapRef = useRef<MapView>(null);
  const hasCenteredOnUserRef = useRef(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const { locationState, retry } = useForegroundLocation();
  const userCoordinate =
    locationState.status === "granted" ? locationState.position : null;
  const {
    dismissError: dismissPresenceError,
    presenceState,
    retry: retryPresence
  } = usePresencePublisher({ currentUser, position: userCoordinate });

  useEffect(() => {
    if (!isMapReady || !userCoordinate || hasCenteredOnUserRef.current) {
      return;
    }

    hasCenteredOnUserRef.current = true;
    mapRef.current?.animateToRegion(
      getRegionForCoordinate(userCoordinate),
      650
    );
  }, [isMapReady, userCoordinate]);

  const handleMapReady = useCallback(() => {
    setIsMapReady(true);
  }, []);

  const handleRecenter = useCallback(() => {
    if (!userCoordinate) {
      return;
    }

    mapRef.current?.animateToRegion(
      getRegionForCoordinate(userCoordinate),
      450
    );
  }, [userCoordinate]);

  const handleOpenSettings = useCallback(() => {
    void Linking.openSettings();
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
        {userCoordinate ? (
          <PlayerMarker
            coordinate={userCoordinate}
            description="Your current location"
            name="You"
            pinColor="#2E90FA"
          />
        ) : null}
      </MapView>

      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View pointerEvents="none">
          <MapStatusCard
            isAuthenticated={currentUser !== null}
            locationState={locationState}
            presenceState={presenceState}
          />
        </View>

        <LocationStatusCard
          locationState={locationState}
          onOpenSettings={handleOpenSettings}
          onRetry={retry}
        />

        <View style={styles.recenterButton}>
          <RecenterButton disabled={!userCoordinate} onPress={handleRecenter} />
        </View>
      </SafeAreaView>

      <PresenceStatusSnackbar
        onDismiss={dismissPresenceError}
        onRetry={retryPresence}
        presenceState={presenceState}
      />

      {!isMapReady ? (
        <View accessibilityLiveRegion="polite" style={styles.loadingOverlay}>
          <Surface elevation={4} style={styles.loadingCard}>
            <ActivityIndicator size="large" />
            <Text variant="titleSmall">Loading map...</Text>
          </Surface>
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
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 22
  }
});
