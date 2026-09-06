import { useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";

import { loginUser } from "../lib/auth";
import { CutCornerButton } from "../components/CutCornerButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { colors, fonts } from "../theme/tokens";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(
        "Missing information",
        "Please enter your email and password."
      );
      return;
    }

    try {
      await loginUser(email.trim(), password);
    } catch {
      Alert.alert("Login failed", "Invalid email or password.");
    }
  };

  return (
    <View style={styles.card}>
      <ScreenHeader
        kicker="Pocket Draw"
        subtitle="Sign in and get ready for your next duel"
        title="Login"
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

      <CutCornerButton label="Login" onPress={() => void handleLogin()} />
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
