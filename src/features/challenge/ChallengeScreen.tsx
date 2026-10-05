import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SegmentedButtons } from "react-native-paper";

import type { DuelChannel } from "../../contracts/duelChannel";
import { colors } from "../../theme/tokens";
import type { QrInvitePayload } from "../qr/types/qr.types";
import { QrDisplayScreen } from "./QrDisplayScreen";
import type { ConfirmedOpponent } from "./QrScannerScreen";
import { QrScannerScreen } from "./QrScannerScreen";

type ChallengeScreenProps = {
  currentUser: { displayName: string; uid: string };
  onHostConnected?: (channel: DuelChannel, invite: QrInvitePayload) => void;
  onOpponentConfirmed: (opponent: ConfirmedOpponent) => void;
};

export function ChallengeScreen({
  currentUser,
  onHostConnected,
  onOpponentConfirmed
}: ChallengeScreenProps) {
  const [mode, setMode] = useState<"myQr" | "scan">("myQr");

  return (
    <View style={styles.container}>
      <SegmentedButtons
        buttons={[
          { value: "myQr", label: "My QR" },
          { value: "scan", label: "Scan" }
        ]}
        onValueChange={(value) => setMode(value as "myQr" | "scan")}
        style={styles.switcher}
        value={mode}
      />
      <View style={styles.screen}>
        {mode === "myQr" ? (
          <QrDisplayScreen
            currentUser={currentUser}
            onHostConnected={onHostConnected}
          />
        ) : (
          <QrScannerScreen
            currentUser={currentUser}
            onOpponentConfirmed={onOpponentConfirmed}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1
  },
  switcher: {
    marginHorizontal: 16,
    marginTop: 12
  },
  screen: {
    flex: 1
  }
});
