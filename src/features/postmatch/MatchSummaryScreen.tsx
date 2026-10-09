// 6.1 — match summary screen (final score, winner, per-round reaction
// times, ELO), 6.2 — rematch offer, 6.3 — return-to-map flow.

import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { CutCornerButton } from "../../components/CutCornerButton";
import { KickerLabel } from "../../components/KickerLabel";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatTile } from "../../components/StatTile";
import { StatusTag } from "../../components/StatusTag";
import type { MatchResult } from "../../contracts/matchResult";
import type { PlayerStats } from "../../contracts/playerStats";
import { colors, fonts } from "../../theme/tokens";
import { scoreFromRounds } from "../duel/roundLoop";
import { roundTieDescription } from "../duel/roundTieDescription";

type MatchSummaryScreenProps = {
  matchResult: MatchResult;
  onRematch: () => void;
  onReturnToMap: () => void;
  playerNames: Record<string, string>;
  playerStats?: Record<string, PlayerStats>;
  saveStatus?: "saving" | "written" | "queued" | "error";
  onRetrySave?: () => void;
  /** A rematch needs both players, so the offer can be pending or gone. */
  rematchDisabled?: boolean;
  rematchLabel?: string;
  rematchNote?: string;
};

function reactionSummary(
  outcome: MatchResult["rounds"][number],
  playerNames: Record<string, string>
): string {
  switch (outcome.kind) {
    case "win":
      return `${playerNames[outcome.winnerId] ?? "Player"} · ${outcome.reactionMs}ms`;
    case "tie":
      return `Tie · ${roundTieDescription(outcome)} · ${outcome.reactionMs}/${outcome.opponentReactionMs}ms (first/second)`;
    case "falseStart":
      return `${playerNames[outcome.playerId] ?? "Player"} false start`;
  }
}

export function MatchSummaryScreen({
  matchResult,
  onRematch,
  onReturnToMap,
  playerNames,
  playerStats,
  saveStatus,
  onRetrySave,
  rematchDisabled = false,
  rematchLabel = "Rematch",
  rematchNote
}: MatchSummaryScreenProps) {
  const score = scoreFromRounds(matchResult.participantIds, matchResult.rounds);
  const winnerId = matchResult.participantIds.find(
    (id) => matchResult.results[id] === "win"
  );
  const title = winnerId
    ? `${playerNames[winnerId] ?? "Player"} wins`
    : "Match drawn";

  return (
    <View style={styles.container}>
      <ScreenHeader
        kicker="Match complete"
        title={title}
      />
      {!winnerId && (
        <StatusTag>
          {`Equal total points after ${matchResult.rounds.length} rounds`}
        </StatusTag>
      )}
      {/* Both phones show the same id, which is how testers confirm a
          rematch was agreed under one fresh match. */}
      <Text style={styles.matchId}>
        {`Match ${matchResult.matchId.slice(0, 8)}`}
      </Text>

      <View style={styles.statsRow}>
        {matchResult.participantIds.map((id) => (
          <StatTile
            key={id}
            label={playerNames[id] ?? "Player"}
            tint={
              matchResult.results[id] !== "lose" ? colors.accent : colors.text
            }
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
          <Text
            key={index}
            style={styles.roundLine}
          >
            Round {index + 1} — {reactionSummary(outcome, playerNames)}
          </Text>
        ))}
      </View>

      <View style={styles.actions}>
        {saveStatus ? (
          <StatusTag>
            {saveStatus === "written"
              ? "Result saved"
              : saveStatus === "queued"
                ? "Result saved on this device · waiting to sync"
                : saveStatus === "error"
                  ? "Could not sync result. Please retry."
                  : "Saving result…"}
          </StatusTag>
        ) : null}
        {(saveStatus === "queued" || saveStatus === "error") && onRetrySave ? (
          <CutCornerButton
            label="Retry saving result"
            onPress={onRetrySave}
          />
        ) : null}
        {rematchNote ? <StatusTag>{rematchNote}</StatusTag> : null}
        <CutCornerButton
          disabled={
            rematchDisabled || saveStatus === "saving" || saveStatus === "error"
          }
          label={rematchLabel}
          onPress={onRematch}
        />
        <TouchableOpacity
          onPress={onReturnToMap}
          style={styles.returnButton}
        >
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
  matchId: {
    color: colors.textMuted60,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5
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
