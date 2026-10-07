import { Modal, StyleSheet, View } from "react-native";

import { CutCornerButton } from "../../../components/CutCornerButton";
import { CutCornerSurface } from "../../../components/CutCornerSurface";
import { DisplayHeading } from "../../../components/DisplayHeading";
import { KickerLabel } from "../../../components/KickerLabel";
import { StatTile } from "../../../components/StatTile";
import { usePlayerStats } from "../../../hooks/usePlayerStats";
import { colors } from "../../../theme/tokens";

type OpponentPopupProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  kicker?: string;
  onCancel: () => void;
  onChallenge: () => void;
  scannedPlayerId: string;
  scannedPlayerName: string;
  visible: boolean;
};

export function OpponentPopup({
  cancelLabel = "Cancel",
  confirmLabel = "Send Challenge",
  kicker = "Opponent Found",
  onCancel,
  onChallenge,
  scannedPlayerId,
  scannedPlayerName,
  visible
}: OpponentPopupProps) {
  const stats = usePlayerStats(
    visible ? { uid: scannedPlayerId, displayName: scannedPlayerName } : null
  );

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <CutCornerSurface
          corner="large"
          style={styles.card}
        >
          <KickerLabel>{kicker}</KickerLabel>
          <DisplayHeading
            size={26}
            style={styles.name}
          >
            {stats?.displayName ?? scannedPlayerName}
          </DisplayHeading>
          <View style={styles.statsRow}>
            <StatTile
              label="Wins"
              tint={colors.success}
              value={String(stats?.wins ?? "—")}
            />
            <StatTile
              label="Losses"
              value={String(stats?.losses ?? "—")}
            />
            <StatTile
              label="Draws"
              value={String(stats?.draws ?? "—")}
            />
            <StatTile
              label="Elo"
              value={String(stats?.eloRating ?? "—")}
            />
          </View>
          <View style={styles.actions}>
            <CutCornerButton
              label={confirmLabel}
              onPress={onChallenge}
            />
            <CutCornerButton
              label={cancelLabel}
              onPress={onCancel}
            />
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
