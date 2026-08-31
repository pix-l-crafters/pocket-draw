import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import { registerUser } from "../lib/auth";

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
      <Text style={styles.logo}>⚡</Text>

      <Text style={styles.title}>Create Account</Text>

      <Text style={styles.subtitle}>
        Join Pocket Draw and challenge nearby players
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#8B8B95"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#8B8B95"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm password"
        placeholderTextColor="#8B8B95"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Create Account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 380,
  },

  logo: {
    fontSize: 46,
    textAlign: "center",
    marginBottom: 10,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },

  subtitle: {
    color: "#A7A7B2",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 28,
  },

  input: {
    width: "100%",
    height: 54,
    backgroundColor: "#1C1C24",
    borderWidth: 1,
    borderColor: "#32323D",
    borderRadius: 14,
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 14,
  },

  button: {
    width: "100%",
    height: 54,
    backgroundColor: "#7C5CFC",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});