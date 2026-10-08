import type { Zone } from "../../contracts/roundOutcome";
import type { Coordinates } from "../map/types/map.types";

// Hardware/playtesting knob: an inclusive cone around the geographic bearing.
export const AIM_TOLERANCE_DEGREES = 30;

export type AimPosition = Coordinates & { accuracy: number | null };

export function isUsableAimPosition(
  position: AimPosition | null | undefined
): position is Coordinates & { accuracy: number } {
  return (
    !!position &&
    Number.isFinite(position.latitude) &&
    Math.abs(position.latitude) <= 90 &&
    Number.isFinite(position.longitude) &&
    Math.abs(position.longitude) <= 180 &&
    typeof position.accuracy === "number" &&
    Number.isFinite(position.accuracy) &&
    position.accuracy > 0
  );
}

export function classifyAimZone(
  zone: Zone,
  heading: number | null | undefined,
  self: AimPosition | null | undefined,
  opponent: AimPosition | null | undefined
): Zone {
  if (
    zone === "miss" ||
    typeof heading !== "number" ||
    !Number.isFinite(heading) ||
    heading < 0 ||
    heading >= 360 ||
    !isUsableAimPosition(self) ||
    !isUsableAimPosition(opponent)
  )
    return "miss";

  const radians = Math.PI / 180;
  const latitude = self.latitude * radians;
  const opponentLatitude = opponent.latitude * radians;
  const longitudeDifference = (opponent.longitude - self.longitude) * radians;
  const x =
    Math.cos(latitude) * Math.sin(opponentLatitude) -
    Math.sin(latitude) *
      Math.cos(opponentLatitude) *
      Math.cos(longitudeDifference);
  const y = Math.sin(longitudeDifference) * Math.cos(opponentLatitude);
  // Coincident and antipodal points have no unique initial bearing.
  if (Math.hypot(x, y) < 1e-12) return "miss";

  const haversine =
    Math.sin((opponentLatitude - latitude) / 2) ** 2 +
    Math.cos(latitude) *
      Math.cos(opponentLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;
  const separation =
    2 * 6_371_000 * Math.asin(Math.sqrt(Math.min(1, haversine)));
  if (separation <= self.accuracy + opponent.accuracy) return "miss";

  const bearing = (Math.atan2(y, x) / radians + 360) % 360;
  const difference = Math.abs(((heading - bearing + 540) % 360) - 180);
  return difference <= AIM_TOLERANCE_DEGREES ? zone : "miss";
}
