import {
  PLAYER_PIN_COLORS,
  PUBLIC_LOCATION_DECIMAL_PLACES
} from "../constants/map.constants";
import type { Coordinates, NearbyPlayer } from "../types/map.types";

const METRES_PER_LATITUDE_DEGREE = 111_320;
const EARTH_RADIUS_METRES = 6_371_000;
const OVERLAPPING_MARKER_SEPARATION_METRES = 40;

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

function coordinateKey({ latitude, longitude }: Coordinates) {
  return `${latitude},${longitude}`;
}

/**
 * Gives players sharing one privacy-coarsened location separate display pins.
 * Players sharing the user's rounded location spread around their fixed pin.
 * The offset is visual only; published presence coordinates remain unchanged.
 */
export function spreadOverlappingPlayerMarkers(
  players: NearbyPlayer[],
  userCoordinate: Coordinates | null = null
): NearbyPlayer[] {
  const groups = new Map<string, NearbyPlayer[]>();

  players.forEach((player) => {
    const key = coordinateKey(player.coordinate);
    const group = groups.get(key) ?? [];
    group.push(player);
    groups.set(key, group);
  });

  const displayCoordinateByUid = new Map<string, Coordinates>();
  const userKey = userCoordinate
    ? coordinateKey(coarsenCoordinates(userCoordinate))
    : null;

  groups.forEach((group, key) => {
    const includesUser = key === userKey;
    if (group.length === 1 && !includesUser) {
      return;
    }

    const sortedGroup = [...group].sort((left, right) =>
      left.uid.localeCompare(right.uid)
    );
    const center =
      includesUser && userCoordinate
        ? userCoordinate
        : sortedGroup[0].coordinate;
    const latitude = center.latitude;
    const playerRadiusMetres =
      sortedGroup.length === 1
        ? OVERLAPPING_MARKER_SEPARATION_METRES
        : OVERLAPPING_MARKER_SEPARATION_METRES /
          (2 * Math.sin(Math.PI / sortedGroup.length));
    const radiusMetres = includesUser
      ? Math.max(OVERLAPPING_MARKER_SEPARATION_METRES, playerRadiusMetres)
      : playerRadiusMetres;
    const latitudeRadius = radiusMetres / METRES_PER_LATITUDE_DEGREE;
    const longitudeRadius =
      radiusMetres /
      (METRES_PER_LATITUDE_DEGREE *
        Math.max(Math.cos((latitude * Math.PI) / 180), 0.01));

    sortedGroup.forEach((player, index) => {
      const angle = (2 * Math.PI * index) / sortedGroup.length - Math.PI / 2;

      displayCoordinateByUid.set(player.uid, {
        latitude: center.latitude + latitudeRadius * Math.sin(angle),
        longitude: center.longitude + longitudeRadius * Math.cos(angle)
      });
    });
  });

  return players.map((player) => {
    const displayCoordinate = displayCoordinateByUid.get(player.uid);

    return displayCoordinate
      ? { ...player, coordinate: displayCoordinate }
      : player;
  });
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
