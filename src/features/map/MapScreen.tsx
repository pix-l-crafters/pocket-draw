import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";
import MapView, { type Region } from "react-native-maps";
import { ActivityIndicator, Surface, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { usePlayerStats } from "../../hooks/usePlayerStats";
import { colors } from "../../theme/tokens";
import { ClusterMarker } from "./components/ClusterMarker";
import { LocationStatusCard } from "./components/LocationStatusCard";
import { MapStatusCard } from "./components/MapStatusCard";
import { PlayerMarker } from "./components/PlayerMarker";
import { PlayerStatsCard } from "./components/PlayerStatsCard";
import { PresenceStatusSnackbar } from "./components/PresenceStatusSnackbar";
import { RecenterButton } from "./components/RecenterButton";
import { SharingToggle } from "./components/SharingToggle";
import { UserLocationMarker } from "./components/UserLocationMarker";
import { useForegroundLocation } from "./hooks/useForegroundLocation";
import { useNearbyPlayers } from "./hooks/useNearbyPlayers";
import { usePresencePublisher } from "./hooks/usePresencePublisher";
import { useSharingPreference } from "./hooks/useSharingPreference";
import type {
  Coordinates,
  CurrentUser,
  PlayerMarkerCluster
} from "./types/map.types";
import {
  clusterPlayerMarkers,
  pinColorForUid,
  regionForCoordinates,
  spreadClusterMembers
} from "./utils/map.utils";

const INITIAL_REGION: Region = {
  latitude: -33.8688,
  longitude: 151.2093,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035
};

/** Tightest span (~110 m) a cluster tap zooms to. */
const CLUSTER_MIN_LATITUDE_DELTA = 0.001;

/** A tap only zooms if it narrows the span to at most this fraction. */
const CLUSTER_MIN_ZOOM_RATIO = 0.9;

const CLUSTER_ZOOM_DURATION_MS = 350;

/** A fanned-out cluster folds back once the span grows past this multiple. */
const SPREAD_COLLAPSE_ZOOM_RATIO = 1.5;

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
  const nearbyPlayersState = useNearbyPlayers(
    currentUser?.uid ?? null,
    userCoordinate
  );
  const visiblePlayers =
    nearbyPlayersState.status === "ready" ? nearbyPlayersState.players : [];
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const viewport = useMemo(
    () => ({ ...region, ...mapSize }),
    [region, mapSize]
  );
  const clusters = useMemo(
    () => clusterPlayerMarkers(visiblePlayers, viewport, userCoordinate),
    [visiblePlayers, viewport, userCoordinate]
  );
  const [selectedPlayerUid, setSelectedPlayerUid] = useState<string | null>(
    null
  );
  // The fanned-out cluster and the span it was fanned out at.
  const [spread, setSpread] = useState<{
    clusterId: string;
    latitudeDelta: number;
  } | null>(null);
  // Bumped on iOS whenever the map settles; part of every marker key, so all
  // markers are re-added. Works around Apple Maps on the New Architecture
  // silently dropping markers after zoom/pan (react-native-maps#5911).
  const [markerGeneration, setMarkerGeneration] = useState(0);
  const selectedPlayer =
    visiblePlayers.find((player) => player.uid === selectedPlayerUid) ?? null;
  const selectedPlayerStats = usePlayerStats(selectedPlayer);

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

  const handleRegionChangeComplete = useCallback((next: Region) => {
    setRegion(next);
    // Zooming well out of where a cluster was fanned out folds it back up.
    setSpread((current) =>
      current &&
      next.latitudeDelta > current.latitudeDelta * SPREAD_COLLAPSE_ZOOM_RATIO
        ? null
        : current
    );
    if (Platform.OS === "ios") {
      setMarkerGeneration((generation) => generation + 1);
    }
  }, []);

  const clearSelectedPlayer = useCallback(() => {
    setSelectedPlayerUid(null);
    if (Platform.OS === "ios") {
      // Apple Maps keeps the tapped pin selected (enlarged); re-adding the
      // markers returns it to normal size.
      setMarkerGeneration((generation) => generation + 1);
    }
  }, []);

  const handleClusterPress = useCallback(
    (cluster: PlayerMarkerCluster) => {
      const target = regionForCoordinates(
        cluster.players.map(({ coordinate }) => coordinate),
        mapSize,
        CLUSTER_MIN_LATITUDE_DELTA
      );
      const zoomsIn =
        target.latitudeDelta < region.latitudeDelta * CLUSTER_MIN_ZOOM_RATIO;
      const nextViewport = zoomsIn ? { ...target, ...mapSize } : viewport;

      if (zoomsIn) {
        // Cluster against the target now instead of when the animation ends,
        // so the bubble splits as the map starts moving.
        setRegion(target);
        mapRef.current?.animateToRegion(target, CLUSTER_ZOOM_DURATION_MS);
      }

      // Members that still overlap there (or share one coordinate) fan out.
      const stillMerged =
        clusterPlayerMarkers(cluster.players, nextViewport, userCoordinate)
          .length === 1;
      if (stillMerged) {
        setSpread({
          clusterId: cluster.id,
          latitudeDelta: nextViewport.latitudeDelta
        });
      }
    },
    [mapSize, region.latitudeDelta, userCoordinate, viewport]
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <MapView
        ref={mapRef}
        initialRegion={INITIAL_REGION}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setMapSize({ width, height });
        }}
        onMapReady={handleMapReady}
        onPress={(event) => {
          if (event.nativeEvent.action !== "marker-press") {
            clearSelectedPlayer();
            setSpread(null);
          }
        }}
        // Android otherwise pans to any tapped marker, including You.
        moveOnMarkerPress={false}
        onRegionChangeComplete={handleRegionChangeComplete}
        rotateEnabled={false}
        style={StyleSheet.absoluteFillObject}
      >
        {/* First, so player markers changing around it do not shift it; zIndex
            still draws it on top. Markers wait for the map: Apple Maps can drop
            ones added earlier. */}
        {isMapReady && userCoordinate ? (
          <UserLocationMarker
            key={`${markerGeneration}:you`}
            coordinate={userCoordinate}
          />
        ) : null}
        {(isMapReady ? clusters : []).map((cluster) => {
          if (cluster.players.length > 1 && cluster.id === spread?.clusterId) {
            return spreadClusterMembers(cluster, viewport).map((player) => (
              <PlayerMarker
                key={`${markerGeneration}:${player.uid}`}
                coordinate={player.coordinate}
                name={player.displayName}
                onPress={() => setSelectedPlayerUid(player.uid)}
                pinColor={pinColorForUid(player.uid)}
              />
            ));
          }

          if (cluster.players.length > 1) {
            return (
              <ClusterMarker
                key={`${markerGeneration}:${cluster.id}`}
                coordinate={cluster.coordinate}
                count={cluster.players.length}
                onPress={() => handleClusterPress(cluster)}
              />
            );
          }

          const [player] = cluster.players;

          return (
            <PlayerMarker
              key={`${markerGeneration}:${cluster.id}`}
              coordinate={cluster.coordinate}
              name={player.displayName}
              onPress={() => setSelectedPlayerUid(player.uid)}
              pinColor={pinColorForUid(player.uid)}
            />
          );
        })}
      </MapView>

      <SafeAreaView
        pointerEvents="box-none"
        style={styles.overlay}
      >
        <View pointerEvents="none">
          <MapStatusCard
            isAuthenticated={currentUser !== null}
            locationState={locationState}
            nearbyPlayersState={nearbyPlayersState}
            presenceState={presenceState}
          />
        </View>

        <View style={styles.sharingToggle}>
          <SharingToggle
            isSharing={isSharing}
            onToggle={toggleSharing}
          />
        </View>

        <LocationStatusCard
          locationState={locationState}
          onOpenSettings={handleOpenSettings}
          onRetry={retry}
        />

        {selectedPlayer ? (
          <PlayerStatsCard
            displayName={selectedPlayer.displayName}
            onClose={clearSelectedPlayer}
            stats={selectedPlayerStats}
          />
        ) : (
          <View style={styles.recenterButton}>
            <RecenterButton
              disabled={!userCoordinate}
              onPress={handleRecenter}
            />
          </View>
        )}
      </SafeAreaView>

      <PresenceStatusSnackbar
        onDismiss={dismissPresenceError}
        onRetry={retryPresence}
        presenceState={presenceState}
      />

      {!isMapReady ? (
        <View
          accessibilityLiveRegion="polite"
          style={styles.loadingOverlay}
        >
          <Surface
            elevation={4}
            style={styles.loadingCard}
          >
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
