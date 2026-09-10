import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

import { CutCornerButton } from "../../components/CutCornerButton";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusTag } from "../../components/StatusTag";
import type { ChallengeHandoff } from "../../contracts/challengeHandoff";
import type { DuelChannel } from "../../contracts/duelChannel";
import { colors } from "../../theme/tokens";
import { useDuelSession } from "./hooks/useDuelSession";
import { DUEL_CONNECT_MAX_AUTO_RETRIES } from "./session/duelSession.constants";

type ConnectingScreenProps = {
  handoff: ChallengeHandoff;
  onConnected: (channel: DuelChannel, handoff: ChallengeHandoff) => void;
  onExit: () => void;
};

export function ConnectingScreen({
  handoff,
  onConnected,
  onExit
}: ConnectingScreenProps) {
  const opponentName = handoff.scannedPlayerName;
  const { state, retry, cancel } = useDuelSession({
    role: "guest",
    matchId: handoff.matchId,
    discoveryToken: handoff.discoveryToken,
    opponentId: handoff.scannedPlayerId
  });

  useEffect(() => {
    if (state.status === "connected") {
      onConnected(state.channel, handoff);
    }
  }, [state, handoff, onConnected]);

  const isBusy = state.status === "connecting" || state.status === "retrying";
  const totalAttempts = DUEL_CONNECT_MAX_AUTO_RETRIES + 1;

  return (
    <View style={styles.container}>
      <ScreenHeader
        kicker="Challenge"
        subtitle={`${handoff.roundCount}-round duel with ${opponentName}`}
        title="Connecting"
      />

      <View style={styles.body}>
        {isBusy ? <ActivityIndicator size="large" /> : null}

        {state.status === "connecting" ? (
          <StatusTag>{`Reaching ${opponentName}… (${state.attempt}/${totalAttempts})`}</StatusTag>
        ) : null}

        {state.status === "retrying" ? (
          <StatusTag tone="warning">
            {`${state.message} Retrying… (${state.attempt}/${totalAttempts})`}
          </StatusTag>
        ) : null}

        {state.status === "connected" ? (
          <StatusTag tone="success">Connected</StatusTag>
        ) : null}

        {state.status === "failed" ? (
          <StatusTag tone="warning">
            {`${state.message} Couldn't connect after ${totalAttempts} tries.`}
          </StatusTag>
        ) : null}

        {state.status === "disconnected" ? (
          <StatusTag tone="warning">{state.message}</StatusTag>
        ) : null}
      </View>

      <View style={styles.actions}>
        {state.status === "failed" ? (
          <CutCornerButton label="Try Again" onPress={retry} />
        ) : null}

        {isBusy ? (
          <CutCornerButton
            label="Cancel"
            onPress={() => {
              cancel();
              onExit();
            }}
          />
        ) : (
          <CutCornerButton label="Back" onPress={onExit} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    gap: 16,
    padding: 16
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
