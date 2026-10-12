// Per-round outcome and reaction times; match-level ties are shown separately.

import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { CutCornerButton } from "../../components/CutCornerButton";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatTile } from "../../components/StatTile";
import { StatusTag } from "../../components/StatusTag";
import type { RoundOutcome, Zone } from "../../contracts/roundOutcome";
import { colors, fonts } from "../../theme/tokens";
import { DUEL_CUES } from "./countdownAudio";
import { RoundIllustration } from "./RoundIllustration";
import { roundTieDescription } from "./roundTieDescription";

type RoundResultScreenProps = {
  audioMuted?: boolean;
  continueDisabled?: boolean;
  continueLabel?: string;
  errorMessage?: string;
  onContinue: () => void;
  /** `null` means the opponent never fired inside the window. */
  opponentReactionMs: number | null;
  opponentZone?: Zone;
  outcome: RoundOutcome;
  playerNames: Record<string, string>;
  roundNumber: number;
  /** `null` means this player never fired inside the window. */
  selfReactionMs: number | null;
  selfZone?: Zone;
};

function nameFor(playerNames: Record<string, string>, id: string): string {
  return playerNames[id] ?? "Player";
}

function titleFor(
  outcome: RoundOutcome,
  playerNames: Record<string, string>
): string {
  switch (outcome.kind) {
    case "win":
      return `${nameFor(playerNames, outcome.winnerId)} — ${outcome.winnerZone.toUpperCase()} (${outcome.winnerPoints} ${outcome.winnerPoints === 1 ? "pt" : "pts"})`;
    case "tie":
      return "Tie";
    case "falseStart":
      return `${nameFor(playerNames, outcome.playerId)} false start`;
  }
}

function zoneLabel(zone: Zone): string {
  if (zone === "headshot") return "Headshot";
  if (zone === "bodyshot") return "Body shot";
  return "Miss";
}

export function RoundResultScreen({
  audioMuted = false,
  continueDisabled = false,
  continueLabel = "Next round",
  errorMessage,
  onContinue,
  opponentReactionMs,
  opponentZone = "miss",
  outcome,
  playerNames,
  roundNumber,
  selfReactionMs,
  selfZone = "miss"
}: RoundResultScreenProps) {
  const cue =
    outcome.kind === "falseStart" ? DUEL_CUES.falseStart : DUEL_CUES[selfZone];
  const player = useAudioPlayer(cue);
  const playedRef = useRef(false);
  useEffect(() => {
    if (audioMuted || playedRef.current) return;
    playedRef.current = true;
    let mounted = true;
    void setAudioModeAsync({ playsInSilentMode: true }).then(() => {
      if (!mounted) return;
      player.seekTo(0);
      player.play();
    });
    return () => {
      mounted = false;
    };
  }, [audioMuted, player]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={styles.container}
    >
      <ScreenHeader
        kicker={`Round ${roundNumber}`}
        title={titleFor(outcome, playerNames)}
      />

      {outcome.kind === "win" ? (
        <StatusTag tone="success">Result</StatusTag>
      ) : outcome.kind === "tie" ? (
        <StatusTag tone="warning">{roundTieDescription(outcome)}</StatusTag>
      ) : (
        <StatusTag tone="warning">Round loss</StatusTag>
      )}

      <View style={styles.statsRow}>
        <StatTile
          detail={zoneLabel(selfZone)}
          label="Your shot"
          tint={colors.accent}
          unit={selfReactionMs === null ? "" : "ms"}
          value={selfReactionMs === null ? "No shot" : String(selfReactionMs)}
        />
        <StatTile
          detail={zoneLabel(opponentZone)}
          label="Their shot"
          unit={opponentReactionMs === null ? "" : "ms"}
          value={
            opponentReactionMs === null ? "No shot" : String(opponentReactionMs)
          }
        />
      </View>

      {outcome.kind === "falseStart" && (
        <RoundIllustration
          playerName={nameFor(playerNames, outcome.playerId)}
          reason="falseStart"
        />
      )}

      {outcome.misses?.map(({ playerId, reason }) => (
        <RoundIllustration
          key={playerId}
          playerName={nameFor(playerNames, playerId)}
          reason={reason}
        />
      ))}

      <View style={styles.continueButton}>
        {errorMessage && (
          <Text
            accessibilityRole="alert"
            style={styles.error}
          >
            {errorMessage}
          </Text>
        )}
        <CutCornerButton
          disabled={continueDisabled}
          label={continueLabel}
          onPress={onContinue}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    flexGrow: 1,
    gap: 20,
    justifyContent: "center",
    padding: 24
  },
  statsRow: {
    flexDirection: "row",
    gap: 10
  },
  continueButton: {
    gap: 10,
    marginTop: 12
  },
  error: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 12
  }
});
