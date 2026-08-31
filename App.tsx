import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";

import { auth } from "./src/lib/firebase";
import { logoutUser } from "./src/lib/auth";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    if (showRegister) {
      return (
        <View style={styles.container}>
          <StatusBar style="light" />

          <RegisterScreen />

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setShowRegister(false)}
          >
            <Text style={styles.switchText}>
              Already have an account?{" "}
              <Text style={styles.switchHighlight}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <StatusBar style="light" />

        <LoginScreen />

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setShowRegister(true)}
        >
          <Text style={styles.switchText}>
            Don&apos;t have an account?{" "}
            <Text style={styles.switchHighlight}>Register</Text>
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.welcomeCard}>
        <Text style={styles.logo}>⚡</Text>

        <Text style={styles.welcomeTitle}>Welcome to Pocket Draw</Text>

        <Text style={styles.welcomeSubtitle}>
          You&apos;re ready for your next duel.
        </Text>

        <View style={styles.userBox}>
          <Text style={styles.userLabel}>Signed in as</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logoutUser}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0F14",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  loadingText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },

  switchButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },

  switchText: {
    color: "#A7A7B2",
    fontSize: 15,
    textAlign: "center",
  },

  switchHighlight: {
    color: "#9A83FF",
    fontWeight: "700",
  },

  welcomeCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#17171F",
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: "#2C2C38",
    alignItems: "center",
  },

  logo: {
    fontSize: 48,
    marginBottom: 12,
  },

  welcomeTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },

  welcomeSubtitle: {
    color: "#A7A7B2",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 28,
  },

  userBox: {
    width: "100%",
    backgroundColor: "#1F1F29",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 18,
  },

  userLabel: {
    color: "#8B8B95",
    fontSize: 13,
    marginBottom: 5,
  },

  userEmail: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  logoutButton: {
    width: "100%",
    height: 54,
    backgroundColor: "#7C5CFC",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});