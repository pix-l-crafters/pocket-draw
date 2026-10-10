import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";

import { CutCornerButton } from "../../components/CutCornerButton";
import { CutCornerSurface } from "../../components/CutCornerSurface";
import { PermissionNotice } from "../../components/PermissionNotice";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusTag } from "../../components/StatusTag";
import { useForegroundRecheck } from "../../lib/useForegroundRecheck";
import { colors, fonts } from "../../theme/tokens";
import { PitchMonitor, type PitchCalibration } from "./pitchMonitor";
import { PoseProximityFeedback } from "./poseProximityFeedback";

const MIN_CALIBRATION_ARC_RAD = 0.05;

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
};

const statusCopy: Record<CalibrationStatus, string> = {
  idle: "Start calibration, then hold and capture each pose.",
  starting: "Checking motion access before capturing your poses.",
  ready: "Hold your phone down at your side, then capture your ready pose.",
  shoulder:
    "Hold your phone in a shoulder-height firing pose, then capture it.",
  passed: "Both poses captured. Your phone is ready for a duel.",
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
  onComplete
}: DrawCalibrationScreenProps) {
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
  const [captureError, setCaptureError] = useState<string | null>(null);
  const pitchMonitorRef = useRef<PitchMonitor | null>(null);
  const thetaReadyRef = useRef<number | null>(null);
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

  useEffect(
    () => () => {
      pitchMonitorRef.current?.stop();
      pitchMonitorRef.current = null;
      proximityFeedback.dispose();
    },
    [proximityFeedback]
  );

  const confirmPose = () => {
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
  };

  const startCalibration = useCallback(async () => {
    pitchMonitorRef.current?.stop();
    proximityFeedback.stop();
    thetaReadyRef.current = null;
    calibrationRef.current = null;
    setCaptureError(null);
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
    setStatus(result === "started" ? "ready" : result);
  }, [proximityFeedback]);

  const recheckMotion = useCallback(() => {
    if (status === "permissionDenied") void startCalibration();
  }, [startCalibration, status]);
  useForegroundRecheck(recheckMotion);

  const capturePose = () => {
    const theta = pitchMonitorRef.current?.currentTheta();
    if (typeof theta !== "number" || !Number.isFinite(theta)) {
      setCaptureError(
        "No fresh pitch reading. Hold the pose steady and try capturing again."
      );
      return;
    }

    if (status === "ready") {
      thetaReadyRef.current = theta;
      setCaptureError(null);
      setStatus("shoulder");
      confirmPose();
      return;
    }

    const thetaReady = thetaReadyRef.current;
    if (
      status !== "shoulder" ||
      thetaReady === null ||
      !Number.isFinite(thetaReady)
    ) {
      return;
    }
    if (Math.abs(theta - thetaReady) < MIN_CALIBRATION_ARC_RAD) {
      setCaptureError(
        "The poses are too similar. Move to a distinct shoulder pose and capture again."
      );
      return;
    }

    calibrationRef.current = { thetaReady, thetaShoulder: theta };
    proximityFeedback.stop();
    pitchMonitorRef.current?.stop();
    setCaptureError(null);
    setStatus("passed");
    confirmPose();
  };

  const handleContinue = () => {
    if (status === "passed" && calibrationRef.current) {
      onComplete(calibrationRef.current);
    }
  };

  const buttonLabel =
    status === "passed"
      ? "Continue"
      : status === "starting"
        ? "Starting motion"
        : status === "ready"
          ? "Capture ready pose"
          : status === "shoulder"
            ? "Capture shoulder pose"
            : status === "idle"
              ? "Start calibration"
              : "Retry";

  return (
    <View style={styles.screen}>
      <ScreenHeader
        kicker="Draw calibration"
        subtitle="Capture a ready pose and a shoulder-height firing pose so Pocket Draw can judge your aim."
        title="Calibrate your draw"
      />

      <CutCornerSurface style={styles.instructionCard}>
        <View style={styles.stepRow}>
          <Text style={styles.stepNumber}>01</Text>
          <Text style={styles.stepText}>
            Hold the phone down at your side and capture your ready pose.
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stepRow}>
          <Text style={styles.stepNumber}>02</Text>
          <Text style={styles.stepText}>
            Raise and tilt it into your shoulder-height firing pose, hold still,
            then capture your shoulder pose.
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
        <Text style={styles.statusText}>
          {captureError ?? statusCopy[status]}
        </Text>
      </View>

      <View style={styles.actions}>
        {status === "permissionDenied" ? (
          <PermissionNotice
            canAskAgain={false}
            capability="Motion"
            message="Pocket Draw uses motion sensors to capture your poses and judge your aim. Motion access is required for a duel."
            onRetry={() => void startCalibration()}
          />
        ) : (
          <CutCornerButton
            disabled={status === "starting"}
            label={buttonLabel}
            onPress={
              status === "passed"
                ? handleContinue
                : status === "ready" || status === "shoulder"
                  ? capturePose
                  : startCalibration
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    padding: 24
  },
  instructionCard: {
    marginTop: 22,
    padding: 20
  },
  stepRow: {
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
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22
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
