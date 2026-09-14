import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  Barlow_400Regular,
  useFonts as useBarlowFonts
} from "@expo-google-fonts/barlow";
import {
  BarlowCondensed_700Bold,
  useFonts as useBarlowCondensedFonts
} from "@expo-google-fonts/barlow-condensed";
import {
  IBMPlexMono_400Regular,
  useFonts as useIBMPlexMonoFonts
} from "@expo-google-fonts/ibm-plex-mono";
import { PaperProvider, SegmentedButtons } from "react-native-paper";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { auth } from "./src/lib/firebase";
import { logoutUser } from "./src/lib/auth";
import { BleScreen } from "./src/features/ble/BleScreen";
import { ChallengeScreen } from "./src/features/challenge/ChallengeScreen";
import { ConnectingScreen } from "./src/features/challenge/ConnectingScreen";
import type { ChallengeHandoff } from "./src/contracts/challengeHandoff";
import { DuelScreen } from "./src/features/duel/DuelScreen";
import { MapScreen } from "./src/features/map/MapScreen";
import type { CurrentUser } from "./src/features/map/types/map.types";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import { appTheme } from "./src/theme/appTheme";
import { colors } from "./src/theme/tokens";

function toCurrentUser(user: User): CurrentUser {
  return {
    uid: user.uid,
    displayName: user.displayName ?? user.email ?? "Player"
  };
}

type AppTab = "map" | "ble" | "challenge" | "duel";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>("map");
  const [pendingHandoff, setPendingHandoff] = useState<ChallengeHandoff | null>(
    null
  );
  const [barlowLoaded] = useBarlowFonts({ Barlow_400Regular });
  const [barlowCondensedLoaded] = useBarlowCondensedFonts({
    BarlowCondensed_700Bold
  });
  const [ibmPlexMonoLoaded] = useIBMPlexMonoFonts({ IBMPlexMono_400Regular });
  const fontsLoaded =
    barlowLoaded && barlowCondensedLoaded && ibmPlexMonoLoaded;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  const loading = authLoading || !fontsLoaded;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        {loading ? (
          <View style={styles.authScreen}>
            <StatusBar style="light" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : !user ? (
          showRegister ? (
            <View style={styles.authScreen}>
              <StatusBar style="light" />

              <RegisterScreen />

              <TouchableOpacity
                onPress={() => setShowRegister(false)}
                style={styles.switchButton}
              >
                <Text style={styles.switchText}>
                  Already have an account?{" "}
                  <Text style={styles.switchHighlight}>Login</Text>
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.authScreen}>
              <StatusBar style="light" />

              <LoginScreen />

              <TouchableOpacity
                onPress={() => setShowRegister(true)}
                style={styles.switchButton}
              >
                <Text style={styles.switchText}>
                  Don&apos;t have an account?{" "}
                  <Text style={styles.switchHighlight}>Register</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          <SafeAreaView edges={["top"]} style={styles.container}>
            <View style={styles.switcherContainer}>
              <SegmentedButtons
                buttons={[
                  { value: "map", label: "Map" },
                  { value: "ble", label: "BLE Scanner" },
                  { value: "challenge", label: "Challenge" },
                  { value: "duel", label: "Duel" }
                ]}
                onValueChange={(val) => setActiveTab(val as AppTab)}
                style={styles.switcher}
                value={activeTab}
              />
              <TouchableOpacity
                onPress={logoutUser}
                style={styles.logoutButton}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.screenContainer}>
              {activeTab === "map" ? (
                <MapScreen currentUser={toCurrentUser(user)} />
              ) : activeTab === "ble" ? (
                <BleScreen />
              ) : activeTab === "duel" ? (
                <DuelScreen />
              ) : pendingHandoff ? (
                <ConnectingScreen
                  handoff={pendingHandoff}
                  onConnected={(_channel, handoff) => {
                    // TODO(4.x): hand the channel to the duel screens once they
                    // exist (Tanachat/Tianze). For now the session just proves
                    // it can connect.
                    console.log(
                      "Duel channel ready for match",
                      handoff.matchId
                    );
                  }}
                  onExit={() => setPendingHandoff(null)}
                />
              ) : (
                <ChallengeScreen
                  currentUser={toCurrentUser(user)}
                  onChallengeSent={(handoff) => setPendingHandoff(handoff)}
                />
              )}
            </View>
          </SafeAreaView>
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  authScreen: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28
  },
  loadingText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600"
  },
  switchButton: {
    marginTop: 24,
    paddingHorizontal: 10,
    paddingVertical: 12
  },
  switchText: {
    color: colors.textMuted60,
    fontSize: 15,
    textAlign: "center"
  },
  switchHighlight: {
    color: colors.accent,
    fontWeight: "700"
  },
  container: {
    backgroundColor: colors.background,
    flex: 1
  },
  switcherContainer: {
    alignItems: "center",
    backgroundColor: colors.background,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  switcher: {
    flex: 1
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  logoutButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600"
  },
  screenContainer: {
    flex: 1
  }
});
