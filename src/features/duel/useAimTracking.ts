import {
  Accuracy,
  getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync,
  watchHeadingAsync,
  watchPositionAsync,
  type LocationSubscription
} from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";

import type { DuelChannel } from "../../contracts/duelChannel";
import type { AimDiagnostics } from "../../contracts/matchAnalytics";
import { useForegroundRecheck } from "../../lib/useForegroundRecheck";
import {
  classifyAimZone,
  aimGeometry,
  isUsableAimPosition,
  type AimPosition
} from "./aimBearing";
import type { ShotClassification } from "./pitchZoneClassifier";

type TimedPosition = AimPosition & { accuracy: number; timestamp: number };
type TimedHeading = { value: number; accuracy: number; timestamp: number };

export function useAimTracking(
  channel: DuelChannel,
  clockOffsetMs: number,
  onDiagnostics?: (diagnostics: AimDiagnostics) => void
): (shot: ShotClassification) => ShotClassification {
  const self = useRef<TimedPosition | null>(null);
  const opponent = useRef<TimedPosition | null>(null);
  const heading = useRef<TimedHeading | null>(null);
  const clockOffsetRef = useRef(clockOffsetMs);
  clockOffsetRef.current = clockOffsetMs;
  const diagnosticsRef = useRef(onDiagnostics);
  diagnosticsRef.current = onDiagnostics;
  const [trackingAttempt, setTrackingAttempt] = useState(0);
  const recheckAfterSettings = useCallback(() => {
    setTrackingAttempt((attempt) => attempt + 1);
  }, []);
  useForegroundRecheck(recheckAfterSettings);

  useEffect(() => {
    let disposed = false;
    let positionSubscription: LocationSubscription | undefined;
    let headingSubscription: LocationSubscription | undefined;
    self.current = null;
    opponent.current = null;
    heading.current = null;

    const unsubscribe = channel.onMessage((message) => {
      if (disposed || message.type !== "aimPosition") return;
      opponent.current =
        isUsableAimPosition(message) && Number.isFinite(message.sampleAtMs)
          ? {
              latitude: message.latitude,
              longitude: message.longitude,
              accuracy: message.accuracy,
              timestamp: message.sampleAtMs
            }
          : null;
    });

    const publish = () => {
      const position = self.current;
      if (disposed || !position) return;
      const ageMs = Date.now() - position.timestamp;
      if (!Number.isFinite(ageMs) || ageMs < 0) return;
      try {
        if (channel.isConnected()) {
          channel.send({
            type: "aimPosition",
            latitude: position.latitude,
            longitude: position.longitude,
            accuracy: position.accuracy,
            sampleAtMs: position.timestamp
          });
        }
      } catch {
        // A connected data channel can close between the check and the send.
      }
    };
    // Repeat the source fix timestamp unchanged for a later peer mount.
    const repeat = setInterval(publish, 1000);

    const start = async () => {
      try {
        let permission = await getForegroundPermissionsAsync();
        if (disposed) return;
        if (
          !permission.granted &&
          (permission.status === "undetermined" || permission.canAskAgain)
        ) {
          permission = await requestForegroundPermissionsAsync();
        }
        if (disposed || !permission.granted) return;

        void watchPositionAsync(
          { accuracy: Accuracy.High, timeInterval: 1000, distanceInterval: 0 },
          (reading) => {
            if (disposed) return;
            self.current = null;
            if (
              reading.mocked ||
              !isUsableAimPosition(reading.coords) ||
              !Number.isFinite(reading.timestamp) ||
              reading.timestamp > Date.now()
            )
              return;
            self.current = {
              latitude: reading.coords.latitude,
              longitude: reading.coords.longitude,
              accuracy: reading.coords.accuracy,
              timestamp: reading.timestamp
            };
            publish();
          },
          () => {
            if (!disposed) self.current = null;
          }
        )
          .then((subscription) => {
            if (disposed) subscription.remove();
            else positionSubscription = subscription;
          })
          .catch(() => {
            if (!disposed) self.current = null;
          });

        void watchHeadingAsync(
          (reading) => {
            if (disposed) return;
            // SDK54 medium calibration allows <35° uncertainty, wider than our
            // 30° aim cone. Require high calibration (<20°), never magnetic north.
            heading.current =
              Number.isFinite(reading.trueHeading) &&
              Number.isFinite(reading.accuracy)
                ? {
                    value: reading.trueHeading,
                    accuracy: reading.accuracy,
                    timestamp: Date.now()
                  }
                : null;
          },
          () => {
            if (!disposed) heading.current = null;
          }
        )
          .then((subscription) => {
            if (disposed) subscription.remove();
            else headingSubscription = subscription;
          })
          .catch(() => {
            if (!disposed) heading.current = null;
          });
      } catch {
        if (!disposed) {
          self.current = null;
          heading.current = null;
        }
      }
    };
    void start();

    return () => {
      disposed = true;
      clearInterval(repeat);
      unsubscribe();
      positionSubscription?.remove();
      headingSubscription?.remove();
      self.current = null;
      opponent.current = null;
      heading.current = null;
    };
  }, [channel, trackingAttempt]);

  return useCallback((shot: ShotClassification): ShotClassification => {
    const now = Date.now();
    const selfPosition = self.current;
    const opponentPosition = opponent.current;
    const compass = heading.current;
    const opponentAgeMs = opponentPosition
      ? now - (opponentPosition.timestamp - clockOffsetRef.current)
      : NaN;
    const issues: string[] = [];
    if (!compass) issues.push("headingMissing");
    else {
      if (compass.accuracy !== 3 || compass.value < 0 || compass.value >= 360)
        issues.push("headingUnreliable");
      if (now < compass.timestamp || now - compass.timestamp > 2000)
        issues.push("headingStale");
    }
    if (!selfPosition) issues.push("selfPositionMissing");
    else if (
      now < selfPosition.timestamp ||
      now - selfPosition.timestamp > 5000
    )
      issues.push("selfPositionStale");
    if (!opponentPosition) issues.push("opponentPositionMissing");
    else if (
      !Number.isFinite(opponentAgeMs) ||
      opponentAgeMs < 0 ||
      opponentAgeMs > 5000
    )
      issues.push("opponentPositionStale");
    if (!Number.isFinite(clockOffsetRef.current))
      issues.push("clockOffsetInvalid");
    const geometry = aimGeometry(
      compass?.value ?? null,
      selfPosition,
      opponentPosition
    );
    diagnosticsRef.current?.({
      capturedAtMs: now,
      heading: compass ? { ...compass, ageMs: now - compass.timestamp } : null,
      self: selfPosition
        ? { ...selfPosition, ageMs: now - selfPosition.timestamp }
        : null,
      opponent: opponentPosition
        ? {
            ...opponentPosition,
            ageMs: Number.isFinite(opponentAgeMs) ? opponentAgeMs : null
          }
        : null,
      bearingDegrees: geometry?.bearingDegrees ?? null,
      headingErrorDegrees: geometry?.headingErrorDegrees ?? null,
      separationMeters: geometry?.separationMeters ?? null,
      bypassedWithinGpsUncertainty:
        shot.zone !== "miss" &&
        issues.length === 0 &&
        (geometry?.bypassedWithinGpsUncertainty ?? false),
      issues
    });
    if (shot.zone === "miss") return shot;
    if (issues.length || !compass)
      return { zone: "miss", missReason: "trackingUnavailable" };
    return classifyAimZone(shot, compass.value, selfPosition, opponentPosition);
  }, []);
}
