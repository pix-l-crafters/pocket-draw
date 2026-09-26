import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { SegmentedButtons } from "react-native-paper";
import QRCode from "react-native-qrcode-svg";

import { CutCornerButton } from "../../components/CutCornerButton";
import { CutCornerSurface } from "../../components/CutCornerSurface";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusTag } from "../../components/StatusTag";
import type { DuelConnectionInfo } from "../../contracts/duelConnection";
import type { DuelChannel } from "../../contracts/duelChannel";
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
import { startNativeWebRtcDuelHost } from "./webrtc/nativeWebRtcTransport";

const INVITE_LIFETIME_MS = 60_000;
const IOS_PERSONAL_HOTSPOT_IP = "172.20.10.1";

type QrDisplayScreenProps = {
  currentUser: { displayName: string; uid: string };
  onHostConnected?: (channel: DuelChannel, invite: QrInvitePayload) => void;
};

type InviteIdentity = Omit<QrInvitePayload, "connection">;
type ConnectionMode = DuelConnectionInfo["mode"];

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
  const [setupError, setSetupError] = useState<string | null>(null);
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
      regenerate();
    },
    [regenerate]
  );

  useEffect(() => {
    if (connectionMode !== "existingWifi") return undefined;
    return subscribeToNetworkChanges(regenerate);
  }, [connectionMode, regenerate]);

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
          error instanceof Error
            ? error.message
            : "Could not create an Android hotspot."
        );
      }
    );
    return () => {
      active = false;
      setAndroidHotspot(null);
      if (!hotspotHandedOff.current) stopAndroidLocalOnlyHotspot();
    };
  }, [connectionMode]);

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

        const host = await startNativeWebRtcDuelHost(
          {
            matchId: identity.matchId,
            challengeToken: identity.challengeToken,
            discoveryToken: identity.discoveryToken
          },
          { signal: controller.signal }
        );
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
            if (!active) return;
            if (connection.mode === "hotspot") hotspotHandedOff.current = true;
            onHostConnected?.(duelConnection.channel, readyInvite);
          },
          (error: unknown) => {
            if (!active || controller.signal.aborted) return;
            setSetupError(
              error instanceof Error
                ? error.message
                : "The local duel connection failed."
            );
          }
        );
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setSetupError(
          error instanceof Error
            ? error.message
            : "Could not create a local duel invite."
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
    onHostConnected
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
    <View style={styles.container}>
      <ScreenHeader
        kicker="Challenge"
        subtitle={
          connectionMode === "existingWifi"
            ? "Keep both devices on the same Wi-Fi, then have your opponent scan this code."
            : "Create or enable a hotspot, then have your opponent scan to join it."
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
        <CutCornerSurface corner="small" style={styles.instructionsCard}>
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

      <CutCornerSurface corner="large" style={styles.qrCard}>
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
        {setupError ? (
          <StatusTag tone="warning">{setupError}</StatusTag>
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
      <CutCornerButton label="Generate New Code" onPress={regenerate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    gap: 16,
    padding: 16
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
