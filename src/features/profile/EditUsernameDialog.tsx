import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, View } from "react-native";

import { CutCornerButton } from "../../components/CutCornerButton";
import { CutCornerSurface } from "../../components/CutCornerSurface";
import { DisplayHeading } from "../../components/DisplayHeading";
import { KickerLabel } from "../../components/KickerLabel";
import { updateUsername } from "../../lib/auth";
import { USERNAME_MAX_LENGTH, validateUsername } from "../../lib/username";
import { colors, fonts } from "../../theme/tokens";

type EditUsernameDialogProps = {
  currentUsername: string;
  onDismiss: () => void;
  visible: boolean;
};

export function EditUsernameDialog({
  currentUsername,
  onDismiss,
  visible
}: EditUsernameDialogProps) {
  const [username, setUsername] = useState(currentUsername);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setUsername(currentUsername);
      setError(null);
      setIsSaving(false);
    }
  }, [currentUsername, visible]);

  const save = async () => {
    const validation = validateUsername(username);

    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await updateUsername(validation.value);
      onDismiss();
    } catch {
      setIsSaving(false);
      setError("Could not save your username. Please try again.");
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onDismiss}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <CutCornerSurface corner="large" style={styles.card}>
          <KickerLabel>Profile</KickerLabel>
          <DisplayHeading size={30}>Edit Username</DisplayHeading>
          <Text style={styles.description}>
            This is the name other players see on the map and in challenges.
          </Text>

          <TextInput
            autoCapitalize="none"
            autoFocus
            maxLength={USERNAME_MAX_LENGTH}
            onChangeText={setUsername}
            placeholder="Username"
            placeholderTextColor={colors.textMuted45}
            style={styles.input}
            value={username}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <CutCornerButton
              disabled={isSaving}
              label="Save"
              onPress={() => void save()}
            />
            <CutCornerButton
              disabled={isSaving}
              label="Cancel"
              onPress={onDismiss}
            />
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
  input: {
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.border,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
    height: 54,
    paddingHorizontal: 16,
    width: "100%"
  },
  error: {
    color: colors.accent,
    fontFamily: fonts.body,
    fontSize: 14
  },
  actions: {
    gap: 12
  }
});
