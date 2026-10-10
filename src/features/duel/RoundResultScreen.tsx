// Per-round outcome and reaction times; match-level ties are shown separately.

import { ScrollView, StyleSheet, Text, View } from "react-native";

import { CutCornerButton } from "../../components/CutCornerButton";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatTile } from "../../components/StatTile";
import { StatusTag } from "../../components/StatusTag";
import type { RoundOutcome } from "../../contracts/roundOutcome";
import { colors, fonts } from "../../theme/tokens";
import { RoundIllustration } from "./RoundIllustration";
import { roundTieDescription } from "./roundTieDescription";

type RoundResultScreenProps = {
  continueDisabled?: boolean;
  continueLabel?: string;
  errorMessage?: string;
  onContinue: () => void;
  /** `null` means the opponent never fired inside the window. */
  opponentReactionMs: number | null;
  outcome: RoundOutcome;
  playerNames: Record<string, string>;
  roundNumber: number;
  /** `null` means this player never fired inside the window. */
  selfReactionMs: number | null;
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
      return `${nameFor(playerNames, outcome.winnerId)} wins`;
    case "tie":
      return "Tie";
    case "falseStart":
      return `${nameFor(playerNames, outcome.playerId)} false start`;
  }
}

export function RoundResultScreen({
  continueDisabled = false,
  continueLabel = "Next round",
  errorMessage,
  onContinue,
  opponentReactionMs,
  outcome,
  playerNames,
  roundNumber,
  selfReactionMs
}: RoundResultScreenProps) {
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

      {outcome.kind !== "falseStart" ? (
        <View style={styles.statsRow}>
          <StatTile
            label="Your shot"
            tint={colors.accent}
            unit={selfReactionMs === null ? "" : "ms"}
            value={selfReactionMs === null ? "No shot" : String(selfReactionMs)}
          />
          <StatTile
            label="Their shot"
            unit={opponentReactionMs === null ? "" : "ms"}
            value={
              opponentReactionMs === null
                ? "No shot"
                : String(opponentReactionMs)
            }
          />
        </View>
      ) : (
        <View style={styles.statsRow}>
          <StatTile
            label={nameFor(playerNames, outcome.nonOffenderId)}
            unit="pts"
            value={String(outcome.nonOffenderShot?.points ?? 0)}
          />
          <StatTile
            label="Reaction time"
            unit={outcome.nonOffenderShot ? "ms" : ""}
            value={
              outcome.nonOffenderShot
                ? String(outcome.nonOffenderShot.reactionMs)
                : "No shot"
            }
          />
        </View>
      )}

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
