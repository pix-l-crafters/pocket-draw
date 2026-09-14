import { StyleSheet, View } from "react-native";
import { IconButton, Surface } from "react-native-paper";

import { DisplayHeading } from "../../../components/DisplayHeading";
import { KickerLabel } from "../../../components/KickerLabel";
import { StatTile } from "../../../components/StatTile";
import type { PlayerStats } from "../../../contracts/playerStats";
import { colors } from "../../../theme/tokens";

type PlayerStatsCardProps = {
  displayName: string;
  onClose: () => void;
  stats: PlayerStats | null;
};

export function PlayerStatsCard({
  displayName,
  onClose,
  stats
}: PlayerStatsCardProps) {
  const format = (value: number | undefined) =>
    value === undefined ? "—" : String(value);

  return (
    <Surface accessibilityLiveRegion="polite" elevation={4} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <KickerLabel>Nearby player</KickerLabel>
          <DisplayHeading size={26} style={styles.name}>
            {displayName}
          </DisplayHeading>
        </View>
        <IconButton
          accessibilityLabel="Close player details"
          icon="close"
          onPress={onClose}
          size={18}
        />
      </View>

      <View style={styles.stats}>
        <StatTile
          label="Wins"
          tint={colors.success}
          value={format(stats?.wins)}
        />
        <StatTile label="Losses" value={format(stats?.losses)} />
        <StatTile label="ELO" value={format(stats?.eloRating)} />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    right: 16,
    bottom: 24,
    left: 16,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  headerText: {
    flexShrink: 1
  },
  name: {
    marginTop: 6
  },
  stats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14
  }
});
