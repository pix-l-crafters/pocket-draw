import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SegmentedButtons } from "react-native-paper";

import { colors } from "../../theme/tokens";
import type { ChallengeHandoff } from "../../contracts/challengeHandoff";
import { QrDisplayScreen } from "./QrDisplayScreen";
import { QrScannerScreen } from "./QrScannerScreen";

type ChallengeScreenProps = {
  currentUser: { displayName: string; uid: string };
  onChallengeSent: (handoff: ChallengeHandoff) => void;
};

export function ChallengeScreen({
  currentUser,
  onChallengeSent
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
          <QrDisplayScreen currentUser={currentUser} />
        ) : (
          <QrScannerScreen
            currentUser={currentUser}
            onChallengeSent={onChallengeSent}
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
