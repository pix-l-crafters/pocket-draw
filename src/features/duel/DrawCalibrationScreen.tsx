import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Accelerometer } from "expo-sensors";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";

import { CutCornerButton } from "../../components/CutCornerButton";
import { CutCornerSurface } from "../../components/CutCornerSurface";
import { PermissionNotice } from "../../components/PermissionNotice";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusTag } from "../../components/StatusTag";
import type { CalibrationPoseSnapshot } from "../../contracts/matchAnalytics";
import { useForegroundRecheck } from "../../lib/useForegroundRecheck";
import { colors, fonts } from "../../theme/tokens";
import { isTopEdgeDown, isTopEdgeForward, PoseHold } from "./calibrationPose";
import { PitchMonitor, type PitchCalibration } from "./pitchMonitor";
import { PoseIllustration } from "./PoseIllustration";
import { PoseProximityFeedback } from "./poseProximityFeedback";
import { subscribeVolumeFire } from "./volumeFireTrigger";

const MIN_CALIBRATION_ARC_RAD = 0.05;
const MAX_CONFIRM_SAMPLE_AGE_MS = 350;
const MIN_POSE_TEXT_WIDTH = 140;

type TiltReading = { x: number; y: number; z: number; atMs: number };

type CalibrationStatus =
  | "idle"
  | "starting"
  | "ready"
  | "shoulder"
  | "passed"
  | "permissionDenied"
  | "unavailable"
  | "error";

type DrawCalibrationScreenProps = {
  onComplete: (calibration: PitchCalibration) => void;
  clockCalibrationStatus: "calibrating" | "ready" | "failed";
  onRetryClockCalibration: () => void;
};

const statusCopy: Record<CalibrationStatus, string> = {
  idle: "Start calibration, then hold steady or press volume up for each pose.",
  starting: "Checking motion access.",
  ready: "Point the top edge down. Hold steady or press volume up.",
  shoulder:
    "Point the top edge forward at shoulder height. Hold steady or press volume up.",
  passed: "Both poses complete. Your phone is ready for a duel.",
  permissionDenied:
    "Motion access is disabled, so your aim can't be calibrated.",
  unavailable: "This device does not report available device motion.",
  error: "Motion detection could not start. Check device settings and retry."
};

const statusLabels: Record<CalibrationStatus, string> = {
  idle: "Not started",
  starting: "Starting motion",
  ready: "Ready pose",
  shoulder: "Shoulder pose",
  passed: "Calibration passed",
  permissionDenied: "Motion denied",
  unavailable: "Motion unavailable",
  error: "Motion error"
};

