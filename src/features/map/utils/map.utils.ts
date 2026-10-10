import {
  CLUSTER_RADIUS_PT,
  PLAYER_PIN_COLORS,
  PUBLIC_LOCATION_DECIMAL_PLACES
} from "../constants/map.constants";
import type {
  Coordinates,
  MapViewport,
  NearbyPlayer,
  PlayerMarkerCluster
} from "../types/map.types";

const EARTH_RADIUS_METRES = 6_371_000;
/** Pins and cluster bubbles sit above their coordinate; this is their middle. */
const MARKER_VISUAL_CENTER_PT = 20;
/** Margin around the fitted players, as a multiple of their span. */
const FIT_PADDING_FACTOR = 2;

/** Great-circle distance using the original, unshifted map coordinates. */
export function distanceBetweenCoordinatesMetres(
  from: Coordinates,
  to: Coordinates
): number {
  const radians = Math.PI / 180;
  const latitudeDifference = (to.latitude - from.latitude) * radians;
  const longitudeDifference = (to.longitude - from.longitude) * radians;
  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(from.latitude * radians) *
      Math.cos(to.latitude * radians) *
      Math.sin(longitudeDifference / 2) ** 2;

  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

function assertCoordinateInRange(
  value: number,
  minimum: number,
  maximum: number,
  name: string
) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}.`);
  }
}

export function coarsenCoordinate(value: number) {
  if (!Number.isFinite(value)) {
    throw new Error("Coordinate must be a finite number.");
  }

  return Number(value.toFixed(PUBLIC_LOCATION_DECIMAL_PLACES));
}

export function coarsenCoordinates({
  latitude,
  longitude
}: Coordinates): Coordinates {
  assertCoordinateInRange(latitude, -90, 90, "Latitude");
  assertCoordinateInRange(longitude, -180, 180, "Longitude");

  return {
    latitude: coarsenCoordinate(latitude),
    longitude: coarsenCoordinate(longitude)
  };
}

type ClusterNode = {
  players: NearbyPlayer[];
  coordinate: Coordinates;
  /** Pinned above You; merging into it keeps this position. */
  anchored: boolean;
};

/**
 * Groups players whose markers would overlap on screen at the current zoom. Any
 * group within `radiusPt` of You is moved straight above You, so You is never
 * covered. Offsets are visual only; published coordinates are unchanged.
 */
export function clusterPlayerMarkers(
  players: NearbyPlayer[],
  viewport: MapViewport,
  userCoordinate: Coordinates | null = null,
  radiusPt: number = CLUSTER_RADIUS_PT
): PlayerMarkerCluster[] {
  const { latitudeDelta, longitudeDelta, width, height } = viewport;
  const canProject =
    width > 0 && height > 0 && latitudeDelta > 0 && longitudeDelta > 0;
  const pointsPerLatitude = canProject ? height / latitudeDelta : 0;
  const pointsPerLongitude = canProject ? width / longitudeDelta : 0;

  // Linear projection: accurate enough for the city-scale regions shown.
  const screenDistance = (from: Coordinates, to: Coordinates) =>
    Math.hypot(
      (to.longitude - from.longitude) * pointsPerLongitude,
      (to.latitude - from.latitude) * pointsPerLatitude
    );

  const nodes: ClusterNode[] = [...players]
    .sort((left, right) => left.uid.localeCompare(right.uid))
    .map((player) => ({
      players: [player],
      coordinate: player.coordinate,
      anchored: false
    }));

  if (canProject) {
    const aboveUser = userCoordinate
      ? {
          latitude: userCoordinate.latitude + radiusPt / pointsPerLatitude,
          longitude: userCoordinate.longitude
        }
      : null;

    const merge = (target: ClusterNode, source: ClusterNode) => {
      const total = target.players.length + source.players.length;
      if (!target.anchored) {
        target.coordinate = source.anchored
          ? source.coordinate
          : {
              latitude:
                (target.coordinate.latitude * target.players.length +
                  source.coordinate.latitude * source.players.length) /
                total,
              longitude:
                (target.coordinate.longitude * target.players.length +
                  source.coordinate.longitude * source.players.length) /
                total
            };
        target.anchored = source.anchored;
      }
      target.players = [...target.players, ...source.players].sort(
        (left, right) => left.uid.localeCompare(right.uid)
      );
      nodes.splice(nodes.indexOf(source), 1);
    };

    const mergeOverlappingPair = () => {
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          if (
            screenDistance(nodes[i].coordinate, nodes[j].coordinate) < radiusPt
          ) {
            merge(nodes[i], nodes[j]);
            return true;
          }
        }
      }
      return false;
    };

    const moveOffUser = () => {
      if (!userCoordinate || !aboveUser) {
        return false;
      }
      const covering = nodes.find(
        (node) =>
          !node.anchored &&
          // Pins and bubbles are drawn upward from their coordinate, so test
          // their visual centre: a pin just below You still covers You.
          screenDistance(userCoordinate, {
            latitude:
              node.coordinate.latitude +
              MARKER_VISUAL_CENTER_PT / pointsPerLatitude,
            longitude: node.coordinate.longitude
          }) < radiusPt
      );
      if (!covering) {
        return false;
      }
      const anchoredNode = nodes.find((node) => node.anchored);
      if (anchoredNode) {
        merge(anchoredNode, covering);
      } else {
        covering.coordinate = aboveUser;
        covering.anchored = true;
      }
      return true;
    };

    // Each step removes a node or anchors one, so this terminates.
    while (mergeOverlappingPair() || moveOffUser()) {
      // Keep merging until nothing overlaps.
    }
  }

  return nodes.map(({ players: members, coordinate }) => ({
    id: members.map(({ uid }) => uid).join(","),
    coordinate,
    players: members
  }));
}

/**
 * Fans a cluster's members out on the upper half of a circle around it, at
 * least `radiusPt` apart on screen. The upper half keeps a cluster that sits
 * above You from fanning onto You. Display offset only.
 */
export function spreadClusterMembers(
  cluster: PlayerMarkerCluster,
  viewport: MapViewport,
  radiusPt: number = CLUSTER_RADIUS_PT
): NearbyPlayer[] {
  const { players: members, coordinate: center } = cluster;
  const { latitudeDelta, longitudeDelta, width, height } = viewport;

  if (
    members.length < 2 ||
    width <= 0 ||
    height <= 0 ||
    latitudeDelta <= 0 ||
    longitudeDelta <= 0
  ) {
    return members;
  }

  // Neighbours are one angular step apart; size the ring so the chord between
  // them is at least `radiusPt`.
  const step = Math.PI / (members.length - 1);
  const ringPt = Math.max(radiusPt, radiusPt / (2 * Math.sin(step / 2)));
  const degreesPerPointLatitude = latitudeDelta / height;
  const degreesPerPointLongitude = longitudeDelta / width;

  return members.map((player, index) => {
    // From due west (π) over the top to due east (2π).
    const angle = Math.PI + step * index;

    return {
      ...player,
      coordinate: {
        latitude:
          center.latitude - ringPt * Math.sin(angle) * degreesPerPointLatitude,
        longitude:
          center.longitude + ringPt * Math.cos(angle) * degreesPerPointLongitude
      }
    };
  });
}

/**
 * The region that frames `coordinates` with a margin, never tighter than
 * `minLatitudeDelta`. The longitude span matches the map's aspect ratio, so
 * this region can be used for clustering before the map has moved there.
 */
export function regionForCoordinates(
  coordinates: Coordinates[],
  mapSize: { width: number; height: number },
  minLatitudeDelta: number
): Omit<MapViewport, "width" | "height"> {
  const latitudes = coordinates.map(({ latitude }) => latitude);
  const longitudes = coordinates.map(({ longitude }) => longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const latitude = (minLatitude + maxLatitude) / 2;
  const longitude = (minLongitude + maxLongitude) / 2;
  const cosLatitude = Math.max(Math.cos((latitude * Math.PI) / 180), 0.01);
  const aspect =
    mapSize.width > 0 && mapSize.height > 0
      ? mapSize.width / mapSize.height
      : 1;

  // Express the longitude span in latitude-equivalent degrees for this screen.
  const latitudeDelta = Math.max(
    (maxLatitude - minLatitude) * FIT_PADDING_FACTOR,
    ((maxLongitude - minLongitude) * FIT_PADDING_FACTOR * cosLatitude) / aspect,
    minLatitudeDelta
  );

  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta: (latitudeDelta * aspect) / cosLatitude
  };
}

/** Picks a stable marker colour for a player from their uid. */
export function pinColorForUid(uid: string): string {
  let hash = 0;

  for (let index = 0; index < uid.length; index += 1) {
    hash = (hash * 31 + uid.charCodeAt(index)) | 0;
  }

  const bucket = Math.abs(hash) % PLAYER_PIN_COLORS.length;

  return PLAYER_PIN_COLORS[bucket];
}
