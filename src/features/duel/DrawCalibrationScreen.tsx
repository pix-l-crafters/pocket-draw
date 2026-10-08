import * as Haptics from "expo-haptics";
import { Accelerometer } from "expo-sensors";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CutCornerButton } from "../../components/CutCornerButton";
import { CutCornerSurface } from "../../components/CutCornerSurface";
import { PermissionNotice } from "../../components/PermissionNotice";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusTag } from "../../components/StatusTag";
import { useForegroundRecheck } from "../../lib/useForegroundRecheck";
import { colors, fonts } from "../../theme/tokens";
import { isTopEdgeDown, isTopEdgeForward, PoseHold } from "./calibrationPose";
import { PitchMonitor, type PitchCalibration } from "./pitchMonitor";

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
  clockCalibrationStatus: "calibrating" | "ready" | "failed";
  onRetryClockCalibration: () => void;
};

const statusCopy: Record<CalibrationStatus, string> = {
  idle: "Start calibration, then hold each pose steady for two seconds.",
  starting: "Checking motion access.",
  ready: "Point the phone's top edge down and hold still for two seconds.",
  shoulder:
    "Point the phone's top edge forward at shoulder height and hold still for two seconds.",
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
  const [status, setStatus] = useState<CalibrationStatus>("idle");
  const pitchMonitorRef = useRef<PitchMonitor | null>(null);
  const accelerometerRef = useRef<{ remove(): void } | null>(null);
  const holdRef = useRef(new PoseHold());
  const stageRef = useRef<"ready" | "shoulder" | "passed">("ready");
  const thetaReadyRef = useRef<number | null>(null);
  const calibrationRef = useRef<PitchCalibration | null>(null);

  useEffect(
    () => () => {
      pitchMonitorRef.current?.stop();
      pitchMonitorRef.current = null;
      accelerometerRef.current?.remove();
      accelerometerRef.current = null;
    },
    []
  );

  const startCalibration = useCallback(async () => {
    pitchMonitorRef.current?.stop();
    accelerometerRef.current?.remove();
    accelerometerRef.current = null;
    holdRef.current.reset();
    stageRef.current = "ready";
    thetaReadyRef.current = null;
    calibrationRef.current = null;
    setStatus("starting");

    const pitchMonitor = new PitchMonitor();
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
        const theta = pitchMonitor.currentTheta();
        const valid =
          stage === "ready"
            ? isTopEdgeDown(x, y, z)
            : isTopEdgeForward(x, y, z) &&
              thetaReadyRef.current !== null &&
              theta !== null &&
              Math.abs(theta - thetaReadyRef.current) >=
                MIN_CALIBRATION_ARC_RAD;
        if (!holdRef.current.sample(valid, theta, Date.now()) || theta === null)
          return;
        holdRef.current.reset();
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        if (stage === "ready") {
          thetaReadyRef.current = theta;
          stageRef.current = "shoulder";
          setStatus("shoulder");
        } else {
          calibrationRef.current = {
            thetaReady: thetaReadyRef.current!,
            thetaShoulder: theta
          };
          stageRef.current = "passed";
          accelerometerRef.current?.remove();
          accelerometerRef.current = null;
          pitchMonitor.stop();
          setStatus("passed");
        }
      });
      setStatus("ready");
    } catch {
      if (pitchMonitorRef.current === pitchMonitor) {
        pitchMonitor.stop();
        setStatus("error");
      }
    }
  }, []);

  const recheckMotion = useCallback(() => {
    if (status === "permissionDenied") void startCalibration();
  }, [startCalibration, status]);
  useForegroundRecheck(recheckMotion);

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
        : status === "ready" || status === "shoulder"
          ? null
          : status === "idle"
            ? "Start calibration"
            : "Retry";

  return (
    <View style={styles.screen}>
      <ScreenHeader
        kicker="Draw calibration"
        subtitle="Hold each guided pose for two seconds so Pocket Draw can judge your aim."
        title="Calibrate your draw"
      />

      <CutCornerSurface style={styles.instructionCard}>
        <View style={styles.stepRow}>
          <Text style={styles.stepNumber}>
            {status === "shoulder" || status === "passed" ? "✓" : "01"}
          </Text>
          <Text style={styles.stepText}>
            <Text style={styles.poseSketch}>▯ ↓ </Text>Phone down at your side,
            top edge toward the ground.
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stepRow}>
          <Text style={styles.stepNumber}>
            {status === "passed" ? "✓" : "02"}
          </Text>
          <Text style={styles.stepText}>
            <Text style={styles.poseSketch}>▱ → </Text>Phone at shoulder height,
            top edge pointing forward.
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
        <Text style={styles.statusText}>{statusCopy[status]}</Text>
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
  poseSketch: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 22
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
