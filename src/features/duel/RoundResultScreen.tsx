// 4.16 — per-round result screen: shows the round's outcome (winner/tie/
// false-start) and reaction times to both players. Presentational only —
// whoever assembles the full duel flow (countdown -> fire -> raise -> this)
// wires it up once that flow exists.

import { StyleSheet, View } from "react-native";

import { CutCornerButton } from "../../components/CutCornerButton";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatTile } from "../../components/StatTile";
import { StatusTag } from "../../components/StatusTag";
import { colors } from "../../theme/tokens";
import type { RoundOutcome } from "../../contracts/roundOutcome";

type RoundResultScreenProps = {
  continueLabel?: string;
  onContinue: () => void;
  outcome: RoundOutcome;
  playerNames: Record<string, string>;
  roundNumber: number;
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
  continueLabel = "Next round",
  onContinue,
  outcome,
  playerNames,
  roundNumber
}: RoundResultScreenProps) {
  return (
    <View style={styles.container}>
      <ScreenHeader
        kicker={`Round ${roundNumber}`}
        title={titleFor(outcome, playerNames)}
      />

      {outcome.kind === "win" ? (
        <StatusTag tone="success">Result</StatusTag>
      ) : outcome.kind === "tie" ? (
        <StatusTag tone="warning">Sudden death</StatusTag>
      ) : (
        <StatusTag tone="warning">Round loss</StatusTag>
      )}

      {outcome.kind === "win" ? (
        <View style={styles.statsRow}>
          <StatTile
            label={nameFor(playerNames, outcome.winnerId)}
            tint={colors.accent}
            unit="ms"
            value={String(outcome.reactionMs)}
          />
          <StatTile
            label="Opponent"
            unit="ms"
            value={String(outcome.opponentReactionMs)}
          />
        </View>
      ) : outcome.kind === "tie" ? (
        <View style={styles.statsRow}>
          <StatTile
            label="Reaction time"
            unit="ms"
            value={String(outcome.reactionMs)}
          />
        </View>
      ) : null}

      <View style={styles.continueButton}>
        <CutCornerButton label={continueLabel} onPress={onContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    gap: 20,
    justifyContent: "center",
    paddingHorizontal: 24
  },
  statsRow: {
    flexDirection: "row",
    gap: 10
  },
  continueButton: {
    marginTop: 12
  }
});
