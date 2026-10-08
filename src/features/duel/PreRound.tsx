import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Accelerometer } from "expo-sensors";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, IconButton, ProgressBar } from "react-native-paper";

import type { DuelChannel, DuelMessage } from "../../contracts/duelChannel";
import { colors, fonts } from "../../theme/tokens";
import { COUNTDOWN_AUDIO_SOURCE } from "./countdownAudio";
import { FireSignalCoordinator, type DuelRole } from "./fireSignalCoordinator";
import { ReactionTimer } from "./reactionTimer";
import { FIRE_WINDOW_MS, type RoundShots } from "./roundShots";

export const SEPARATION_RSSI_THRESHOLD = -70;

const COUNTDOWN_VALUES = [3, 2, 1] as const;
const COUNTDOWN_TICK_MS = 1000;
/** Fixed 3-2-1 countdown: one second per tick, FIRE on zero. Never random. */
export const COUNTDOWN_DURATION_MS =
  COUNTDOWN_VALUES.length * COUNTDOWN_TICK_MS;
/**
 * The opponent's `raised` still has to cross the network after they tap, so
 * scoring them a miss waits a little past the window. Without the grace both
 * devices can score the same last-instant shot differently.
 */
const PEER_SHOT_GRACE_MS = 250;

export type RssiReader = () => Promise<number | null>;

export function isSeparatedByRssi(
  rssi: number | null,
  threshold = SEPARATION_RSSI_THRESHOLD
): boolean {
  return rssi !== null && rssi <= threshold;
}

export function isTopEdgeDown(x: number, y: number, z: number): boolean {
  // Expo forwards native readings; the top-edge-down Y sign differs by OS.
  const topEdgePointsDown =
    (Platform.OS === "ios" && y > 0.75) ||
    (Platform.OS === "android" && y < -0.75);
  return topEdgePointsDown && Math.abs(x) < 0.35 && Math.abs(z) < 0.35;
}

type Phase =
  | "separate"
  | "position"
  | "waiting"
  | "countdown"
  | "fire"
  | "done";

type PreRoundProps = {
  channel: DuelChannel;
  readRssi: RssiReader;
  /** The host owns the countdown and the FIRE signal; the guest follows. */
  role: DuelRole;
  /** True once the opponent has finished their own pre-round ritual. */
  peerReady: boolean;
  clockCalibrationStatus: "calibrating" | "ready" | "failed";
  clockOffsetMs: number;
  onRetryClockCalibration: () => void;
  onCountdownStart: () => void;
  onRoundShots: (shots: RoundShots) => void;
};