export function DrawCalibrationScreen({
  onComplete,
  clockCalibrationStatus,
  onRetryClockCalibration
}: DrawCalibrationScreenProps) {
  const { fontScale } = useWindowDimensions();
  const poseTextLayout = { flexBasis: MIN_POSE_TEXT_WIDTH * fontScale };
  const confirmationAudio = useAudioPlayer(
    require("../../../assets/audio/pose-confirmation.wav")
  );
  const proximityFeedback = useMemo(
    () =>
      new PoseProximityFeedback((band) => {
        void Haptics.impactAsync(
          band === "far"
            ? Haptics.ImpactFeedbackStyle.Heavy
            : Haptics.ImpactFeedbackStyle.Light
        ).catch(() => undefined);
      }),
    []
  );
  const [status, setStatus] = useState<CalibrationStatus>("idle");
  const [poseHint, setPoseHint] = useState<string | null>(null);
  const pitchMonitorRef = useRef<PitchMonitor | null>(null);
  const accelerometerRef = useRef<{ remove(): void } | null>(null);
  const latestTiltRef = useRef<TiltReading | null>(null);
  const holdRef = useRef(new PoseHold());
  const stageRef = useRef<"ready" | "shoulder" | "passed">("ready");
  const thetaReadyRef = useRef<number | null>(null);
  const readyPoseRef = useRef<CalibrationPoseSnapshot | null>(null);
  const calibrationRef = useRef<PitchCalibration | null>(null);
  const appActiveRef = useRef(AppState.currentState === "active");

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      appActiveRef.current = state === "active";
      if (!appActiveRef.current) proximityFeedback.stop();
    });
    return () => subscription.remove();
  }, [proximityFeedback]);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);

  const matchesPose = useCallback(
    (stage: "ready" | "shoulder", tilt: TiltReading, theta: number | null) =>
      theta !== null &&
      (stage === "ready"
        ? isTopEdgeDown(tilt.x, tilt.y, tilt.z)
        : isTopEdgeForward(tilt.x, tilt.y, tilt.z) &&
          thetaReadyRef.current !== null &&
          Math.abs(theta - thetaReadyRef.current) >= MIN_CALIBRATION_ARC_RAD),
    []
  );

  const completePose = useCallback(
    (theta: number, confirmation: "hold" | "volume" = "hold") => {
      const stage = stageRef.current;
      if (stage === "passed") return;
      holdRef.current.reset();
      setPoseHint(null);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => undefined);
      try {
        void confirmationAudio.seekTo(0).catch(() => undefined);
      } catch {
        // A failed seek still allows the short cue to play.
      }
      try {
        confirmationAudio.play();
      } catch {
        // Audio is supplementary; a failed sound must not block calibration.
      }
      const snapshot: CalibrationPoseSnapshot = {
        capturedAtMs: Date.now(),
        confirmation,
        accelerometer: latestTiltRef.current
          ? { ...latestTiltRef.current }
          : null,
        motion: pitchMonitorRef.current?.snapshot() ?? null
      };
      if (stage === "ready") {
        thetaReadyRef.current = theta;
        readyPoseRef.current = snapshot;
        stageRef.current = "shoulder";
        setStatus("shoulder");
      } else {
        calibrationRef.current = {
          thetaReady: thetaReadyRef.current!,
          thetaShoulder: theta,
          readyPose: readyPoseRef.current!,
          shoulderPose: snapshot
        };
        stageRef.current = "passed";
        proximityFeedback.stop();
        accelerometerRef.current?.remove();
        accelerometerRef.current = null;
        pitchMonitorRef.current?.stop();
        setStatus("passed");
      }
    },
    [confirmationAudio, proximityFeedback]
  );

  useEffect(
    () => () => {
      pitchMonitorRef.current?.stop();
      pitchMonitorRef.current = null;
      proximityFeedback.dispose();
      accelerometerRef.current?.remove();
      accelerometerRef.current = null;
    },
    [proximityFeedback]
  );

  const startCalibration = useCallback(async () => {
    pitchMonitorRef.current?.stop();
    proximityFeedback.stop();
    accelerometerRef.current?.remove();
    accelerometerRef.current = null;
    latestTiltRef.current = null;
    holdRef.current.reset();
    stageRef.current = "ready";
    thetaReadyRef.current = null;
    readyPoseRef.current = null;
    calibrationRef.current = null;
    setPoseHint(null);
    setStatus("starting");

    const pitchMonitor = new PitchMonitor((theta) => {
      const thetaReady = thetaReadyRef.current;
      if (thetaReady !== null && appActiveRef.current) {
        proximityFeedback.update(
          theta === null ? null : Math.abs(theta - thetaReady),
          MIN_CALIBRATION_ARC_RAD
        );
      }
    });
    pitchMonitorRef.current = pitchMonitor;
    const result = await pitchMonitor.start();
    if (pitchMonitorRef.current !== pitchMonitor || result === "cancelled") {
      return;
    }
    if (result !== "started") {
      setStatus(result);
      return;
    }
    try {
      let permission = await Accelerometer.getPermissionsAsync();
      if (!permission.granted && permission.canAskAgain) {
        permission = await Accelerometer.requestPermissionsAsync();
      }
      if (pitchMonitorRef.current !== pitchMonitor) return;
      if (!permission.granted) {
        pitchMonitor.stop();
        setStatus("permissionDenied");
        return;
      }
      Accelerometer.setUpdateInterval(100);
      accelerometerRef.current = Accelerometer.addListener(({ x, y, z }) => {
        const stage = stageRef.current;
        if (stage === "passed") return;
        const tilt = { x, y, z, atMs: Date.now() };
        latestTiltRef.current = tilt;
        const theta = pitchMonitor.currentTheta(MAX_CONFIRM_SAMPLE_AGE_MS);
        const valid = matchesPose(stage, tilt, theta);
        if (!holdRef.current.sample(valid, theta, tilt.atMs) || theta === null)
          return;
        completePose(theta);
      });
      setStatus("ready");
    } catch {
      if (pitchMonitorRef.current === pitchMonitor) {
        pitchMonitor.stop();
        setStatus("error");
      }
    }
  }, [completePose, matchesPose, proximityFeedback]);
  const handleContinue = useCallback(() => {
    if (status === "passed" && calibrationRef.current) {
      onComplete(calibrationRef.current);
    }
  }, [onComplete, status]);

  useEffect(() => {
    if (
      (status !== "ready" && status !== "shoulder" && status !== "passed") ||
      (Platform.OS !== "android" && Platform.OS !== "ios")
    )
      return undefined;
    return subscribeVolumeFire(({ direction }) => {
      if (direction !== "up") return;
      const stage = stageRef.current;
      if (stage === "passed") {
        handleContinue();
        return;
      }
      const tilt = latestTiltRef.current;
      const ageMs = tilt ? Date.now() - tilt.atMs : Number.POSITIVE_INFINITY;
      const theta =
        pitchMonitorRef.current?.currentTheta(MAX_CONFIRM_SAMPLE_AGE_MS) ??
        null;
      if (
        !tilt ||
        ageMs < 0 ||
        ageMs > MAX_CONFIRM_SAMPLE_AGE_MS ||
        !matchesPose(stage, tilt, theta) ||
        theta === null
      ) {
        setPoseHint(
          stage === "ready"
            ? "Point the top edge down first."
            : "Point the top edge forward and raise the phone from ready first."
        );
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }
      completePose(theta, "volume");
    });
  }, [status, completePose, handleContinue, matchesPose]);

  const recheckMotion = useCallback(() => {
    if (status === "permissionDenied") void startCalibration();
  }, [startCalibration, status]);
  useForegroundRecheck(recheckMotion);

  const buttonLabel =
    status === "passed"
      ? "Continue"
      : status === "starting"
        ? "Starting motion"
        : status === "ready" || status === "shoulder"
          ? null
          : status === "idle"
            ? "Start calibration"
            : "Retry";

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={styles.screen}
      testID="draw-calibration-scroll"
    >
      <ScreenHeader
        kicker="Draw calibration"
        subtitle="Hold each guided pose for two seconds or press volume up. Press volume up to continue."
        title="Calibrate your draw"
      />

      <CutCornerSurface style={styles.instructionCard}>
        <View style={styles.stepRow}>
          <View style={styles.stepVisual}>
            <Text style={styles.stepNumber}>
              {status === "shoulder" || status === "passed" ? "✓" : "01"}
            </Text>
            <PoseIllustration
              active={status === "ready"}
              pose="ready"
            />
          </View>
          <Text style={[styles.stepText, poseTextLayout]}>
            Phone down at your side, top edge toward the ground.
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stepRow}>
          <View style={styles.stepVisual}>
            <Text style={styles.stepNumber}>
              {status === "passed" ? "✓" : "02"}
            </Text>
            <PoseIllustration
              active={status === "shoulder"}
              pose="shoulder"
            />
          </View>
          <Text style={[styles.stepText, poseTextLayout]}>
            Phone at shoulder height, top edge pointing forward.
          </Text>
        </View>
      </CutCornerSurface>

      <View
        accessibilityLiveRegion="polite"
        style={[
          styles.statusPanel,
          status === "passed" && styles.statusPanelPassed
        ]}
      >
        <StatusTag tone={status === "passed" ? "success" : "muted"}>
          {statusLabels[status]}
        </StatusTag>
        <Text style={styles.statusText}>{poseHint ?? statusCopy[status]}</Text>
      </View>

      <View
        accessibilityLiveRegion="polite"
        style={styles.clockRow}
      >
        <Text style={styles.clockText}>
          Clock:{" "}
          {clockCalibrationStatus === "ready"
            ? "✓ calibrated"
            : clockCalibrationStatus === "failed"
              ? "calibration failed"
              : "calibrating…"}
        </Text>
        {clockCalibrationStatus === "failed" && (
          <CutCornerButton
            label="Retry clock"
            onPress={onRetryClockCalibration}
          />
        )}
      </View>

      <View style={styles.actions}>
        {status === "permissionDenied" ? (
          <PermissionNotice
            canAskAgain={false}
            capability="Motion"
            message="Pocket Draw uses motion sensors to capture your poses and judge your aim. Motion access is required for a duel."
            onRetry={() => void startCalibration()}
          />
        ) : buttonLabel ? (
          <CutCornerButton
            disabled={status === "starting"}
            label={buttonLabel}
            onPress={status === "passed" ? handleContinue : startCalibration}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    flexGrow: 1,
    padding: 24
  },
  instructionCard: {
    marginTop: 22,
    padding: 20
  },
  stepRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16
  },
  stepVisual: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16
  },
  stepNumber: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1
  },
  stepText: {
    color: colors.text,
    flexGrow: 1,
    // Cap width instead of shrinking so Yoga keeps the basis when wrapping.
    maxWidth: "100%",
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22
  },
  clockRow: {
    marginTop: 16
  },
  clockText: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: 18
  },
  statusPanel: {
    borderColor: colors.borderStrong,
    borderLeftWidth: 2,
    marginTop: 24,
    paddingLeft: 16,
    paddingVertical: 4
  },
  statusPanelPassed: {
    borderColor: colors.success
  },
  statusText: {
    color: colors.textMuted60,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 8
  },
  actions: {
    marginTop: "auto",
    paddingTop: 32
  }
});
