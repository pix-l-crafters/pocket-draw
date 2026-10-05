import {
  PLAYER_PIN_COLORS,
  PUBLIC_LOCATION_DECIMAL_PLACES
} from "../constants/map.constants";
import type { Coordinates, NearbyPlayer } from "../types/map.types";

const METRES_PER_LATITUDE_DEGREE = 111_320;
const OVERLAPPING_MARKER_SEPARATION_METRES = 40;

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
 * The offset is visual only; published presence coordinates remain unchanged.
 */
export function spreadOverlappingPlayerMarkers(
  players: NearbyPlayer[]
): NearbyPlayer[] {
  const groups = new Map<string, NearbyPlayer[]>();

  players.forEach((player) => {
    const key = coordinateKey(player.coordinate);
    const group = groups.get(key) ?? [];
    group.push(player);
    groups.set(key, group);
  });

  const displayCoordinateByUid = new Map<string, Coordinates>();

  groups.forEach((group) => {
    if (group.length === 1) {
      return;
    }

    const sortedGroup = [...group].sort((left, right) =>
      left.uid.localeCompare(right.uid)
    );
    const latitude = sortedGroup[0].coordinate.latitude;
    const radiusMetres =
      OVERLAPPING_MARKER_SEPARATION_METRES /
      (2 * Math.sin(Math.PI / sortedGroup.length));
    const latitudeRadius = radiusMetres / METRES_PER_LATITUDE_DEGREE;
    const longitudeRadius =
      radiusMetres /
      (METRES_PER_LATITUDE_DEGREE *
        Math.max(Math.cos((latitude * Math.PI) / 180), 0.01));

    sortedGroup.forEach((player, index) => {
      const angle = (2 * Math.PI * index) / sortedGroup.length - Math.PI / 2;

      displayCoordinateByUid.set(player.uid, {
        latitude: player.coordinate.latitude + latitudeRadius * Math.sin(angle),
        longitude:
          player.coordinate.longitude + longitudeRadius * Math.cos(angle)
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
