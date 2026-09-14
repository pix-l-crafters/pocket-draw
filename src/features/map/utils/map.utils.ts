import {
  PLAYER_PIN_COLORS,
  PUBLIC_LOCATION_DECIMAL_PLACES
} from "../constants/map.constants";
import type { Coordinates } from "../types/map.types";

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

/** Picks a stable marker colour for a player from their uid. */
export function pinColorForUid(uid: string): string {
  let hash = 0;

  for (let index = 0; index < uid.length; index += 1) {
    hash = (hash * 31 + uid.charCodeAt(index)) | 0;
  }

  const bucket = Math.abs(hash) % PLAYER_PIN_COLORS.length;

  return PLAYER_PIN_COLORS[bucket];
}
