import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

import { CutCornerButton } from "../../components/CutCornerButton";
import { KickerLabel } from "../../components/KickerLabel";
import { ScreenHeader } from "../../components/ScreenHeader";
import type { LeaderboardEntry } from "../../contracts/leaderboardEntry";
import { colors, fonts } from "../../theme/tokens";
import { getLeaderboard } from "../backend/leaderboardRepository";

type LeaderboardScreenProps = {
  onBack: () => void;
};

export function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    let active = true;
    void getLeaderboard().then((result) => {
      if (active) setEntries(result);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader kicker="Rankings" title="Leaderboard" />

      <CutCornerButton label="Back to Profile" onPress={onBack} />

      <View style={styles.section}>
        <KickerLabel color={colors.textMuted45}>By ELO</KickerLabel>

        {entries === null ? (
          <ActivityIndicator color={colors.accent} style={styles.loading} />
        ) : entries.length === 0 ? (
          <Text style={styles.empty}>No ranked matches yet.</Text>
        ) : (
          entries.map((entry, index) => (
            <View key={entry.uid} style={styles.row}>
              <Text style={styles.rank}>{index + 1}</Text>
              <Text numberOfLines={1} style={styles.name}>
                {entry.displayName}
              </Text>
              <Text style={styles.elo}>{entry.eloRating}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 12
  },
  section: {
    marginTop: 26
  },
  loading: {
    marginTop: 20
  },
  empty: {
    color: colors.textMuted45,
    fontFamily: fonts.body,
    fontSize: 15,
    marginTop: 14
  },
  row: {
    alignItems: "center",
    backgroundColor: colors.backgroundAlt,
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  rank: {
    color: colors.textMuted60,
    fontFamily: fonts.mono,
    fontSize: 14,
    width: 24
  },
  name: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16
  },
  elo: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 16
  }
});
