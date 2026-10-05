import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CutCornerButton } from "../../components/CutCornerButton";
import { CutCornerSurface } from "../../components/CutCornerSurface";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusTag } from "../../components/StatusTag";
import { colors, fonts } from "../../theme/tokens";
import {
  AccelerometerRaiseMonitor,
  type RaiseMonitorStartResult
} from "./accelerometerRaiseMonitor";
import { RAISE_GESTURE_SPEC } from "./gestureSpec";
import { PitchMonitor, type PitchCalibration } from "./pitchMonitor";

// ponytail: fixed settle delay before sampling theta_ready, so the
// 20ms-interval DeviceMotion listener has at least one reading in. Replace
// with a first-sample promise if this proves flaky on real devices.
const PITCH_SETTLE_DELAY_MS = 100;

type CalibrationStatus =
  | "idle"
  | "listening"
  | "passed"
  | "permissionDenied"
  | "unavailable"
  | "error";

type DrawCalibrationScreenProps = {
  onComplete: (calibration: PitchCalibration) => void;
};

const statusCopy: Record<CalibrationStatus, string> = {
  idle: "Hold your phone down at your side, then start the test.",
  listening: "Draw now — raise your phone smoothly into the duel pose.",
  passed: "Draw detected. Your phone is ready for a duel.",
  permissionDenied:
    "Motion access is disabled. Enable it in device settings and retry.",
  unavailable: "This device does not report an available accelerometer.",
  error: "Motion detection could not start. Check device settings and retry."
};

export function DrawCalibrationScreen({
  onComplete
}: DrawCalibrationScreenProps) {
  const [status, setStatus] = useState<CalibrationStatus>("idle");
  const monitorRef = useRef<AccelerometerRaiseMonitor | null>(null);
  const pitchMonitorRef = useRef<PitchMonitor | null>(null);
  const calibrationRef = useRef<PitchCalibration | null>(null);

  useEffect(
    () => () => {
      monitorRef.current?.stop();
      pitchMonitorRef.current?.stop();
    },
    []
  );

  const startCalibration = async () => {
    monitorRef.current?.stop();
    pitchMonitorRef.current?.stop();
    setStatus("listening");

    const pitchMonitor = new PitchMonitor();
    pitchMonitorRef.current = pitchMonitor;
    let thetaReady: number | null = null;

    const monitor = new AccelerometerRaiseMonitor(() => {
      monitor.stop();
      const thetaShoulder = pitchMonitor.currentTheta();
      pitchMonitor.stop();
      if (thetaReady === null || thetaShoulder === null) {
        setStatus("error");
        return;
      }
      calibrationRef.current = { thetaReady, thetaShoulder };
      setStatus("passed");
    });
    monitorRef.current = monitor;

    try {
      const pitchResult = await pitchMonitor.start();
      if (pitchResult !== "started") {
        setStatus(pitchResult);
        return;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, PITCH_SETTLE_DELAY_MS)
      );
      thetaReady = pitchMonitor.currentTheta();
      if (thetaReady === null) {
        pitchMonitor.stop();
        setStatus("error");
        return;
      }

      const result: RaiseMonitorStartResult = await monitor.start();
      if (result !== "started") {
        pitchMonitor.stop();
        setStatus(result);
      }
    } catch {
      monitor.stop();
      pitchMonitor.stop();
      setStatus("error");
    }
  };

  const handleContinue = () => {
    if (calibrationRef.current) {
      onComplete(calibrationRef.current);
    }
  };

  const buttonLabel =
    status === "passed"
      ? "Continue"
      : status === "listening"
        ? "Listening"
        : status === "idle"
          ? "Start test"
          : "Retry";

  return (
    <View style={styles.screen}>
      <ScreenHeader
        kicker="Draw calibration"
        subtitle="Complete one clean raise so Pocket Draw can verify motion detection before the match."
        title="Test your draw"
      />

      <CutCornerSurface style={styles.instructionCard}>
        <View style={styles.stepRow}>
          <Text style={styles.stepNumber}>01</Text>
          <Text style={styles.stepText}>Hold the phone down at your side.</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stepRow}>
          <Text style={styles.stepNumber}>02</Text>
          <Text style={styles.stepText}>
            Raise it firmly in front of you when listening starts.
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
          {status === "passed" ? "Calibration passed" : status}
        </StatusTag>
        <Text style={styles.statusText}>{statusCopy[status]}</Text>
        <Text style={styles.thresholdText}>
          {RAISE_GESTURE_SPEC.accelerationThresholdG.toFixed(1)}g /{" "}
          {RAISE_GESTURE_SPEC.minimumDurationMs}ms
        </Text>
      </View>

      <View style={styles.actions}>
        <CutCornerButton
          disabled={status === "listening"}
          label={buttonLabel}
          onPress={status === "passed" ? handleContinue : startCalibration}
        />
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
  thresholdText: {
    color: colors.textMuted30,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 12,
    textTransform: "uppercase"
  },
  actions: {
    marginTop: "auto",
    paddingTop: 32
  }
});
