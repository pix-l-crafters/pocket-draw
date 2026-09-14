// 6.1 — match summary screen (final score, winner, per-round reaction
// times, ELO), 6.2 — rematch offer, 6.3 — return-to-map flow.
// Presentational only, same as RoundResultScreen: wired up by whoever
// assembles the full duel flow.

import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { CutCornerButton } from "../../components/CutCornerButton";
import { KickerLabel } from "../../components/KickerLabel";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatTile } from "../../components/StatTile";
import { colors, fonts } from "../../theme/tokens";
import type { MatchResult } from "../../contracts/matchResult";
import type { PlayerStats } from "../../contracts/playerStats";
import { scoreFromRounds } from "../duel/roundLoop";

type MatchSummaryScreenProps = {
  matchResult: MatchResult;
  onRematch: () => void;
  onReturnToMap: () => void;
  playerNames: Record<string, string>;
  playerStats?: Record<string, PlayerStats>;
};

function reactionSummary(
  outcome: MatchResult["rounds"][number],
  playerNames: Record<string, string>
): string {
  switch (outcome.kind) {
    case "win":
      return `${playerNames[outcome.winnerId] ?? "Player"} · ${outcome.reactionMs}ms`;
    case "tie":
      return `Tie · ${outcome.reactionMs}ms`;
    case "falseStart":
      return `${playerNames[outcome.playerId] ?? "Player"} false start`;
  }
}

export function MatchSummaryScreen({
  matchResult,
  onRematch,
  onReturnToMap,
  playerNames,
  playerStats
}: MatchSummaryScreenProps) {
  const score = scoreFromRounds(matchResult.participantIds, matchResult.rounds);
  const winnerName = playerNames[matchResult.winnerId] ?? "Player";

  return (
    <View style={styles.container}>
      <ScreenHeader kicker="Match complete" title={`${winnerName} wins`} />

      <View style={styles.statsRow}>
        {matchResult.participantIds.map((id) => (
          <StatTile
            key={id}
            label={playerNames[id] ?? "Player"}
            tint={id === matchResult.winnerId ? colors.accent : colors.text}
            value={String(score[id] ?? 0)}
          />
        ))}
      </View>

      {playerStats ? (
        <View style={styles.statsRow}>
          {matchResult.participantIds.map((id) => (
            <StatTile
              key={id}
              label={`${playerNames[id] ?? "Player"} ELO`}
              value={String(playerStats[id]?.eloRating ?? "—")}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.rounds}>
        <KickerLabel>Rounds</KickerLabel>
        {matchResult.rounds.map((outcome, index) => (
          <Text key={index} style={styles.roundLine}>
            Round {index + 1} — {reactionSummary(outcome, playerNames)}
          </Text>
        ))}
      </View>

      <View style={styles.actions}>
        <CutCornerButton label="Rematch" onPress={onRematch} />
        <TouchableOpacity onPress={onReturnToMap} style={styles.returnButton}>
          <Text style={styles.returnLabel}>Back to map</Text>
        </TouchableOpacity>
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
  rounds: {
    gap: 6
  },
  roundLine: {
    color: colors.textMuted60,
    fontFamily: fonts.mono,
    fontSize: 12
  },
  actions: {
    gap: 14,
    marginTop: 12
  },
  returnButton: {
    alignItems: "center",
    paddingVertical: 10
  },
  returnLabel: {
    color: colors.textMuted60,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase"
  }
});
