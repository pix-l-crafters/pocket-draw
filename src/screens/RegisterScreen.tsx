import { useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";

import { registerUser } from "../lib/auth";
import { CutCornerButton } from "../components/CutCornerButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { colors, fonts } from "../theme/tokens";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Missing information", "Please complete all fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    try {
      await registerUser(email.trim(), password);
    } catch {
      Alert.alert("Registration failed", "Please check your details.");
    }
  };

  return (
    <View style={styles.card}>
      <ScreenHeader
        kicker="Pocket Draw"
        subtitle="Join Pocket Draw and challenge nearby players"
        title="Create Account"
      />

      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={colors.textMuted45}
        style={styles.input}
        value={email}
      />

      <TextInput
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={colors.textMuted45}
        secureTextEntry
        style={styles.input}
        value={password}
      />

      <TextInput
        onChangeText={setConfirmPassword}
        placeholder="Confirm password"
        placeholderTextColor={colors.textMuted45}
        secureTextEntry
        style={styles.input}
        value={confirmPassword}
      />

      <CutCornerButton
        label="Create Account"
        onPress={() => void handleRegister()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    maxWidth: 380,
    width: "100%"
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
    height: 54,
    marginBottom: 14,
    paddingHorizontal: 16,
    width: "100%"
  }
});
