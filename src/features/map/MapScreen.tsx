import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import MapView, { type Region } from "react-native-maps";
import { ActivityIndicator, Surface, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { LocationStatusCard } from "./components/LocationStatusCard";
import { MapStatusCard } from "./components/MapStatusCard";
import { PlayerMarker } from "./components/PlayerMarker";
import { PresenceStatusSnackbar } from "./components/PresenceStatusSnackbar";
import { RecenterButton } from "./components/RecenterButton";
import { SharingToggle } from "./components/SharingToggle";
import { useForegroundLocation } from "./hooks/useForegroundLocation";
import { useNearbyPlayers } from "./hooks/useNearbyPlayers";
import { usePresencePublisher } from "./hooks/usePresencePublisher";
import { useSharingPreference } from "./hooks/useSharingPreference";
import type { Coordinates, CurrentUser } from "./types/map.types";
import { pinColorForUid } from "./utils/map.utils";
import { colors } from "../../theme/tokens";

const INITIAL_REGION: Region = {
  latitude: -33.8688,
  longitude: 151.2093,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035
};

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
  const { isSharing, toggleSharing } = useSharingPreference();
  const userCoordinate =
    locationState.status === "granted" ? locationState.position : null;
  const {
    dismissError: dismissPresenceError,
    presenceState,
    retry: retryPresence
  } = usePresencePublisher({
    currentUser,
    position: userCoordinate,
    enabled: isSharing
  });
  const nearbyPlayersState = useNearbyPlayers(currentUser?.uid ?? null);
  const nearbyPlayers =
    nearbyPlayersState.status === "ready" ? nearbyPlayersState.players : [];

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
      <StatusBar style="light" />
      <MapView
        ref={mapRef}
        initialRegion={INITIAL_REGION}
        onMapReady={handleMapReady}
        rotateEnabled={false}
        style={StyleSheet.absoluteFillObject}
      >
        {nearbyPlayers.map((player) => (
          <PlayerMarker
            key={player.uid}
            coordinate={player.coordinate}
            description="Nearby player"
            name={player.displayName}
            pinColor={pinColorForUid(player.uid)}
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
            nearbyPlayersState={nearbyPlayersState}
            presenceState={presenceState}
          />
        </View>

        <View style={styles.sharingToggle}>
          <SharingToggle isSharing={isSharing} onToggle={toggleSharing} />
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
    backgroundColor: colors.background,
    flex: 1
  },
  overlay: {
    flex: 1
  },
  sharingToggle: {
    alignItems: "flex-start",
    marginLeft: 12,
    marginTop: 6
  },
  recenterButton: {
    bottom: 20,
    position: "absolute",
    right: 20
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(8, 9, 11, 0.82)",
    justifyContent: "center"
  },
  loadingCard: {
    alignItems: "center",
    borderRadius: 20,
    gap: 12,
    paddingHorizontal: 28,
    paddingVertical: 22
  }
});
