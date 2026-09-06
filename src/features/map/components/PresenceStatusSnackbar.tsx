import { StyleSheet } from "react-native";
import { Portal, Snackbar } from "react-native-paper";

import type { PresencePublishState } from "../types/map.types";

type PresenceStatusSnackbarProps = {
  onDismiss: () => void;
  onRetry: () => void;
  presenceState: PresencePublishState;
};

export function PresenceStatusSnackbar({
  onDismiss,
  onRetry,
  presenceState
}: PresenceStatusSnackbarProps) {
  const errorMessage =
    presenceState.status === "error" ? presenceState.message : "";

  return (
    <Portal>
      <Snackbar
        action={{ label: "Retry", onPress: onRetry }}
        duration={Snackbar.DURATION_LONG}
        elevation={4}
        icon="close"
        iconAccessibilityLabel="Dismiss presence error"
        onDismiss={onDismiss}
        onIconPress={onDismiss}
        visible={presenceState.status === "error"}
        wrapperStyle={styles.wrapper}
      >
        Could not share your location. {errorMessage}
      </Snackbar>
    </Portal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    bottom: 76
  }
});