export function PreRound({
  channel,
  readRssi,
  role,
  peerReady,
  clockCalibrationStatus,
  clockOffsetMs,
  onRetryClockCalibration,
  onCountdownStart,
  onRoundShots
}: PreRoundProps) {
  const countdownAudio = useAudioPlayer(COUNTDOWN_AUDIO_SOURCE);
  const [phase, setPhase] = useState<Phase>("separate");
  const [rssi, setRssi] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [topEdgeDown, setTopEdgeDown] = useState(false);
  const [selfReactionMs, setSelfReactionMs] = useState<number | null>(null);
  const [opponentReactionMs, setOpponentReactionMs] = useState<number | null>(
    null
  );
  const [audioMuted, setAudioMuted] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const reactionTimerRef = useRef(new ReactionTimer());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const firedAtRef = useRef(0);
  const reportedRef = useRef(false);

  // Timers and the message handler both read this, and neither sees a state
  // value captured on a later render.
  const audioMutedRef = useRef(audioMuted);
  audioMutedRef.current = audioMuted;

  const isHost = role === "host";

  // Countdown timers fire up to ~3s after the first tick. Without this, leaving
  // the duel mid-countdown sends on a closed channel and throws inside
  // setTimeout, which React Native surfaces as a crash rather than an error.
  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    },
    []
  );

  const later = (handler: () => void, delayMs: number) => {
    timersRef.current.push(setTimeout(handler, delayMs));
  };

  // A dropped peer makes `send` throw; inside a timer that would be an
  // unhandled crash, so surface it as a visible state instead.
  const safeSend = (message: DuelMessage) => {
    try {
      channel.send(message);
      return true;
    } catch {
      setSendError("Lost the connection to your opponent.");
      return false;
    }
  };

  const playCountdownAudio = () => {
    if (!COUNTDOWN_AUDIO_SOURCE || audioMutedRef.current) return;
    countdownAudio.seekTo(0);
    countdownAudio.play();
  };

  const showTick = (value: number) => {
    playCountdownAudio();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCountdown(value);
  };

  const fireCoordinator = useMemo(
    () =>
      new FireSignalCoordinator(channel, role, Date.now, () => clockOffsetMs),
    [channel, clockOffsetMs, role]
  );
  useEffect(() => () => fireCoordinator.dispose(), [fireCoordinator]);

  // Both roles receive a FIRE timestamp in their own clock domain.
  useEffect(
    () =>
      fireCoordinator.onFire((signal) => {
        firedAtRef.current = signal.atMs;
        reactionTimerRef.current.start(signal.atMs);
        setCountdown(0);
        setPhase("fire");
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      }),
    [fireCoordinator]
  );

  useEffect(() => {
    let mounted = true;
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      if (mounted) setTopEdgeDown(isTopEdgeDown(x, y, z));
    });
    Accelerometer.setUpdateInterval(150);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // The countdown cue must be audible even with the iOS silent switch on —
    // haptic strength alone varies too much across devices to be fair timing.
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  useEffect(() => {
    return channel.onMessage((message: DuelMessage) => {
      if (message.type === "countdown") {
        setPhase((current) => (current === "fire" ? current : "countdown"));
        showTick(message.value);
      }
      if (message.type === "raised") {
        setOpponentReactionMs(message.reactionMs);
      }
    });
  }, [channel]);

  useEffect(() => {
    if (phase !== "separate") return undefined;
    let mounted = true;
    const poll = async () => {
      const nextRssi = await readRssi();
      if (mounted) setRssi(nextRssi);
    };
    void poll();
    const interval = setInterval(() => void poll(), 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [phase, readRssi]);

  // Both shots in, or the window closed: the round is decided either way.
  useEffect(() => {
    if (phase !== "fire") return undefined;

    const report = () => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      setPhase("done");
      onRoundShots({ selfReactionMs, opponentReactionMs });
    };

    if (selfReactionMs !== null && opponentReactionMs !== null) {
      report();
      return undefined;
    }

    const deadline = firedAtRef.current + FIRE_WINDOW_MS + PEER_SHOT_GRACE_MS;
    const timer = setTimeout(report, Math.max(0, deadline - Date.now()));
    return () => clearTimeout(timer);
  }, [onRoundShots, opponentReactionMs, phase, selfReactionMs]);

  const handleFire = () => {
    if (selfReactionMs !== null) return;
    if (Date.now() > firedAtRef.current + FIRE_WINDOW_MS) return;

    const capture = reactionTimerRef.current.captureRaise(Date.now());
    if (!capture) return;

    setSelfReactionMs(capture.reactionMs);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    safeSend({
      type: "raised",
      atMs: capture.raisedAtMs,
      reactionMs: capture.reactionMs
    });
  };

  const separated = isSeparatedByRssi(rssi);

  const startCountdown = () => {
    if (!safeSend({ type: "countdown", value: COUNTDOWN_VALUES[0] })) return;
    onCountdownStart();
    setPhase("countdown");
    showTick(COUNTDOWN_VALUES[0]);

    COUNTDOWN_VALUES.slice(1).forEach((value, index) => {
      later(
        () => {
          if (!safeSend({ type: "countdown", value })) return;
          showTick(value);
        },
        (index + 1) * COUNTDOWN_TICK_MS
      );
    });

    later(() => {
      try {
        fireCoordinator.markCountdownComplete();
        fireCoordinator.triggerFire();
      } catch {
        setSendError("Lost the connection to your opponent.");
      }
    }, COUNTDOWN_DURATION_MS);
  };

  const advance = () => {
    if (phase === "separate" && separated) {
      setPhase("position");
      return;
    }
    if (phase !== "position" || !topEdgeDown) return;

    if (isHost) {
      startCountdown();
      return;
    }

    if (!safeSend({ type: "ready" })) return;
    setPhase("waiting");
  };

  const confirmDisabled =
    phase === "separate" ? !separated : !topEdgeDown || (isHost && !peerReady);

  const status = useMemo(() => {
    if (phase === "separate")
      return separated ? "DISTANCE CONFIRMED" : "MOVE FURTHER APART";
    if (phase === "position") {
      if (!topEdgeDown) return "POINT THE TOP EDGE TOWARD THE GROUND";
      return isHost && !peerReady
        ? "WAITING FOR YOUR OPPONENT"
        : "PHONE POSITION CONFIRMED";
    }
    if (phase === "waiting") return "WAITING FOR THE DRAW";
    if (phase === "countdown") return "GET READY";
    return "DRAW!";
  }, [isHost, peerReady, phase, separated, topEdgeDown]);

  return (
    <View style={styles.container}>
      <IconButton
        accessibilityLabel={
          audioMuted ? "Turn countdown sound on" : "Mute countdown sound"
        }
        icon={audioMuted ? "volume-off" : "volume-high"}
        iconColor={colors.textMuted60}
        onPress={() => setAudioMuted((muted) => !muted)}
        style={styles.muteButton}
      />
      <Text style={styles.kicker}>PRE-ROUND RITUAL</Text>
      <Text style={styles.heading}>
        {clockCalibrationStatus === "ready"
          ? (sendError ?? status)
          : clockCalibrationStatus === "failed"
            ? "CLOCK CALIBRATION FAILED"
            : "CALIBRATING CLOCKS"}
      </Text>
      <Text style={styles.detail}>
        {clockCalibrationStatus === "failed"
          ? "Check the connection to your opponent, then retry before the duel."
          : clockCalibrationStatus === "calibrating"
            ? "Synchronizing both players’ clocks before timed play."
            : phase === "separate" &&
              `BLE signal: ${rssi === null ? "—" : `${rssi} dBm`}`}
        {clockCalibrationStatus === "ready" &&
          phase === "position" &&
          (isHost
            ? "Point both phones' top edges toward the ground. You start the countdown."
            : "Point your phone's top edge toward the ground, then confirm.")}
        {clockCalibrationStatus === "ready" &&
          phase === "waiting" &&
          "The countdown starts when the host is ready."}
        {clockCalibrationStatus === "ready" &&
          phase === "countdown" &&
          (countdown ? `${countdown}` : "")}
      </Text>
      {clockCalibrationStatus === "failed" && (
        <Button
          mode="contained"
          onPress={onRetryClockCalibration}
        >
          RETRY CALIBRATION
        </Button>
      )}
      {clockCalibrationStatus === "ready" && phase === "countdown" && (
        <ProgressBar
          progress={(COUNTDOWN_VALUES.length - (countdown ?? 3)) / 3}
          color={colors.accent}
        />
      )}
      {clockCalibrationStatus === "ready" &&
        (phase === "separate" || phase === "position") && (
          <Button
            mode="contained"
            disabled={confirmDisabled}
            onPress={advance}
          >
            CONFIRM
          </Button>
        )}

      {/* The draw itself: a full-screen target, so neither player loses the
          round hunting for a small button. Tap anywhere on either platform —
          the accelerometer raise gesture (ticket #37) is still unwired. */}
      {phase === "fire" && (
        <Pressable
          accessibilityLabel="Fire"
          accessibilityRole="button"
          onPress={handleFire}
          style={styles.fireOverlay}
        >
          <Text style={styles.fireHeading}>FIRE!</Text>
          <Text style={styles.fireDetail}>
            {selfReactionMs === null
              ? "TAP ANYWHERE"
              : `${selfReactionMs}ms — ${
                  opponentReactionMs === null
                    ? "waiting for your opponent"
                    : `they fired in ${opponentReactionMs}ms`
                }`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    gap: 18,
    justifyContent: "center",
    padding: 28
  },
  muteButton: {
    position: "absolute",
    right: 8,
    top: 8
  },
  kicker: {
    color: colors.success,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1.5
  },
  heading: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 38 },
  detail: {
    color: colors.textMuted60,
    fontFamily: fonts.body,
    fontSize: 18,
    minHeight: 48
  },
  fireOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: colors.accent,
    gap: 12,
    justifyContent: "center",
    padding: 24
  },
  fireHeading: {
    color: colors.background,
    fontFamily: fonts.displayBold,
    fontSize: 72,
    letterSpacing: 2
  },
  fireDetail: {
    color: colors.background,
    fontFamily: fonts.mono,
    fontSize: 14,
    letterSpacing: 1.5,
    textAlign: "center",
    textTransform: "uppercase"
  }
});
