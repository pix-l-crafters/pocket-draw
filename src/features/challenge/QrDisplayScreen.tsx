import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SegmentedButtons } from "react-native-paper";
import QRCode from "react-native-qrcode-svg";

import { CutCornerButton } from "../../components/CutCornerButton";
import { CutCornerSurface } from "../../components/CutCornerSurface";
import { PermissionNotice } from "../../components/PermissionNotice";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusTag } from "../../components/StatusTag";
import type { DuelConnectionInfo } from "../../contracts/duelConnection";
import type { DuelLink } from "../../contracts/duelLink";
import { PermissionDeniedError } from "../../lib/appPermissions";
import { useForegroundRecheck } from "../../lib/useForegroundRecheck";
import { colors, fonts } from "../../theme/tokens";
import type { QrInvitePayload } from "../qr/types/qr.types";
import {
  isValidHotspotPassword,
  isValidWifiSsid
} from "../qr/utils/ip.validation";
import {
  generateChallengeToken,
  generateDiscoveryToken,
  generateMatchId
} from "../qr/utils/qr.tokens";
import {
  getExistingWifiHostIp,
  subscribeToNetworkChanges
} from "./network/existingWifi";
import {
  type HotspotNetwork,
  startAndroidLocalOnlyHotspot,
  stopAndroidLocalOnlyHotspot
} from "./network/hotspot";
import { createDuelLink } from "./session/duelLink";
import {
  reconnectNativeWebRtcDuelHost,
  startNativeWebRtcDuelHost
} from "./webrtc/nativeWebRtcTransport";

const INVITE_LIFETIME_MS = 60_000;
const IOS_PERSONAL_HOTSPOT_IP = "172.20.10.1";

type QrDisplayScreenProps = {
  currentUser: { displayName: string; uid: string };
  /** A guest authenticated; the returned link owns the session from here. */
  onHostConnected?: (link: DuelLink, invite: QrInvitePayload) => void;
};

type InviteIdentity = Omit<QrInvitePayload, "connection">;
type ConnectionMode = DuelConnectionInfo["mode"];

function toSetupError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback);
}

function createInviteIdentity(
  hostUid: string,
  hostDisplayName: string
): InviteIdentity {
  const issuedAt = Date.now();
  return {
    type: "pocket-draw/invite",
    version: 1,
    matchId: generateMatchId(),
    hostPlayerId: hostUid,
    hostPlayerName: hostDisplayName,
    challengeToken: generateChallengeToken(),
    discoveryToken: generateDiscoveryToken(),
    issuedAt,
    expiresAt: issuedAt + INVITE_LIFETIME_MS,
    transport: "webrtc"
  };
}

