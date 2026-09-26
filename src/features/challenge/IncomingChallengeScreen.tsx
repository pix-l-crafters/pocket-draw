// Host side of the challenge handshake: the guest has already opened the duel
// channel (that is what a QR scan buys), so this screen is where the player
// whose code was scanned accepts or declines before the duel starts.

import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

import { CutCornerButton } from "../../components/CutCornerButton";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusTag } from "../../components/StatusTag";
import type { DuelChannel } from "../../contracts/duelChannel";
import { colors } from "../../theme/tokens";
import { OpponentPopup } from "./components/OpponentPopup";

export type Challenger = {
  playerId: string;
  playerName: string;
};

type IncomingChallengeScreenProps = {
  channel: DuelChannel;
  onAccept: (challenger: Challenger) => void;
  onDecline: () => void;
};

export function IncomingChallengeScreen({
  channel,
  onAccept,
  onDecline
}: IncomingChallengeScreenProps) {
  const [challenger, setChallenger] = useState<Challenger | null>(null);

  useEffect(
    () =>
      channel.onMessage((message) => {
        if (message.type === "challenge") {
          setChallenger({
            playerId: message.playerId,
            playerName: message.playerName
          });
        }
      }),
    [channel]
  );

  const respond = (accepted: boolean) => {
    try {
      channel.send({
        type: accepted ? "challengeAccepted" : "challengeDeclined"
      });
    } catch {
      // The guest walked away mid-decision; there is no duel to start.
      onDecline();
      return;
    }

    if (accepted && challenger) {
      onAccept(challenger);
    } else {
      onDecline();
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        kicker="Challenge"
        subtitle="Someone scanned your code."
        title="Incoming Challenge"
      />

      <View style={styles.body}>
        {challenger ? (
          <StatusTag tone="success">{`${challenger.playerName} is waiting on your answer.`}</StatusTag>
        ) : (
          <>
            <ActivityIndicator size="large" />
            <StatusTag>Reading their details…</StatusTag>
          </>
        )}
      </View>

      <View style={styles.actions}>
        <CutCornerButton label="Decline" onPress={() => respond(false)} />
      </View>

      {challenger ? (
        <OpponentPopup
          cancelLabel="Decline"
          confirmLabel="Accept"
          kicker="Incoming Challenge"
          onCancel={() => respond(false)}
          onChallenge={() => respond(true)}
          scannedPlayerId={challenger.playerId}
          scannedPlayerName={challenger.playerName}
          visible
        />
      ) : null}
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
