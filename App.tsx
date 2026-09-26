import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { User } from "firebase/auth";
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
import { BottomNavigation, PaperProvider } from "react-native-paper";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { useAuthUser } from "./src/lib/useAuthUser";
import { ChallengeScreen } from "./src/features/challenge/ChallengeScreen";
import { ConnectingScreen } from "./src/features/challenge/ConnectingScreen";
import type { ChallengeHandoff } from "./src/contracts/challengeHandoff";
import type { DuelChannel } from "./src/contracts/duelChannel";
import { DuelScreen } from "./src/features/duel/DuelScreen";
import { GameInstructionsScreen } from "./src/features/duel/GameInstructionsScreen";
import { MapScreen } from "./src/features/map/MapScreen";
import { ProfileScreen } from "./src/features/profile/ProfileScreen";
import type { CurrentUser } from "./src/features/map/types/map.types";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import { challengeRequestRepository } from "./src/features/challenge/services/challengeRequestRepository";
import { appTheme } from "./src/theme/appTheme";
import { colors } from "./src/theme/tokens";

function toCurrentUser(user: User, displayName: string): CurrentUser {
  return { uid: user.uid, displayName };
}

type AppTab = "map" | "challenge" | "profile";

type ActiveDuel = {
  channel: DuelChannel;
};

const NAV_ROUTES: {
  key: AppTab;
  title: string;
  focusedIcon: string;
  unfocusedIcon: string;
}[] = [
  {
    key: "map",
    title: "Map",
    focusedIcon: "map-marker",
    unfocusedIcon: "map-marker-outline"
  },
  {
    key: "challenge",
    title: "Challenge",
    focusedIcon: "sword-cross",
    unfocusedIcon: "sword-cross"
  },
  {
    key: "profile",
    title: "Profile",
    focusedIcon: "account-circle",
    unfocusedIcon: "account-circle-outline"
  }
];

export default function App() {
  const { displayName, loading: authLoading, user } = useAuthUser();
  const [showRegister, setShowRegister] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>("map");
  const [pendingHandoff, setPendingHandoff] = useState<ChallengeHandoff | null>(
    null
  );
  const [activeDuel, setActiveDuel] = useState<ActiveDuel | null>(null);
  const [instructionsSeen, setInstructionsSeen] = useState(false);

  const exitDuel = () => {
    setActiveDuel(null);
    setInstructionsSeen(false);
    setPendingHandoff(null);
    setActiveTab("map");
  };
  const [barlowLoaded] = useBarlowFonts({ Barlow_400Regular });
  const [barlowCondensedLoaded] = useBarlowCondensedFonts({
    BarlowCondensed_700Bold
  });
  const [ibmPlexMonoLoaded] = useIBMPlexMonoFonts({ IBMPlexMono_400Regular });
  const fontsLoaded =
    barlowLoaded && barlowCondensedLoaded && ibmPlexMonoLoaded;

  const loading = authLoading || !fontsLoaded;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        {loading ? (
          // 登录状态或字体仍在加载。
          <View style={styles.authScreen}>
            <StatusBar style="light" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : !user ? (
          // 加载已经完成，但当前没有已登录用户，因此显示登录或注册界面。
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
          // 用户已经登录，因此显示应用主界面。
          <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
            {activeDuel ? (
              // 只有在与另一位玩家的对局中才显示 Duel 界面，不作为常驻标签。
              !instructionsSeen ? (
                <GameInstructionsScreen
                  onContinue={() => setInstructionsSeen(true)}
                />
              ) : (
                <DuelScreen channel={activeDuel.channel} onExit={exitDuel} />
              )
            ) : (
              <>
                <View style={styles.screenContainer}>
                  {activeTab === "map" ? (
                    <MapScreen currentUser={toCurrentUser(user, displayName)} />
                  ) : activeTab === "profile" ? (
                    <ProfileScreen
                      displayName={displayName}
                      email={user.email}
                      uid={user.uid}
                    />
                  ) : pendingHandoff ? (
                    <ConnectingScreen
                      handoff={pendingHandoff}
                      onConnected={(channel) => setActiveDuel({ channel })}
                      onExit={() => setPendingHandoff(null)}
                    />
                  ) : (
                    <ChallengeScreen
                      currentUser={toCurrentUser(user, displayName)}
                      onHostConnected={(channel) => setActiveDuel({ channel })}
                      onOpponentConfirmed={(opponent) => {
                        const handoff: ChallengeHandoff = {
                          ...opponent,
                          roundCount: 3
                        };
                        setPendingHandoff(handoff);
                        void challengeRequestRepository
                          .sendChallenge(handoff)
                          .catch((error) =>
                            console.error(
                              "Failed to send challenge request:",
                              error
                            )
                          );
                      }}
                    />
                  )}
                </View>
                <BottomNavigation.Bar
                  navigationState={{
                    index: NAV_ROUTES.findIndex(
                      (route) => route.key === activeTab
                    ),
                    routes: NAV_ROUTES
                  }}
                  onTabPress={({ route }) => setActiveTab(route.key)}
                />
              </>
            )}
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
  screenContainer: {
    flex: 1
  }
});
