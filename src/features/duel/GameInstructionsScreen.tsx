import { StyleSheet, Text, View } from "react-native";

import { CutCornerButton } from "../../components/CutCornerButton";
import { CutCornerSurface } from "../../components/CutCornerSurface";
import { ScreenHeader } from "../../components/ScreenHeader";
import { colors, fonts } from "../../theme/tokens";

type GameInstructionsScreenProps = {
  onContinue: () => void;
};

// Condensed from docs/product-design/Gameplay-v2.md for a full-screen,
// pre-match read rather than the full rules document.
const STEPS = [
  "Calibrate: raise your phone to shoulder height, then lower it straight down to your side.",
  "Both phones face-down starts a 3-second countdown, then a buzz — that's the signal to draw.",
  "Draw and fire: a bodyshot scores 1 point, a headshot scores 2, a miss scores 0.",
  "Best of 3 rounds, decided by total points. A tie triggers one tiebreaker round.",
  "Firing before the buzz is a false start, not a scored shot."
] as const;

export function GameInstructionsScreen({
  onContinue
}: GameInstructionsScreenProps) {
  return (
    <View style={styles.screen}>
      <ScreenHeader
        kicker="Before you draw"
        subtitle="One read-through, then straight into calibration."
        title="How to play"
      />

      <CutCornerSurface style={styles.card}>
        {STEPS.map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <Text style={styles.stepNumber}>
              {String(index + 1).padStart(2, "0")}
            </Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </CutCornerSurface>

      <View style={styles.actions}>
        <CutCornerButton label="I'm Ready" onPress={onContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    padding: 24
  },
  card: {
    gap: 14,
    marginTop: 22,
    padding: 20
  },
  stepRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16
  },
  stepNumber: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1
  },
  stepText: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21
  },
  actions: {
    marginTop: "auto",
    paddingTop: 32
  }
});
