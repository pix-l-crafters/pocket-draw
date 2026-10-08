// Host side of the challenge handshake: the guest has already opened the duel
// channel (that is what a QR scan buys), so this screen is where the player
// whose code was scanned accepts or declines before the duel starts.

import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

import { CutCornerButton } from "../../components/CutCornerButton";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusTag } from "../../components/StatusTag";
import type { DuelLink } from "../../contracts/duelLink";
import { colors } from "../../theme/tokens";
import { OpponentPopup } from "./components/OpponentPopup";

export type Challenger = {
  playerId: string;
  playerName: string;
};

type IncomingChallengeScreenProps = {
  link: DuelLink;
  onAccept: (challenger: Challenger) => void;
  /** Declined, or the challenger is gone; the caller releases the link. */
  onDecline: () => void;
};

export function IncomingChallengeScreen({
  link,
  onAccept,
  onDecline
}: IncomingChallengeScreenProps) {
  const { channel } = link;
  const [challenger, setChallenger] = useState<Challenger | null>(null);
  // Nothing reconnects before the duel starts, so a drop here is final.
  const [challengerGone, setChallengerGone] = useState(
    () => link.status() !== "live"
  );

  useEffect(() => {
    const gone = () => setChallengerGone(true);
    const stopWatchingDrops = link.onDrop(gone);
    const stopWatchingPeer = link.onPeerLeft(gone);
    return () => {
      stopWatchingDrops();
      stopWatchingPeer();
    };
  }, [link]);

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
        {challengerGone ? (
          <StatusTag tone="warning">
            The challenger disconnected before you answered.
          </StatusTag>
        ) : challenger ? (
          <StatusTag tone="success">{`${challenger.playerName} is waiting on your answer.`}</StatusTag>
        ) : (
          <>
            <ActivityIndicator size="large" />
            <StatusTag>Reading their details…</StatusTag>
          </>
        )}
      </View>

      <View style={styles.actions}>
        <CutCornerButton
          label={challengerGone ? "Back" : "Decline"}
          onPress={() => (challengerGone ? onDecline() : respond(false))}
        />
      </View>

      {challenger && !challengerGone ? (
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
