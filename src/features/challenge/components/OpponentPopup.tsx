import { Modal, StyleSheet, View } from "react-native";

import { CutCornerButton } from "../../../components/CutCornerButton";
import { CutCornerSurface } from "../../../components/CutCornerSurface";
import { DisplayHeading } from "../../../components/DisplayHeading";
import { KickerLabel } from "../../../components/KickerLabel";
import { StatTile } from "../../../components/StatTile";
import type { PlayerStats } from "../../../contracts/playerStats";
// TODO(mihir): once 5.1/5.5/5.4 land, swap this mock for the real
// Firestore-backed lookup (see src/contracts/playerStats.ts).
import { mockPlayerStats } from "../../../contracts/mocks/mockPlayerStats";
import { colors } from "../../../theme/tokens";

type OpponentPopupProps = {
  onCancel: () => void;
  onChallenge: () => void;
  scannedPlayerId: string;
  scannedPlayerName: string;
  visible: boolean;
};

function getOpponentStats(uid: string, displayName: string): PlayerStats {
  return mockPlayerStats(uid, displayName);
}

export function OpponentPopup({
  onCancel,
  onChallenge,
  scannedPlayerId,
  scannedPlayerName,
  visible
}: OpponentPopupProps) {
  const stats = getOpponentStats(scannedPlayerId, scannedPlayerName);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <CutCornerSurface corner="large" style={styles.card}>
          <KickerLabel>Opponent Found</KickerLabel>
          <DisplayHeading size={26} style={styles.name}>
            {stats.displayName}
          </DisplayHeading>
          <View style={styles.statsRow}>
            <StatTile
              label="Wins"
              tint={colors.success}
              value={String(stats.wins)}
            />
            <StatTile label="Losses" value={String(stats.losses)} />
            <StatTile label="Elo" value={String(stats.eloRating)} />
          </View>
          <View style={styles.actions}>
            <CutCornerButton label="Send Challenge" onPress={onChallenge} />
            <CutCornerButton label="Cancel" onPress={onCancel} />
          </View>
        </CutCornerSurface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  card: {
    gap: 14,
    padding: 22,
    width: "100%"
  },
  name: {
    marginTop: 4
  },
  statsRow: {
    flexDirection: "row",
    gap: 8
  },
  actions: {
    gap: 10,
    marginTop: 8
  }
});
