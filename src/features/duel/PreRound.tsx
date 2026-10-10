import {
  setAudioModeAsync,
  useAudioPlayer,
  type AudioPlayer
} from "expo-audio";
import * as Haptics from "expo-haptics";
import { Accelerometer } from "expo-sensors";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { IconButton, ProgressBar } from "react-native-paper";

import { CutCornerButton } from "../../components/CutCornerButton";
import { PermissionNotice } from "../../components/PermissionNotice";
import type { DuelChannel, DuelMessage } from "../../contracts/duelChannel";
import type {
  AimDiagnostics,
  ShotDiagnostics
} from "../../contracts/matchAnalytics";
import type { MissReason, Zone } from "../../contracts/roundOutcome";
import { useForegroundRecheck } from "../../lib/useForegroundRecheck";
import { colors, fonts } from "../../theme/tokens";
import { isTopEdgeDown } from "./calibrationPose";
import { DUEL_CUES } from "./countdownAudio";
import { FalseStartCoordinator } from "./falseStartCoordinator";
import { FireSignalCoordinator, type DuelRole } from "./fireSignalCoordinator";
import {
  PitchMonitor,
  type PitchCalibration,
  type PitchMonitorStartResult
} from "./pitchMonitor";
import { classifyZone, computeRaiseFraction } from "./pitchZoneClassifier";
import { ReactionTimer } from "./reactionTimer";
import { FIRE_WINDOW_MS, type RoundShots } from "./roundShots";
import { useAimTracking, type AimMissReason } from "./useAimTracking";
import { subscribeVolumeFire } from "./volumeFireTrigger";

const COUNTDOWN_VALUES = [3, 2, 1] as const;
const COUNTDOWN_TICK_MS = 1000;
/** Fixed 3-2-1 countdown: one second per tick, FIRE on zero. Never random. */
export const COUNTDOWN_DURATION_MS =
  COUNTDOWN_VALUES.length * COUNTDOWN_TICK_MS;

// Checked before the countdown so a player fixes tracking instead of losing
// the round to a miss they could not see coming.
const TRACKING_WARNINGS: Record<AimMissReason, string> = {
  locationUnavailable:
    "Your location signal is weak. Turn on precise location and try moving outside.",
  compassUnavailable: "Compass not ready. Move your phone in a figure 8.",
  opponentLocationUnavailable:
    "Couldn't get your opponent's location. Ask them to turn on precise location and move outside.",
  trackingUnavailable:
    "Couldn't sync timing with your opponent's phone. Stay connected and wait a moment."
};

type Phase =
  | "position"
  | "waiting"
  | "announcing"
  | "countdown"
  | "fire"
  | "done";

type PreRoundProps = {
  channel: DuelChannel;
  matchId: string;
  roundNumber: number;
  calibration: PitchCalibration;
  selfPlayerId: string;
  falseStarts: FalseStartCoordinator;
  opponentName: string;
  selfName: string;
  /** The host owns the countdown and the FIRE signal; the guest follows. */
  role: DuelRole;
  /** True once the opponent has finished their own pre-round ritual. */
  peerReady: boolean;
  clockCalibrationStatus: "calibrating" | "ready" | "failed";
  clockOffsetMs: number;
  audioMuted: boolean;
  onToggleAudioMuted: () => void;
  onHelp?: () => void;
  playGameBegin: boolean;
  onGameBeginStart: () => void;
  onRetryClockCalibration: () => void;
  onCountdownStart: () => void;
  onRoundShots: (shots: RoundShots) => void;
  onShotDiagnostics?: (shot: ShotDiagnostics) => void;
};

