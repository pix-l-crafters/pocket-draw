// What a player sees while the duel cannot continue: the connection dropped,
// is being restored, or the opponent is gone. Every state has a way out, so a
// lost link never leaves a player on a frozen round.

import { StyleSheet, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

import { CutCornerButton } from "../../components/CutCornerButton";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusTag } from "../../components/StatusTag";
import { colors } from "../../theme/tokens";

export type DuelConnectionState =
  | { status: "reconnecting"; attempt: number; maxAttempts: number }
  | { status: "syncing" }
  | { status: "lost" }
  | { status: "peerLeft" };

type DuelConnectionScreenProps = {
  state: DuelConnectionState;
  opponentName: string;
  onRetry: () => void;
  onExit: () => void;
};

export function DuelConnectionScreen({
  state,
  opponentName,
  onRetry,
  onExit
}: DuelConnectionScreenProps) {
  const busy = state.status === "reconnecting" || state.status === "syncing";

  return (
    <View style={styles.container}>
      {state.status === "reconnecting" ? (
        <ScreenHeader
          kicker="Connection lost"
          subtitle="Your score is kept while both phones reconnect."
          title="Reconnecting"
        />
      ) : state.status === "syncing" ? (
        <ScreenHeader
          kicker="Connection restored"
          subtitle="Checking both phones agree on the score."
          title="Reconnected"
        />
      ) : state.status === "lost" ? (
        <ScreenHeader
          kicker="Connection lost"
          subtitle="Keep both phones on the same network, then try again."
          title="Couldn't reconnect"
        />
      ) : (
        <ScreenHeader
          kicker="Match over"
          subtitle="The match ended without a result."
          title={`${opponentName} left`}
        />
      )}

      <View style={styles.body}>
        {busy ? <ActivityIndicator size="large" /> : null}
        {state.status === "reconnecting" ? (
          <StatusTag tone="warning">
            {`Reaching ${opponentName}… (${state.attempt}/${state.maxAttempts})`}
          </StatusTag>
        ) : null}
        {state.status === "syncing" ? (
          <StatusTag>Syncing the score…</StatusTag>
        ) : null}
      </View>

      <View style={styles.actions}>
        {state.status === "lost" ? (
          <CutCornerButton
            label="Try again"
            onPress={onRetry}
          />
        ) : null}
        <CutCornerButton
          label={busy ? "End match" : "Back to map"}
          onPress={onExit}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    gap: 16,
    padding: 24
  },
  body: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center"
  },
  actions: {
    gap: 10
  }
});
