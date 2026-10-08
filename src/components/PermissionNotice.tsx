import { Linking, StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "../theme/tokens";
import { CutCornerButton } from "./CutCornerButton";
import { CutCornerSurface } from "./CutCornerSurface";
import { StatusTag } from "./StatusTag";

type PermissionNoticeProps = {
  /** False once the OS will not prompt again — Settings is the only way back. */
  canAskAgain: boolean;
  /** What is blocked, as the player would say it: "Camera", "Motion". */
  capability: string;
  /** Which part of the app is unavailable, and any alternative. */
  message: string;
  /** Re-run the check, prompting again when the OS still allows it. */
  onRetry: () => void;
};

/**
 * The denied-permission recovery card: says what is unavailable and always
 * leaves a way forward — another prompt while the OS still offers one, and
 * otherwise a trip to Settings plus a re-check on return.
 */
export function PermissionNotice({
  canAskAgain,
  capability,
  message,
  onRetry
}: PermissionNoticeProps) {
  return (
    <CutCornerSurface
      corner="small"
      style={styles.card}
    >
      <View accessibilityLiveRegion="polite">
        <StatusTag tone="warning">{`${capability} access needed`}</StatusTag>
        <Text style={styles.message}>{message}</Text>
        {canAskAgain ? null : (
          <Text style={styles.message}>
            {`Pocket Draw can't show the prompt again. Turn ${capability.toLowerCase()} access on in Settings, then come back and check again.`}
          </Text>
        )}
      </View>
      <CutCornerButton
        label={canAskAgain ? `Allow ${capability}` : "Open Settings"}
        onPress={canAskAgain ? onRetry : () => void Linking.openSettings()}
      />
      {canAskAgain ? null : (
        <CutCornerButton
          label="Check Again"
          onPress={onRetry}
        />
      )}
    </CutCornerSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 16
  },
  message: {
    color: colors.textMuted60,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8
  }
});
