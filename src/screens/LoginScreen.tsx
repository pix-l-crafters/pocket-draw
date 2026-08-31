import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import { loginUser } from "../lib/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing information", "Please enter your email and password.");
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
      <Text style={styles.logo}>⚡</Text>

      <Text style={styles.title}>Pocket Draw</Text>

      <Text style={styles.subtitle}>
        Sign in and get ready for your next duel
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

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
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
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },

  subtitle: {
    color: "#A7A7B2",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 32,
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