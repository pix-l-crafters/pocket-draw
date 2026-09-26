import { Accelerometer } from "expo-sensors";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Button, IconButton, ProgressBar } from "react-native-paper";

import { CutCornerButton } from "../../components/CutCornerButton";
import type { DuelChannel, DuelMessage } from "../../contracts/duelChannel";
import { colors, fonts } from "../../theme/tokens";
import { COUNTDOWN_AUDIO_SOURCE } from "./countdownAudio";
import { ReactionTimer } from "./reactionTimer";

export const SEPARATION_RSSI_THRESHOLD = -70;
const COUNTDOWN_VALUES = [3, 2, 1] as const;

export type RssiReader = () => Promise<number | null>;

export function isSeparatedByRssi(
  rssi: number | null,
  threshold = SEPARATION_RSSI_THRESHOLD
): boolean {
  return rssi !== null && rssi <= threshold;
}

export function isFaceDown(x: number, y: number, z: number): boolean {
  return z < -0.75 && Math.abs(x) < 0.35 && Math.abs(y) < 0.35;
}

type Phase = "separate" | "faceDown" | "countdown" | "ready";

type PreRoundProps = {
  channel: DuelChannel;
  readRssi: RssiReader;
};

export function PreRound({ channel, readRssi }: PreRoundProps) {
  const countdownAudio = useAudioPlayer(COUNTDOWN_AUDIO_SOURCE);
  const [phase, setPhase] = useState<Phase>("separate");
  const [rssi, setRssi] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [buzzed, setBuzzed] = useState(false);
  const [faceDown, setFaceDown] = useState(false);
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const reactionTimerRef = useRef(new ReactionTimer());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Countdown timers fire up to ~3s after the buzz. Without this, leaving the
  // duel mid-countdown sends on a closed channel and throws inside setTimeout,
  // which React Native surfaces as a crash rather than a caught error.
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

  useEffect(() => {
    let mounted = true;
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      if (mounted) setFaceDown(isFaceDown(x, y, z));
    });
    Accelerometer.setUpdateInterval(150);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // The buzz cue must be audible even with the iOS silent switch on —
    // haptic strength alone varies too much across devices to be fair timing.
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  useEffect(() => {
    return channel.onMessage((message: DuelMessage) => {
      if (message.type === "buzz") {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        setBuzzed(true);
        setPhase("countdown");
      }
      if (message.type === "countdown") {
        playCountdownAudio();
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCountdown(message.value);
      }
      if (message.type === "ready") {
        reactionTimerRef.current.start(Date.now());
        setPhase("ready");
      }
    });
  }, [channel]);

  const handleTapFire = () => {
    const capture = reactionTimerRef.current.captureRaise(Date.now());
    if (!capture) return;
    setReactionMs(capture.reactionMs);
    safeSend({ type: "raised", atMs: capture.raisedAtMs });
  };

  const playCountdownAudio = () => {
    if (!COUNTDOWN_AUDIO_SOURCE || audioMuted) return;
    countdownAudio.seekTo(0);
    countdownAudio.play();
  };

  useEffect(() => {
    if (phase !== "separate") return;
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

  const separated = isSeparatedByRssi(rssi);
  const status = useMemo(() => {
    if (phase === "separate")
      return separated ? "DISTANCE CONFIRMED" : "MOVE FURTHER APART";
    if (phase === "faceDown")
      return faceDown ? "PHONE POSITION CONFIRMED" : "TURN PHONE FACE DOWN";
    if (phase === "countdown") return buzzed ? "BUZZ — GET READY" : "GET READY";
    return "READY FOR THE DRAW";
  }, [buzzed, faceDown, phase, separated]);

  const advance = () => {
    if (phase === "separate" && separated) setPhase("faceDown");
    else if (phase === "faceDown" && faceDown) {
      if (!safeSend({ type: "ready" })) return;
      const delayMs = 1000 + Math.floor(Math.random() * 2000);
      later(() => {
        if (!safeSend({ type: "buzz", delayMs })) return;
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        setBuzzed(true);
        setPhase("countdown");
        COUNTDOWN_VALUES.forEach((value, index) => {
          later(() => {
            if (!safeSend({ type: "countdown", value })) return;
            playCountdownAudio();
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setCountdown(value);
          }, index * 1000);
        });
      }, delayMs);
    }
  };

  return (
    <View style={styles.container}>
      <IconButton
        accessibilityLabel={
          audioMuted ? "Turn buzz cue sound on" : "Mute buzz cue"
        }
        icon={audioMuted ? "volume-off" : "volume-high"}
        iconColor={colors.textMuted60}
        onPress={() => setAudioMuted((muted) => !muted)}
        style={styles.muteButton}
      />
      <Text style={styles.kicker}>PRE-ROUND RITUAL</Text>
      <Text style={styles.heading}>{sendError ?? status}</Text>
      <Text style={styles.detail}>
        {phase === "separate" &&
          `BLE signal: ${rssi === null ? "—" : `${rssi} dBm`}`}
        {phase === "faceDown" &&
          "Both players must place their phone screen-down."}
        {phase === "countdown" &&
          (countdown ? `${countdown}` : "Listen for the buzz")}
        {phase === "ready" &&
          (reactionMs === null
            ? "Raise only when the signal tells you to."
            : `Reaction: ${reactionMs}ms`)}
      </Text>
      {phase === "countdown" && (
        <ProgressBar
          progress={(3 - (countdown ?? 3)) / 3}
          color={colors.accent}
        />
      )}
      {phase !== "countdown" && phase !== "ready" && (
        <Button
          mode="contained"
          disabled={phase === "separate" ? !separated : !faceDown}
          onPress={advance}
        >
          CONFIRM
        </Button>
      )}
      {/* Android draw trigger (accelerometer raise, ticket #37) isn't wired
          in yet, so this on-screen control is the only fire trigger for now. */}
      {phase === "ready" && Platform.OS === "ios" && reactionMs === null && (
        <CutCornerButton label="Fire" onPress={handleTapFire} />
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
  }
});