export function PreRound({
  channel,
  matchId,
  roundNumber,
  calibration,
  selfPlayerId,
  falseStarts,
  opponentName,
  selfName,
  role,
  peerReady,
  clockCalibrationStatus,
  clockOffsetMs,
  audioMuted,
  onToggleAudioMuted,
  onHelp,
  playGameBegin,
  onGameBeginStart,
  onRetryClockCalibration,
  onCountdownStart,
  onRoundShots,
  onShotDiagnostics
}: PreRoundProps) {
  const gameBeginAudio = useAudioPlayer(DUEL_CUES.gameBegin);
  const countdown3Audio = useAudioPlayer(DUEL_CUES.countdown3);
  const countdown2Audio = useAudioPlayer(DUEL_CUES.countdown2);
  const countdown1Audio = useAudioPlayer(DUEL_CUES.countdown1);
  const fireAudio = useAudioPlayer(DUEL_CUES.fire);
  const gunshotAudio = useAudioPlayer(DUEL_CUES.gunshot);
  const [phase, setPhase] = useState<Phase>("position");
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const latestAimRef = useRef<AimDiagnostics | null>(null);
  const { captureAim, trackingIssues } = useAimTracking(
    channel,
    clockOffsetMs,
    (diagnostics) => {
      latestAimRef.current = diagnostics;
    }
  );
  const pitchMonitor = useMemo(() => new PitchMonitor(), []);
  const [pitchStatus, setPitchStatus] = useState<
    PitchMonitorStartResult | "starting"
  >("starting");
  const [pitchRetry, setPitchRetry] = useState(0);
  const [falseStartPlayer, setFalseStartPlayer] = useState<
    "self" | "opponent" | null
  >(null);
  const attemptRef = useRef(0);
  const cancelledAttemptRef = useRef(-1);
  const [selfZone, setSelfZone] = useState<Zone>("miss");
  const [opponentZone, setOpponentZone] = useState<Zone>("miss");
  const [selfMissReason, setSelfMissReason] =
    useState<Exclude<MissReason, "noShot">>();
  const [opponentMissReason, setOpponentMissReason] =
    useState<Exclude<MissReason, "noShot">>();
  const opponentShotReceivedRef = useRef(false);
  const [opponentShotResolved, setOpponentShotResolved] = useState(false);
  const [windowClosed, setWindowClosed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPitchStatus("starting");
    void pitchMonitor
      .start()
      .then((result) => {
        if (!cancelled) setPitchStatus(result);
      })
      .catch(() => {
        if (!cancelled) setPitchStatus("error");
      });
    return () => {
      cancelled = true;
      pitchMonitor.stop();
    };
  }, [pitchMonitor, pitchRetry]);

  useEffect(() => {
    const unsubscribe = falseStarts.onOutcome((outcome) => {
      if (phaseRef.current !== "countdown") return;
      cancelledAttemptRef.current = attemptRef.current;
      phaseRef.current = "position";
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      setCountdown(null);
      setFalseStartPlayer(
        outcome.playerId === selfPlayerId ? "self" : "opponent"
      );
      setPhase("position");
      falseStarts.endRound();
      if (outcome.playerId === selfPlayerId) {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning
        );
      }
    });
    return () => {
      unsubscribe();
      falseStarts.endRound();
    };
  }, [falseStarts, selfPlayerId]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [topEdgeDown, setTopEdgeDown] = useState(false);
  const [motionDenied, setMotionDenied] = useState(false);
  // Bumped to re-run the tilt effect once motion access is granted.
  const [motionAttempt, setMotionAttempt] = useState(0);
  const [selfReactionMs, setSelfReactionMs] = useState<number | null>(null);
  const [opponentReactionMs, setOpponentReactionMs] = useState<number | null>(
    null
  );
  const [sendError, setSendError] = useState<string | null>(null);
  const reactionTimerRef = useRef(new ReactionTimer());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const firedAtRef = useRef(0);
  const reportedRef = useRef(false);
  const introStartedRef = useRef(false);
  const afterIntroRef = useRef<(() => void) | null>(null);

  // Timers and the message handler both read this, and neither sees a state
  // value captured on a later render.
  const audioMutedRef = useRef(audioMuted);
  audioMutedRef.current = audioMuted;

  const isHost = role === "host";

  useEffect(() => {
    for (const player of [
      gameBeginAudio,
      countdown3Audio,
      countdown2Audio,
      countdown1Audio,
      fireAudio,
      gunshotAudio
    ]) {
      player.volume = audioMuted ? 0 : 1;
    }
  }, [
    audioMuted,
    gameBeginAudio,
    countdown3Audio,
    countdown2Audio,
    countdown1Audio,
    fireAudio,
    gunshotAudio
  ]);

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

  const playCue = (player: AudioPlayer) => {
    if (audioMutedRef.current) return;
    player.seekTo(0);
    player.play();
  };

  const showTick = (value: number) => {
    playCue(
      value === 3
        ? countdown3Audio
        : value === 2
          ? countdown2Audio
          : countdown1Audio
    );
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
        falseStarts.markFire(signal.atMs);
        setCountdown(0);
        setPhase("fire");
        playCue(fireAudio);
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      }),
    [fireCoordinator, falseStarts]
  );

  const recheckMotion = useCallback(() => {
    if (motionDenied) setMotionAttempt((attempt) => attempt + 1);
    if (pitchStatus !== "started" && pitchStatus !== "starting") {
      setPitchRetry((attempt) => attempt + 1);
    }
  }, [motionDenied, pitchStatus]);
  useForegroundRecheck(recheckMotion);

  useEffect(() => {
    let mounted = true;
    let subscription: { remove(): void } | null = null;
    const startWatchingTilt = async () => {
      let permission = await Accelerometer.getPermissionsAsync();
      if (!permission.granted && permission.canAskAgain) {
        permission = await Accelerometer.requestPermissionsAsync();
      }
      if (!mounted) return;
      setMotionDenied(!permission.granted);
      if (!permission.granted) return;
      Accelerometer.setUpdateInterval(150);
      subscription = Accelerometer.addListener(({ x, y, z }) => {
        if (!mounted) return;
        setTopEdgeDown(isTopEdgeDown(x, y, z));
        if (phaseRef.current === "countdown") {
          try {
            falseStarts.processLocalSample({ x, y, z, atMs: Date.now() });
          } catch {
            setSendError("Lost the connection to your opponent.");
          }
        }
      });
    };
    void startWatchingTilt().catch(() => {
      if (mounted) setMotionDenied(true);
    });
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [motionAttempt, falseStarts]);

  useEffect(() => {
    // Duel cues must be audible even with the iOS silent switch on —
    // haptic strength alone varies too much across devices to be fair timing.
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  useEffect(() => {
    return channel.onMessage((message: DuelMessage) => {
      if (message.type === "countdown") {
        if (message.value === 3) {
          if ((message.attempt ?? 0) < attemptRef.current) return;
          if ((message.attempt ?? 0) <= cancelledAttemptRef.current) return;
          if (
            cancelledAttemptRef.current >= 0 &&
            phaseRef.current !== "waiting"
          )
            return;
          attemptRef.current = message.attempt ?? 0;
          falseStarts.arm(attemptRef.current);
          setFalseStartPlayer(null);
        } else if (
          (message.attempt ?? 0) !== attemptRef.current ||
          phaseRef.current !== "countdown"
        ) {
          return;
        }
        setPhase((current) => (current === "fire" ? current : "countdown"));
        showTick(message.value);
      }
      if (
        message.type === "raised" &&
        message.reactionMs <= FIRE_WINDOW_MS &&
        !opponentShotReceivedRef.current
      ) {
        opponentShotReceivedRef.current = true;
        setOpponentZone(message.zone);
        setOpponentMissReason(
          message.zone === "miss" ? message.missReason : undefined
        );
        setOpponentReactionMs(message.reactionMs);
        setOpponentShotResolved(true);
      }
      if (
        message.type === "noShot" &&
        message.matchId === matchId &&
        message.roundNumber === roundNumber &&
        !opponentShotReceivedRef.current
      ) {
        opponentShotReceivedRef.current = true;
        setOpponentShotResolved(true);
      }
    });
  }, [channel, falseStarts, matchId, roundNumber]);

  // Close only our capture window. A peer packet can arrive arbitrarily later;
  // wait for their captured shot or explicit no-shot instead of guessing.
  useEffect(() => {
    if (phase !== "fire") return undefined;
    // Capture accepts the inclusive 3000 ms boundary.
    const deadline = firedAtRef.current + FIRE_WINDOW_MS + 1;
    const timer = setTimeout(
      () => {
        if (
          !reactionTimerRef.current.getCapture() &&
          !safeSend({ type: "noShot", matchId, roundNumber })
        )
          return;
        setWindowClosed(true);
      },
      Math.max(0, deadline - Date.now())
    );
    return () => clearTimeout(timer);
  }, [phase, channel, matchId, roundNumber]);

  useEffect(() => {
    if (
      phase !== "fire" ||
      !opponentShotResolved ||
      (selfReactionMs === null && !windowClosed) ||
      (falseStartPlayer !== null && !windowClosed)
    )
      return;

    const report = () => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      setPhase("done");
      onRoundShots({
        selfReactionMs,
        opponentReactionMs,
        selfZone,
        opponentZone,
        falseStartPlayer,
        ...(selfMissReason ? { selfMissReason } : {}),
        ...(opponentMissReason ? { opponentMissReason } : {})
      });
    };

    report();
  }, [
    onRoundShots,
    opponentReactionMs,
    phase,
    selfReactionMs,
    selfZone,
    opponentZone,
    falseStartPlayer,
    selfMissReason,
    opponentMissReason,
    opponentShotResolved,
    windowClosed
  ]);

  const handleFire = () => {
    if (phase !== "fire") {
      if (phase === "countdown") {
        try {
          falseStarts.processLocalFire(Date.now());
        } catch {
          setSendError("Lost the connection to your opponent.");
        }
      }
      return;
    }
    if (falseStarts.hasFalseStarted(selfPlayerId)) return;
    if (selfReactionMs !== null || reactionTimerRef.current.getCapture())
      return;
    if (Date.now() > firedAtRef.current + FIRE_WINDOW_MS) return;

    const capture = reactionTimerRef.current.captureRaise(Date.now());
    if (!capture) return;

    const theta = pitchMonitor.currentTheta();
    const raiseFraction =
      theta === null
        ? null
        : computeRaiseFraction(
            theta,
            calibration.thetaReady,
            calibration.thetaShoulder
          );
    const shot = captureAim(
      theta === null
        ? { zone: "miss", missReason: "tiltUnavailable" }
        : classifyZone(raiseFraction!)
    );
    onShotDiagnostics?.({
      firedAtMs: capture.raisedAtMs,
      thetaFire: theta,
      raiseFraction,
      pitchStatus,
      pitchSampleUsable: theta !== null,
      motion: pitchMonitor.snapshot(),
      aim: latestAimRef.current
    });
    setSelfZone(shot.zone);
    setSelfMissReason(shot.missReason);
    setSelfReactionMs(capture.reactionMs);
    playCue(gunshotAudio);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    safeSend({
      type: "raised",
      atMs: capture.raisedAtMs,
      reactionMs: capture.reactionMs,
      zone: shot.zone,
      ...(shot.missReason ? { missReason: shot.missReason } : {})
    });
  };
  const handleFireRef = useRef(handleFire);
  handleFireRef.current = handleFire;
  const advanceRef = useRef<(() => void) | null>(null);
  const confirmActionEnabledRef = useRef(false);

  const startCountdown = () => {
    if (cancelledAttemptRef.current >= 0) {
      attemptRef.current += 1;
      cancelledAttemptRef.current = -1;
    }
    falseStarts.arm(attemptRef.current);
    if (
      !safeSend({
        type: "countdown",
        value: COUNTDOWN_VALUES[0],
        ...(attemptRef.current ? { attempt: attemptRef.current } : {})
      })
    )
      return;
    onCountdownStart();
    setFalseStartPlayer(null);
    setPhase("countdown");
    showTick(COUNTDOWN_VALUES[0]);

    COUNTDOWN_VALUES.slice(1).forEach((value, index) => {
      later(
        () => {
          if (phaseRef.current !== "countdown") return;
          if (
            !safeSend({
              type: "countdown",
              value,
              ...(attemptRef.current ? { attempt: attemptRef.current } : {})
            })
          )
            return;
          showTick(value);
        },
        (index + 1) * COUNTDOWN_TICK_MS
      );
    });

    later(() => {
      try {
        if (phaseRef.current !== "countdown") return;
        fireCoordinator.markCountdownComplete();
        fireCoordinator.triggerFire();
      } catch {
        setSendError("Lost the connection to your opponent.");
      }
    }, COUNTDOWN_DURATION_MS);
  };

  useEffect(() => {
    const subscription = gameBeginAudio.addListener(
      "playbackStatusUpdate",
      (status) => {
        if (!status.didJustFinish) return;
        const afterIntro = afterIntroRef.current;
        afterIntroRef.current = null;
        afterIntro?.();
      }
    );
    return () => subscription.remove();
  }, [gameBeginAudio]);

  useEffect(() => {
    if (!audioMuted || !afterIntroRef.current) return;
    gameBeginAudio.pause();
    const afterIntro = afterIntroRef.current;
    afterIntroRef.current = null;
    afterIntro();
  }, [audioMuted, gameBeginAudio]);

  const finishPosition = () => {
    if (isHost) {
      startCountdown();
    } else if (safeSend({ type: "ready" })) {
      setFalseStartPlayer(null);
      setPhase("waiting");
    }
  };

  const advance = () => {
    if (phase !== "position" || !topEdgeDown) return;

    if (playGameBegin && !introStartedRef.current) {
      introStartedRef.current = true;
      onGameBeginStart();
      if (audioMutedRef.current) {
        finishPosition();
        return;
      }
      afterIntroRef.current = finishPosition;
      setPhase("announcing");
      playCue(gameBeginAudio);
      return;
    }
    finishPosition();
  };

  const confirmDisabled =
    phase === "position" && (!topEdgeDown || (isHost && !peerReady));
  advanceRef.current = advance;
  confirmActionEnabledRef.current =
    clockCalibrationStatus === "ready" &&
    pitchStatus === "started" &&
    !motionDenied &&
    !confirmDisabled;

  useEffect(() => {
    if (
      (phase !== "position" && phase !== "fire" && phase !== "countdown") ||
      (Platform.OS !== "android" && Platform.OS !== "ios")
    ) {
      return undefined;
    }
    return subscribeVolumeFire(({ direction }) => {
      const currentPhase = phaseRef.current;
      if (currentPhase === "position") {
        if (direction === "up" && confirmActionEnabledRef.current) {
          advanceRef.current?.();
        }
        return;
      }
      handleFireRef.current();
    });
  }, [phase]);

  const status = useMemo(() => {
    if (phase === "position") {
      if (!topEdgeDown) return "POINT THE TOP EDGE TOWARD THE GROUND";
      return isHost && !peerReady
        ? "WAITING FOR YOUR OPPONENT"
        : "PHONE POSITION CONFIRMED";
    }
    if (phase === "waiting") return "WAITING FOR THE DRAW";
    if (phase === "announcing") return "THE GAME WILL NOW BEGIN";
    if (phase === "countdown") return "GET READY";
    return "DRAW!";
  }, [isHost, peerReady, phase, topEdgeDown]);

  return (
    <View style={styles.container}>
      {onHelp && phase === "position" && (
        <IconButton
          accessibilityLabel="Help"
          icon="help-circle-outline"
          iconColor={colors.textMuted60}
          onPress={onHelp}
          style={styles.helpButton}
        />
      )}
      <IconButton
        accessibilityLabel={
          audioMuted ? "Turn duel sound on" : "Mute duel sound"
        }
        icon={audioMuted ? "volume-off" : "volume-high"}
        iconColor={colors.textMuted60}
        onPress={onToggleAudioMuted}
        style={styles.muteButton}
      />
      <View style={styles.content}>
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
              : null}
          {clockCalibrationStatus === "ready" &&
            phase === "position" &&
            (isHost
              ? "Point both phones' top edges toward the ground, then press volume up to start the countdown."
              : "Point your phone's top edge toward the ground, then confirm or press volume up.")}
          {clockCalibrationStatus === "ready" &&
            phase === "waiting" &&
            "The countdown starts when the host is ready."}
          {clockCalibrationStatus === "ready" &&
            phase === "countdown" &&
            "Keep still until the buzz."}
        </Text>
        {falseStartPlayer !== null && phase === "position" && (
          <Text
            style={
              falseStartPlayer === "self" ? styles.warningDetail : styles.detail
            }
          >
            {falseStartPlayer === "self" ? selfName : opponentName}{" "}
            false-started. Confirm your phone position to retry this round.
          </Text>
        )}
        <Text style={styles.detail}>
          {pitchStatus !== "started"
            ? pitchStatus === "starting"
              ? "STARTING MOTION SENSORS"
              : "MOTION UNAVAILABLE — enable motion access in settings, then retry."
            : "Aim the top edge at your opponent. Missing GPS or a calibrated compass counts as a miss."}
        </Text>
        {clockCalibrationStatus === "ready" &&
          pitchStatus === "started" &&
          (phase === "position" || phase === "waiting") &&
          !!trackingIssues?.length && (
            <View
              accessibilityLiveRegion="polite"
              style={styles.trackingCheck}
            >
              <Text style={styles.trackingKicker}>
                TRACKING NOT READY — SHOTS WILL MISS
              </Text>
              {trackingIssues.map((reason) => (
                <Text
                  key={reason}
                  style={styles.trackingWarning}
                >
                  {TRACKING_WARNINGS[reason]}
                </Text>
              ))}
            </View>
          )}
        {!motionDenied && pitchStatus === "permissionDenied" && (
          <PermissionNotice
            canAskAgain={false}
            capability="Motion"
            message="Pitch sensing is needed to capture calibrated shot zones."
            onRetry={recheckMotion}
          />
        )}
        {clockCalibrationStatus === "ready" &&
          phase === "position" &&
          motionDenied && (
            <PermissionNotice
              canAskAgain={false}
              capability="Motion"
              message="Pocket Draw reads the phone's tilt to check your starting pose, so the round can't begin without motion access."
              onRetry={recheckMotion}
            />
          )}
        {clockCalibrationStatus === "ready" && phase === "countdown" && (
          <ProgressBar
            progress={(COUNTDOWN_VALUES.length - (countdown ?? 3)) / 3}
            color={colors.accent}
          />
        )}
      </View>
      <View style={styles.actions}>
        {!motionDenied &&
          pitchStatus !== "started" &&
          pitchStatus !== "starting" &&
          (pitchStatus === "permissionDenied" ? null : (
            <CutCornerButton
              fillAvailableHeight
              label="RETRY MOTION"
              onPress={recheckMotion}
            />
          ))}
        {clockCalibrationStatus === "failed" && (
          <CutCornerButton
            fillAvailableHeight
            label="RETRY CALIBRATION"
            onPress={onRetryClockCalibration}
          />
        )}
        {clockCalibrationStatus === "ready" &&
          phase === "position" &&
          !motionDenied &&
          pitchStatus === "started" && (
            <CutCornerButton
              fillAvailableHeight
              disabled={confirmDisabled}
              label="CONFIRM"
              onPress={advance}
            />
          )}
      </View>

      {/* Android intercepts volume keys; iOS observes volume changes while
          preserving the normal volume adjustment. Tap remains available. */}
      {(phase === "fire" || phase === "countdown") && (
        <Pressable
          accessibilityLabel="Fire"
          accessibilityRole="button"
          accessibilityState={{ disabled: windowClosed }}
          disabled={windowClosed}
          onPress={handleFire}
          style={[
            styles.fireOverlay,
            phase === "fire" && styles.fireOverlayActive
          ]}
        >
          <Text
            style={[
              styles.fireHeading,
              phase === "fire" && styles.fireTextActive
            ]}
          >
            {phase === "fire"
              ? windowClosed
                ? "SYNCING SHOTS"
                : "FIRE!"
              : countdown}
          </Text>
          <Text
            style={[
              styles.fireDetail,
              phase === "fire" && styles.fireTextActive
            ]}
          >
            {phase === "countdown"
              ? "WAIT FOR THE BUZZ — EARLY FIRE IS A FALSE START"
              : falseStarts.hasFalseStarted(selfPlayerId)
                ? "FALSE START — YOUR SHOT IS DISQUALIFIED"
                : selfReactionMs === null
                  ? Platform.OS === "android"
                    ? "PRESS VOLUME OR TAP ANYWHERE"
                    : Platform.OS === "ios"
                      ? "VOLUME BUTTONS FIRE AND CHANGE VOLUME — OR TAP"
                      : "TAP ANYWHERE"
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
    flex: 1
  },
  content: {
    flex: 1.6,
    gap: 18,
    justifyContent: "flex-end",
    paddingBottom: 24,
    paddingHorizontal: 28,
    paddingTop: 28
  },
  actions: {
    flex: 1,
    gap: 12
  },
  muteButton: {
    position: "absolute",
    right: 8,
    top: 8
  },
  helpButton: {
    left: 8,
    position: "absolute",
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
  warningDetail: {
    color: colors.warning,
    fontFamily: fonts.body,
    fontSize: 18,
    minHeight: 48
  },
  trackingCheck: { gap: 4 },
  trackingKicker: {
    color: colors.warning,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1.5
  },
  trackingWarning: {
    color: colors.warning,
    fontFamily: fonts.body,
    fontSize: 16
  },
  fireOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: colors.background,
    gap: 12,
    justifyContent: "center",
    padding: 24
  },
  fireOverlayActive: { backgroundColor: colors.accent },
  fireHeading: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 72,
    letterSpacing: 2
  },
  fireDetail: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 14,
    letterSpacing: 1.5,
    textAlign: "center",
    textTransform: "uppercase"
  },
  fireTextActive: { color: colors.background }
});
