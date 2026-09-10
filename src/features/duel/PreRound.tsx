import { Accelerometer } from "expo-sensors";
import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, ProgressBar } from "react-native-paper";

import type { DuelChannel, DuelMessage } from "../../contracts/duelChannel";
import { colors, fonts } from "../../theme/tokens";
import { COUNTDOWN_AUDIO_SOURCE } from "./countdownAudio";

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
      if (message.type === "ready") setPhase("ready");
    });
  }, [channel]);

  const playCountdownAudio = () => {
    if (!COUNTDOWN_AUDIO_SOURCE) return;
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
      channel.send({ type: "ready" });
      const delayMs = 1000 + Math.floor(Math.random() * 2000);
      setTimeout(() => {
        channel.send({ type: "buzz", delayMs });
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        setBuzzed(true);
        setPhase("countdown");
        COUNTDOWN_VALUES.forEach((value, index) => {
          setTimeout(() => {
            channel.send({ type: "countdown", value });
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
      <Text style={styles.kicker}>PRE-ROUND RITUAL</Text>
      <Text style={styles.heading}>{status}</Text>
      <Text style={styles.detail}>
        {phase === "separate" &&
          `BLE signal: ${rssi === null ? "—" : `${rssi} dBm`}`}
        {phase === "faceDown" &&
          "Both players must place their phone screen-down."}
        {phase === "countdown" &&
          (countdown ? `${countdown}` : "Listen for the buzz")}
        {phase === "ready" && "Raise only when the signal tells you to."}
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
