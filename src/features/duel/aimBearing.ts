import type { Coordinates } from "../map/types/map.types";
import type { ShotClassification } from "./pitchZoneClassifier";

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
  shot: ShotClassification,
  heading: number | null | undefined,
  self: AimPosition | null | undefined,
  opponent: AimPosition | null | undefined
): ShotClassification {
  if (shot.zone === "miss") return shot;
  if (
    typeof heading !== "number" ||
    !Number.isFinite(heading) ||
    heading < 0 ||
    heading >= 360 ||
    !isUsableAimPosition(self) ||
    !isUsableAimPosition(opponent)
  )
    return { zone: "miss", missReason: "trackingUnavailable" };

  const geometry = aimGeometry(heading, self, opponent);
  if (!geometry) return { zone: "miss", missReason: "trackingUnavailable" };
  if (geometry.bypassedWithinGpsUncertainty) return shot;
  if (geometry.headingErrorDegrees === null)
    return { zone: "miss", missReason: "trackingUnavailable" };
  return geometry.headingErrorDegrees <= AIM_TOLERANCE_DEGREES
    ? shot
    : { zone: "miss", missReason: "offTarget" };
}

export function aimGeometry(
  heading: number | null,
  self: AimPosition | null,
  opponent: AimPosition | null
) {
  if (!isUsableAimPosition(self) || !isUsableAimPosition(opponent)) return null;
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
  const haversine =
    Math.sin((opponentLatitude - latitude) / 2) ** 2 +
    Math.cos(latitude) *
      Math.cos(opponentLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;
  const separation =
    2 * 6_371_000 * Math.asin(Math.sqrt(Math.min(1, haversine)));
  // A few paces is usually inside phone GPS uncertainty. The bearing cannot
  // verify aim there, so keep the calibrated pitch result.
  const bypassedWithinGpsUncertainty =
    separation <= self.accuracy + opponent.accuracy;
  // Coincident and antipodal points have no unique initial bearing.
  const bearingDegrees =
    Math.hypot(x, y) < 1e-12 ? null : (Math.atan2(y, x) / radians + 360) % 360;
  const headingErrorDegrees =
    bearingDegrees !== null &&
    heading !== null &&
    Number.isFinite(heading) &&
    heading >= 0 &&
    heading < 360
      ? Math.abs(((heading - bearingDegrees + 540) % 360) - 180)
      : null;
  return {
    bearingDegrees,
    headingErrorDegrees,
    separationMeters: separation,
    bypassedWithinGpsUncertainty
  };
}
