import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

import { CutCornerButton } from "../../components/CutCornerButton";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusTag } from "../../components/StatusTag";
import type { ChallengeHandoff } from "../../contracts/challengeHandoff";
import type { DuelChannel } from "../../contracts/duelChannel";
import { colors } from "../../theme/tokens";
import { useDuelSession } from "./hooks/useDuelSession";
import { withNetworkPreparation } from "./network/hotspot";
import { DUEL_CONNECT_MAX_AUTO_RETRIES } from "./session/duelSession.constants";
import { createNativeWebRtcGuestTransport } from "./webrtc/nativeWebRtcTransport";

/** How often the guest re-announces itself until the host's popup answers. */
const CHALLENGE_ANNOUNCE_INTERVAL_MS = 500;

type ChallengeApproval = "pending" | "accepted" | "declined";

type ConnectingScreenProps = {
  currentUser: { displayName: string; uid: string };
  handoff: ChallengeHandoff;
  onConnected: (channel: DuelChannel, handoff: ChallengeHandoff) => void;
  onExit: () => void;
};

export function ConnectingScreen({
  currentUser,
  handoff,
  onConnected,
  onExit
}: ConnectingScreenProps) {
  const opponentName = handoff.scannedPlayerName;
  const transport = useMemo(() => {
    const webRtcTransport = createNativeWebRtcGuestTransport({
      hostIp: handoff.connection.hostIp,
      signalPort: handoff.connection.signalPort,
      challengeToken: handoff.challengeToken
    });
    return withNetworkPreparation(handoff.connection, webRtcTransport);
  }, [handoff.challengeToken, handoff.connection]);
  const { state, retry, cancel, handOff } = useDuelSession(
    {
      role: "guest",
      matchId: handoff.matchId,
      discoveryToken: handoff.discoveryToken,
      opponentId: handoff.scannedPlayerId
    },
    transport
  );

  const [approval, setApproval] = useState<ChallengeApproval>("pending");

  // The channel opens before the host has rendered its accept popup, so a
  // single announcement can be sent into a screen that is not listening yet.
  // Repeating it until they answer is cheaper than another handshake.
  useEffect(() => {
    if (state.status !== "connected" || approval !== "pending") {
      return undefined;
    }

    const { channel } = state;
    const unsubscribe = channel.onMessage((message) => {
      if (message.type === "challengeAccepted") setApproval("accepted");
      if (message.type === "challengeDeclined") setApproval("declined");
    });

    const announce = () => {
      try {
        channel.send({
          type: "challenge",
          playerId: currentUser.uid,
          playerName: currentUser.displayName
        });
      } catch {
        // A dropped channel surfaces through the session state below.
      }
    };
    announce();
    const interval = setInterval(announce, CHALLENGE_ANNOUNCE_INTERVAL_MS);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [approval, currentUser.displayName, currentUser.uid, state]);

  useEffect(() => {
    if (state.status === "connected" && approval === "accepted") {
      // Hand off before notifying: the caller swaps this screen out for the
      // duel, and the unmount must not close the channel the duel just got.
      handOff();
      onConnected(state.channel, handoff);
    }
  }, [approval, state, handoff, onConnected, handOff]);

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
        {isBusy || (state.status === "connected" && approval === "pending") ? (
          <ActivityIndicator size="large" />
        ) : null}

        {state.status === "connecting" ? (
          <StatusTag>{`Reaching ${opponentName}… (${state.attempt}/${totalAttempts})`}</StatusTag>
        ) : null}

        {state.status === "retrying" ? (
          <StatusTag tone="warning">
            {`${state.message} Retrying… (${state.attempt}/${totalAttempts})`}
          </StatusTag>
        ) : null}

        {state.status === "connected" && approval === "pending" ? (
          <StatusTag>{`Connected — waiting for ${opponentName} to accept…`}</StatusTag>
        ) : null}

        {state.status === "connected" && approval === "accepted" ? (
          <StatusTag tone="success">Challenge accepted</StatusTag>
        ) : null}

        {approval === "declined" ? (
          <StatusTag tone="warning">{`${opponentName} declined the challenge.`}</StatusTag>
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