export function QrDisplayScreen({
  currentUser,
  onHostConnected
}: QrDisplayScreenProps) {
  const [connectionMode, setConnectionMode] =
    useState<ConnectionMode>("existingWifi");
  const [manualSsid, setManualSsid] = useState("");
  const [manualPassword, setManualPassword] = useState("");
  const [identity, setIdentity] = useState<InviteIdentity>(() =>
    createInviteIdentity(currentUser.uid, currentUser.displayName)
  );
  const [invite, setInvite] = useState<QrInvitePayload | null>(null);
  const [androidHotspot, setAndroidHotspot] = useState<HotspotNetwork | null>(
    null
  );
  // Once a guest connects over the hotspot, the duel depends on it, so leaving
  // this screen must not tear the hotspot down.
  const hotspotHandedOff = useRef(false);
  // An Error rather than a string, so a refused permission can be told apart
  // from an ordinary setup failure and offered the right recovery.
  const [setupError, setSetupError] = useState<Error | null>(null);
  // Bumped to re-run the hotspot effect after a refused permission is granted.
  const [hotspotAttempt, setHotspotAttempt] = useState(0);
  // Survives the regeneration it triggers, so the host sees why the code
  // changed under them.
  const [joinFailure, setJoinFailure] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((identity.expiresAt - Date.now()) / 1000))
  );

  const regenerate = useCallback(() => {
    setInvite(null);
    setIdentity(createInviteIdentity(currentUser.uid, currentUser.displayName));
  }, [currentUser.displayName, currentUser.uid]);

  const changeConnectionMode = useCallback(
    (value: string) => {
      setConnectionMode(value as ConnectionMode);
      setJoinFailure(null);
      regenerate();
    },
    [regenerate]
  );

  useEffect(() => {
    if (connectionMode !== "existingWifi") return undefined;
    return subscribeToNetworkChanges(regenerate);
  }, [connectionMode, regenerate]);

  // Regenerating alone only rotates the invite — the hotspot effect below is
  // keyed on the mode, so retrying a refused permission needs its own trigger.
  const retrySetup = useCallback(() => {
    setSetupError(null);
    setHotspotAttempt((attempt) => attempt + 1);
    regenerate();
  }, [regenerate]);

  // A permission granted in Settings only reaches this screen on the way back,
  // so retry there rather than making the player restart the app.
  const retryAfterSettings = useCallback(() => {
    if (setupError instanceof PermissionDeniedError) retrySetup();
  }, [retrySetup, setupError]);
  useForegroundRecheck(retryAfterSettings);

  // The Android hotspot outlives individual invites: regenerating a QR code
  // must not rotate the SSID/password or drop a guest who is already joining.
  useEffect(() => {
    if (connectionMode !== "hotspot" || Platform.OS !== "android") {
      return undefined;
    }
    let active = true;
    hotspotHandedOff.current = false;
    startAndroidLocalOnlyHotspot().then(
      (network) => {
        if (active) setAndroidHotspot(network);
      },
      (error: unknown) => {
        if (!active) return;
        setSetupError(
          toSetupError(error, "Could not create an Android hotspot.")
        );
      }
    );
    return () => {
      active = false;
      setAndroidHotspot(null);
      if (!hotspotHandedOff.current) stopAndroidLocalOnlyHotspot();
    };
  }, [connectionMode, hotspotAttempt]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let stopHost: (() => void) | null = null;

    if (
      connectionMode === "hotspot" &&
      Platform.OS === "android" &&
      !androidHotspot
    ) {
      setInvite(null);
      return undefined;
    }

    setSetupError(null);
    setInvite(null);
    setSecondsLeft(
      Math.max(0, Math.ceil((identity.expiresAt - Date.now()) / 1000))
    );

    const startHost = async () => {
      try {
        let connection: DuelConnectionInfo;
        if (connectionMode === "existingWifi") {
          connection = {
            mode: "existingWifi",
            hostIp: await getExistingWifiHostIp(),
            signalPort: 0
          };
        } else if (Platform.OS === "android" && androidHotspot) {
          connection = {
            mode: "hotspot",
            ...androidHotspot,
            signalPort: 0
          };
        } else if (Platform.OS === "ios") {
          if (
            !isValidWifiSsid(manualSsid) ||
            !isValidHotspotPassword(manualPassword)
          ) {
            return;
          }
          connection = {
            mode: "hotspot",
            ssid: manualSsid.trim(),
            password: manualPassword,
            hostIp: IOS_PERSONAL_HOTSPOT_IP,
            signalPort: 0
          };
        } else {
          throw new Error(
            "Hotspot hosting is supported on Android and iOS only."
          );
        }

        const auth = {
          matchId: identity.matchId,
          challengeToken: identity.challengeToken,
          discoveryToken: identity.discoveryToken
        };
        const host = await startNativeWebRtcDuelHost(auth, {
          signal: controller.signal
        });
        stopHost = host.stop;
        if (!active) {
          host.stop();
          return;
        }

        const readyInvite: QrInvitePayload = {
          ...identity,
          connection: { ...connection, signalPort: host.port }
        };
        setInvite(readyInvite);

        void host.connection.then(
          (duelConnection) => {
            if (!active) {
              duelConnection.disconnect();
              return;
            }
            const ownsAndroidHotspot =
              connection.mode === "hotspot" && Platform.OS === "android";
            if (ownsAndroidHotspot) hotspotHandedOff.current = true;
            onHostConnected?.(
              createDuelLink({
                connection: duelConnection,
                reconnect: (signal) =>
                  reconnectNativeWebRtcDuelHost(auth, host.port, signal),
                release: ownsAndroidHotspot
                  ? () => stopAndroidLocalOnlyHotspot()
                  : undefined
              }),
              readyInvite
            );
          },
          (error: unknown) => {
            if (!active || controller.signal.aborted) return;
            // The listener closed with this attempt (wrong code, or a guest
            // that dropped mid-handshake). A fresh code listens again rather
            // than leaving a dead QR on screen.
            setJoinFailure(
              error instanceof Error
                ? error.message
                : "The local duel connection failed."
            );
            regenerate();
          }
        );
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setSetupError(
          toSetupError(error, "Could not create a local duel invite.")
        );
      }
    };

    void startHost();
    return () => {
      active = false;
      controller.abort();
      stopHost?.();
    };
  }, [
    androidHotspot,
    connectionMode,
    identity,
    manualPassword,
    manualSsid,
    onHostConnected,
    regenerate
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remainingMs = identity.expiresAt - Date.now();
      if (remainingMs <= 0) {
        regenerate();
        return;
      }
      setSecondsLeft(Math.ceil(remainingMs / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [identity.expiresAt, regenerate]);

  const waitingForIosDetails =
    connectionMode === "hotspot" &&
    Platform.OS === "ios" &&
    (!isValidWifiSsid(manualSsid) || !isValidHotspotPassword(manualPassword));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          kicker="Challenge"
          subtitle={
            connectionMode === "existingWifi"
              ? "Keep both devices on the same Wi-Fi, then have your opponent scan this code."
              : "No shared Wi-Fi? Your phone becomes the network, and the QR code carries the details so they can join it."
          }
          title="Your QR Code"
        />
        <SegmentedButtons
          buttons={[
            { value: "existingWifi", label: "Shared Wi-Fi" },
            { value: "hotspot", label: "Hotspot" }
          ]}
          onValueChange={changeConnectionMode}
          value={connectionMode}
        />

        {connectionMode === "hotspot" && Platform.OS === "ios" ? (
          <CutCornerSurface
            corner="small"
            style={styles.instructionsCard}
          >
            <Text style={styles.instructions}>
              Enable Personal Hotspot in iOS Settings, then enter its Wi-Fi name
              and password below.
            </Text>
            <TextInput
              accessibilityLabel="Personal Hotspot Wi-Fi name"
              autoCapitalize="none"
              onChangeText={setManualSsid}
              placeholder="Hotspot Wi-Fi name"
              placeholderTextColor={colors.textMuted60}
              style={styles.input}
              value={manualSsid}
            />
            <TextInput
              accessibilityLabel="Personal Hotspot password"
              autoCapitalize="none"
              onChangeText={setManualPassword}
              placeholder="Password (8–63 characters)"
              placeholderTextColor={colors.textMuted60}
              secureTextEntry
              style={styles.input}
              value={manualPassword}
            />
          </CutCornerSurface>
        ) : null}

        <CutCornerSurface
          corner="large"
          style={styles.qrCard}
        >
          {invite ? (
            <View style={styles.qrWrapper}>
              <QRCode
                backgroundColor={colors.text}
                color={colors.background}
                size={220}
                value={JSON.stringify(invite)}
              />
            </View>
          ) : null}
          {joinFailure && !setupError ? (
            <StatusTag tone="warning">
              {`A join attempt failed (${joinFailure}). This is a fresh code.`}
            </StatusTag>
          ) : null}
          {setupError instanceof PermissionDeniedError ? (
            <PermissionNotice
              canAskAgain={setupError.canAskAgain}
              capability={setupError.capability}
              message="Hosting over your own hotspot needs it. Until then, switch to Shared Wi-Fi and put both phones on the same network."
              onRetry={retrySetup}
            />
          ) : setupError ? (
            <StatusTag tone="warning">{setupError.message}</StatusTag>
          ) : waitingForIosDetails ? (
            <StatusTag>Enter your Personal Hotspot details above.</StatusTag>
          ) : invite ? (
            <StatusTag tone={secondsLeft <= 10 ? "warning" : "muted"}>
              {`${invite.connection.mode === "hotspot" ? `${invite.connection.ssid} · ` : ""}${invite.connection.hostIp}:${invite.connection.signalPort} · refreshes in ${secondsLeft}s`}
            </StatusTag>
          ) : (
            <StatusTag>
              {connectionMode === "hotspot" && Platform.OS === "android"
                ? "Creating Android hotspot…"
                : "Starting local connection…"}
            </StatusTag>
          )}
        </CutCornerSurface>
        <CutCornerButton
          label="Generate New Code"
          onPress={() => {
            setJoinFailure(null);
            regenerate();
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 16,
    padding: 16,
    paddingBottom: 32
  },
  input: {
    borderColor: colors.textMuted60,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  instructions: {
    color: colors.textMuted60,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20
  },
  instructionsCard: {
    gap: 10,
    padding: 14
  },
  qrCard: {
    alignItems: "center",
    gap: 14,
    minHeight: 310,
    paddingVertical: 28
  },
  qrWrapper: {
    backgroundColor: colors.text,
    borderRadius: 4,
    padding: 16
  }
});
