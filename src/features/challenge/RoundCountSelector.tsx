import { useCallback, useEffect, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { SegmentedButtons } from "react-native-paper";

import { CutCornerButton } from "../../components/CutCornerButton";
import { CutCornerSurface } from "../../components/CutCornerSurface";
import { DisplayHeading } from "../../components/DisplayHeading";
import { KickerLabel } from "../../components/KickerLabel";
import type { ChallengeHandoff } from "../../contracts/challengeHandoff";
import { colors, fonts } from "../../theme/tokens";

type RoundCount = ChallengeHandoff["roundCount"];

type RoundCountSelectorProps = {
  challengerId: string;
  onCancel: () => void;
  onRoundCountSelected: (handoff: ChallengeHandoff) => void;
  scannedPlayerId: string;
  visible: boolean;
};

const ROUND_COUNT_OPTIONS = [
  { label: "3", value: "3" },
  { label: "5", value: "5" },
  { label: "7", value: "7" }
];

function toRoundCount(value: string): RoundCount | null {
  const roundCount = Number(value);

  return roundCount === 3 || roundCount === 5 || roundCount === 7
    ? roundCount
    : null;
}

export function RoundCountSelector({
  challengerId,
  onCancel,
  onRoundCountSelected,
  scannedPlayerId,
  visible
}: RoundCountSelectorProps) {
  const [roundCount, setRoundCount] = useState<RoundCount | null>(null);

  useEffect(() => {
    if (visible) {
      setRoundCount(null);
    }
  }, [challengerId, scannedPlayerId, visible]);

  const confirmRoundCount = useCallback(() => {
    if (roundCount === null) {
      return;
    }

    onRoundCountSelected({
      challengerId,
      scannedPlayerId,
      roundCount
    });
  }, [challengerId, onRoundCountSelected, roundCount, scannedPlayerId]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <CutCornerSurface corner="large" style={styles.card}>
          <KickerLabel>Challenge Format</KickerLabel>
          <DisplayHeading size={30}>Choose Rounds</DisplayHeading>
          <Text style={styles.description}>
            Select how many rounds will decide this challenge.
          </Text>
          <SegmentedButtons
            buttons={ROUND_COUNT_OPTIONS}
            onValueChange={(value) => setRoundCount(toRoundCount(value))}
            style={styles.selector}
            value={roundCount === null ? "" : String(roundCount)}
          />
          <View style={styles.actions}>
            <CutCornerButton
              disabled={roundCount === null}
              label="Continue"
              onPress={confirmRoundCount}
            />
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
  description: {
    color: colors.textMuted60,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21
  },
  selector: {
    marginTop: 4
  },
  actions: {
    gap: 10,
    marginTop: 8
  }
});
