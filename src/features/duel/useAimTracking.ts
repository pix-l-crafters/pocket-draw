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
import { useForegroundRecheck } from "../../lib/useForegroundRecheck";
import {
  classifyAimZone,
  isUsableAimPosition,
  type AimPosition
} from "./aimBearing";
import type { ShotClassification } from "./pitchZoneClassifier";

type TimedPosition = AimPosition & { accuracy: number; timestamp: number };
type TimedHeading = { value: number; timestamp: number };

export function useAimTracking(
  channel: DuelChannel,
  clockOffsetMs: number
): (shot: ShotClassification) => ShotClassification {
  const self = useRef<TimedPosition | null>(null);
  const opponent = useRef<TimedPosition | null>(null);
  const heading = useRef<TimedHeading | null>(null);
  const clockOffsetRef = useRef(clockOffsetMs);
  clockOffsetRef.current = clockOffsetMs;
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
              reading.accuracy === 3
                ? { value: reading.trueHeading, timestamp: Date.now() }
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
    if (shot.zone === "miss") return shot;
    const now = Date.now();
    const selfPosition = self.current;
    const opponentPosition = opponent.current;
    const compass = heading.current;
    const opponentAgeMs = opponentPosition
      ? now - (opponentPosition.timestamp - clockOffsetRef.current)
      : NaN;
    if (
      !selfPosition ||
      !opponentPosition ||
      !compass ||
      now < compass.timestamp ||
      now - compass.timestamp > 2000 ||
      now < selfPosition.timestamp ||
      now - selfPosition.timestamp > 5000 ||
      !Number.isFinite(clockOffsetRef.current) ||
      !Number.isFinite(opponentAgeMs) ||
      opponentAgeMs < 0 ||
      opponentAgeMs > 5000
    )
      return { zone: "miss", missReason: "trackingUnavailable" };
    return classifyAimZone(shot, compass.value, selfPosition, opponentPosition);
  }, []);
}
