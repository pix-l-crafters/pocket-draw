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
import { MapScreen } from "./src/features/map/MapScreen";
import type { CurrentUser } from "./src/features/map/types/map.types";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import { appTheme } from "./src/theme/appTheme";
import { colors } from "./src/theme/tokens";
// TODO(3.4)：接入真实的局数选择流程时，取消下面这行 import 的注释。
// import { RoundCountSelector } from "./src/features/challenge/RoundCountSelector";

// 将 Firebase 的 User 对象转换为各功能模块使用的精简用户数据。
function toCurrentUser(user: User): CurrentUser {
  return {
    uid: user.uid,
    displayName: user.displayName ?? user.email ?? "Player"
  };
}

export default function App() {
  // React hooks 必须放在组件顶层，并在每次渲染时保持相同的调用顺序。
  // 下面这些 state 分别控制登录状态、登录注册界面和主导航。
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "ble" | "challenge">(
    "map"
  );

  // 用一个可为 null 的对象同时保存选择器是否显示以及双方玩家 ID，避免状态不一致。
  // null 表示当前没有挑战设置；对象表示需要为这两名玩家显示局数选择器。
  const [pendingOpponent, setPendingOpponent] = useState<{
    challengerId: string;
    scannedPlayerId: string;
  } | null>(null);

  // 每个字体 hook 都会返回对应字体是否加载完成。
  const [barlowLoaded] = useBarlowFonts({ Barlow_400Regular });
  const [barlowCondensedLoaded] = useBarlowCondensedFonts({
    BarlowCondensed_700Bold
  });
  const [ibmPlexMonoLoaded] = useIBMPlexMonoFonts({ IBMPlexMono_400Regular });
  // 只有三种字体全部加载完成，应用才能使用自定义字体。
  const fontsLoaded =
    barlowLoaded && barlowCondensedLoaded && ibmPlexMonoLoaded;

  // App 挂载时订阅一次 Firebase 登录状态。
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    // App 卸载时取消 Firebase 监听，避免遗留无效订阅。
    return unsubscribe;
  }, []);

  // 登录状态尚未确认或任意字体尚未加载时，继续显示 Loading。
  const loading = authLoading || !fontsLoaded;

  // 临时的 3.4 测试 state（目前已停用；真实流程使用 pendingOpponent）。
  // const [showRoundSelector, setShowRoundSelector] = useState(true);

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
          <SafeAreaView edges={["top"]} style={styles.container}>
            <View style={styles.switcherContainer}>
              <SegmentedButtons
                buttons={[
                  { value: "map", label: "Map" },
                  { value: "ble", label: "BLE Scanner" },
                  { value: "challenge", label: "Challenge" }
                ]}
                onValueChange={(val) =>
                  setActiveTab(val as "map" | "ble" | "challenge")
                }
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
            {/* 根据主导航当前选择的标签渲染对应页面。 */}
            <View style={styles.screenContainer}>
              {activeTab === "map" ? (
                <MapScreen currentUser={toCurrentUser(user)} />
              ) : activeTab === "ble" ? (
                <BleScreen />
              ) : (
                <ChallengeScreen
                  currentUser={toCurrentUser(user)}
                  onOpponentConfirmed={(challengerId, scannedPlayerId) => {
                    // TODO(3.4): pick up here with the round-count
                    // selector, then 3.5's send-challenge-request logic.
                    setPendingOpponent({
                      challengerId,
                      scannedPlayerId
                    });
                  }}
                />
              )}
            </View>
            {/* 临时的 3.4 测试 UI（目前已停用，仅保留作参考）。
            <RoundCountSelector
              challengerId="challenger-123"
              scannedPlayerId="opponent-456"
              visible={showRoundSelector}
              onCancel={() => {
                console.log("Round selection cancelled");
                setShowRoundSelector(false);
              }}
              onRoundCountSelected={(handoff) => {
                console.log("Challenge handoff:", handoff);
                setShowRoundSelector(false);
              }}
            />
            */}
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
