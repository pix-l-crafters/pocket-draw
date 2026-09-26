import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { CutCornerButton } from "../../components/CutCornerButton";
import { KickerLabel } from "../../components/KickerLabel";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatTile } from "../../components/StatTile";
import { usePlayerStats } from "../../hooks/usePlayerStats";
import { logoutUser } from "../../lib/auth";
import { colors, fonts } from "../../theme/tokens";
import { LeaderboardScreen } from "../leaderboard/LeaderboardScreen";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { EditUsernameDialog } from "./EditUsernameDialog";

type ProfileScreenProps = {
  displayName: string;
  email: string | null;
  uid: string;
};

// Draws and average reaction time are in UI.md but not in the PlayerStats
// contract yet (roadmap items 7/8 add match-level draws). Showing a real
// three-tile row beats padding it with placeholders that never fill in.
export function ProfileScreen({ displayName, email, uid }: ProfileScreenProps) {
  const [openDialog, setOpenDialog] = useState<"username" | "password" | null>(
    null
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const stats = usePlayerStats({ uid, displayName });

  const format = (value: number | undefined) =>
    value === undefined ? "—" : String(value);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logoutUser();
    } catch {
      setIsLoggingOut(false);
      Alert.alert("Logout failed", "Please try again.");
    }
  };

  if (showLeaderboard) {
    return <LeaderboardScreen onBack={() => setShowLeaderboard(false)} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        kicker="Your Profile"
        subtitle={email ?? undefined}
        title={displayName}
      />

      <View style={styles.section}>
        <KickerLabel color={colors.textMuted45}>Record</KickerLabel>
        <View style={styles.stats}>
          <StatTile
            label="Wins"
            tint={colors.success}
            value={format(stats?.wins)}
          />
          <StatTile label="Losses" value={format(stats?.losses)} />
          <StatTile label="ELO" value={format(stats?.eloRating)} />
        </View>
      </View>

      <View style={styles.section}>
        <KickerLabel color={colors.textMuted45}>Settings</KickerLabel>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email</Text>
          <Text numberOfLines={1} style={styles.detailValue}>
            {email ?? "—"}
          </Text>
        </View>

        <View style={styles.actions}>
          <CutCornerButton
            label="Leaderboard"
            onPress={() => setShowLeaderboard(true)}
          />
          <CutCornerButton
            label="Edit Username"
            onPress={() => setOpenDialog("username")}
          />
          <CutCornerButton
            label="Change Password"
            onPress={() => setOpenDialog("password")}
          />
          <CutCornerButton
            disabled={isLoggingOut}
            label="Logout"
            onPress={() => void handleLogout()}
          />
        </View>
      </View>

      <EditUsernameDialog
        currentUsername={displayName}
        onDismiss={() => setOpenDialog(null)}
        visible={openDialog === "username"}
      />

      <ChangePasswordDialog
        onDismiss={() => setOpenDialog(null)}
        onSuccess={() => {
          setOpenDialog(null);
          Alert.alert("Password updated", "Your password has been changed.");
        }}
        visible={openDialog === "password"}
      />
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
  stats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10
  },
  detailRow: {
    alignItems: "center",
    backgroundColor: colors.backgroundAlt,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 14
  },
  detailLabel: {
    color: colors.textMuted45,
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 1.5,
    textTransform: "uppercase"
  },
  detailValue: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    textAlign: "right"
  },
  actions: {
    gap: 12,
    marginTop: 14
  }
});
