import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";
import { PaperProvider, SegmentedButtons } from "react-native-paper";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { auth } from "./src/lib/firebase";
import { logoutUser } from "./src/lib/auth";
import { BleScreen } from "./src/features/ble/BleScreen";
import { MapScreen } from "./src/features/map/MapScreen";
import type { CurrentUser } from "./src/features/map/types/map.types";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import { appTheme } from "./src/theme/appTheme";

function toCurrentUser(user: User): CurrentUser {
  return {
    uid: user.uid,
    displayName: user.displayName ?? user.email ?? "Player"
  };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "ble">("map");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.authScreen}>
        <StatusBar style="light" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    if (showRegister) {
      return (
        <View style={styles.authScreen}>
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
      <View style={styles.authScreen}>
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
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <SafeAreaView edges={["top"]} style={styles.container}>
          <View style={styles.switcherContainer}>
            <SegmentedButtons
              buttons={[
                { value: "map", label: "Map" },
                { value: "ble", label: "BLE Scanner" }
              ]}
              onValueChange={(val) => setActiveTab(val as "map" | "ble")}
              style={styles.switcher}
              value={activeTab}
            />
            <TouchableOpacity onPress={logoutUser} style={styles.logoutButton}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.screenContainer}>
            {activeTab === "map" ? (
              <MapScreen currentUser={toCurrentUser(user)} />
            ) : (
              <BleScreen />
            )}
          </View>
        </SafeAreaView>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  authScreen: {
    flex: 1,
    backgroundColor: "#0F0F14",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28
  },

  loadingText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600"
  },

  switchButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 10
  },

  switchText: {
    color: "#A7A7B2",
    fontSize: 15,
    textAlign: "center"
  },

  switchHighlight: {
    color: "#9A83FF",
    fontWeight: "700"
  },

  container: {
    flex: 1,
    backgroundColor: "#fff"
  },

  switcherContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fff"
  },

  switcher: {
    flex: 1
  },

  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12
  },

  logoutButtonText: {
    color: "#B42318",
    fontSize: 14,
    fontWeight: "600"
  },

  screenContainer: {
    flex: 1
  }
});
