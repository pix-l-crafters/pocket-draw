import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, View } from "react-native";

import { CutCornerButton } from "../../components/CutCornerButton";
import { CutCornerSurface } from "../../components/CutCornerSurface";
import { DisplayHeading } from "../../components/DisplayHeading";
import { KickerLabel } from "../../components/KickerLabel";
import { changePassword } from "../../lib/auth";
import { colors, fonts } from "../../theme/tokens";

const MIN_PASSWORD_LENGTH = 6;

type ChangePasswordDialogProps = {
  onDismiss: () => void;
  onSuccess: () => void;
  visible: boolean;
};

// Firebase error codes are not user-facing copy; map them the way LoginScreen
// already collapses auth failures into one readable line.
function messageForError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
    return "Current password is incorrect.";
  }

  if (code === "auth/weak-password") {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (code === "auth/too-many-requests") {
    return "Too many attempts. Please try again later.";
  }

  return "Could not change your password. Please try again.";
}

export function ChangePasswordDialog({
  onDismiss,
  onSuccess,
  visible
}: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setIsSaving(false);
    }
  }, [visible]);

  const save = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please complete all fields.");
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await changePassword(currentPassword, newPassword);
      onSuccess();
    } catch (caught) {
      setIsSaving(false);
      setError(messageForError(caught));
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
          <KickerLabel>Security</KickerLabel>
          <DisplayHeading size={30}>Change Password</DisplayHeading>
          <Text style={styles.description}>
            Enter your current password to confirm it is you.
          </Text>

          <TextInput
            onChangeText={setCurrentPassword}
            placeholder="Current password"
            placeholderTextColor={colors.textMuted45}
            secureTextEntry
            style={styles.input}
            value={currentPassword}
          />

          <TextInput
            onChangeText={setNewPassword}
            placeholder="New password"
            placeholderTextColor={colors.textMuted45}
            secureTextEntry
            style={styles.input}
            value={newPassword}
          />

          <TextInput
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor={colors.textMuted45}
            secureTextEntry
            style={styles.input}
            value={confirmPassword}
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
    gap: 12,
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
    gap: 12,
    marginTop: 2
  }
});
