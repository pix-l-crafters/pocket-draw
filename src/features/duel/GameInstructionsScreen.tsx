import { ScrollView, StyleSheet, Text, View } from "react-native";

import { CutCornerButton } from "../../components/CutCornerButton";
import { CutCornerSurface } from "../../components/CutCornerSurface";
import { ScreenHeader } from "../../components/ScreenHeader";
import { colors, fonts } from "../../theme/tokens";

type GameInstructionsScreenProps = {
  onClose: () => void;
};

// Condensed from docs/product-design/Gameplay-v2.md for on-demand help.
const STEPS = [
  "Start calibration: hold the ready pose with arm down, then the shoulder pose with arm raised. Hold steady or press volume up to confirm each pose. Volume up also confirms pre-round prompts and continues after calibration. Rematches reuse calibration; denied/unavailable motion has retry and Settings recovery.",
  "Motion, compass, and precise foreground GPS power the duel. Precise GPS goes only to your accepted peer, not Firestore or the public map; public locations stay rounded.",
  "Aim toward your opponent within about 30 degrees. Facing away, stale/unavailable readings, or overlapping GPS uncertainty means miss. Pitch approximates height, not exact centimeters.",
  "Hold ready through the 3-second countdown. At the buzz, draw and tap or use a supported volume control: bodyshot 1, headshot 2, miss 0.",
  "Three rounds use total points; tied totals get one tiebreaker. Shots within 100 ms both score; otherwise a faster miss lets the slower shot score.",
  "Early tap, volume input, or movement is a false start: offender scores 0; the other player fires after the buzz for actual shot points."
] as const;

export function GameInstructionsScreen({
  onClose
}: GameInstructionsScreenProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={styles.screen}
    >
      <ScreenHeader
        kicker="Before you draw"
        subtitle="Open these instructions whenever you need them."
        title="How to play"
      />

      <CutCornerSurface style={styles.card}>
        {STEPS.map((step, index) => (
          <View
            key={step}
            style={styles.stepRow}
          >
            <Text style={styles.stepNumber}>
              {String(index + 1).padStart(2, "0")}
            </Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </CutCornerSurface>

      <View style={styles.actions}>
        <CutCornerButton
          label="Close help"
          onPress={onClose}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    flexGrow: 1,
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
