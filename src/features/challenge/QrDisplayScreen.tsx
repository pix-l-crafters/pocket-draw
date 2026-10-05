import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusTag } from "../../components/StatusTag";
import type { DuelChannel } from "../../contracts/duelChannel";
import type { DuelConnectionInfo } from "../../contracts/duelConnection";
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
import { adoptDuelConnection } from "./session/localDuelSession";
import { startNativeWebRtcDuelHost } from "./webrtc/nativeWebRtcTransport";
import {
  isAuthorizedPeer,
  type WebRtcSessionAuth
} from "./webrtc/signalingProtocol";

const INVITE_LIFETIME_MS = 60_000;
/**
 * How long a code is still honoured after the screen moves on to a newer one.
 * Scanning is only the start: the guest confirms, picks rounds, and may join a
 * hotspot before its first connection attempt reaches this device.
 */
const INVITE_GRACE_MS = 60_000;
const IOS_PERSONAL_HOTSPOT_IP = "172.20.10.1";

type QrDisplayScreenProps = {
  currentUser: { displayName: string; uid: string };
  onHostConnected?: (channel: DuelChannel, invite: QrInvitePayload) => void;
};

type InviteIdentity = Omit<QrInvitePayload, "connection">;
type ConnectionMode = DuelConnectionInfo["mode"];
type RetiredInvite = { identity: InviteIdentity; acceptUntil: number };

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

function sessionAuthOf(identity: InviteIdentity): WebRtcSessionAuth {
  return {
    matchId: identity.matchId,
    challengeToken: identity.challengeToken,
    discoveryToken: identity.discoveryToken
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
  // Where the signaling server listens. It outlives individual codes, so a
  // refresh changes only the credentials and the port stays reachable.
  const [endpoint, setEndpoint] = useState<DuelConnectionInfo | null>(null);
  // Bumped to restart the server (and an Android hotspot) on the same settings.
  const [restartKey, setRestartKey] = useState(0);
  const [androidHotspot, setAndroidHotspot] = useState<HotspotNetwork | null>(
    null
  );
  // Once a guest connects over the hotspot, the duel depends on it, so leaving
  // this screen must not tear the hotspot down; the duel session releases it.
  const hotspotHandedOff = useRef(false);
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const endpointRef = useRef(endpoint);
  endpointRef.current = endpoint;
  const retiredInvites = useRef(new Map<string, RetiredInvite>());
  const [setupError, setSetupError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((identity.expiresAt - Date.now()) / 1000))
  );

  const regenerate = useCallback(() => {
    const now = Date.now();
    for (const [matchId, retired] of retiredInvites.current) {
      if (retired.acceptUntil <= now) retiredInvites.current.delete(matchId);
    }
    const previous = identityRef.current;
    retiredInvites.current.set(previous.matchId, {
      identity: previous,
      acceptUntil: now + INVITE_GRACE_MS
    });
    setIdentity(createInviteIdentity(currentUser.uid, currentUser.displayName));
  }, [currentUser.displayName, currentUser.uid]);

  const changeConnectionMode = useCallback(
    (value: string) => {
      // The other mode's error does not apply, and the new mode may wait on
      // a hotspot or typed details before its server effect clears it.
      setSetupError(null);
      setConnectionMode(value as ConnectionMode);
      regenerate();
    },
    [regenerate]
  );

  const generateNewCode = useCallback(() => {
    regenerate();
    // A fresh code cannot fix a server or hotspot that never started.
    if (setupError) setRestartKey((key) => key + 1);
  }, [regenerate, setupError]);

  // Network events also fire for reachability changes that keep the same
  // address; only a new address (or losing Wi-Fi) restarts the server.
  useEffect(() => {
    if (connectionMode !== "existingWifi") return undefined;
    let active = true;
    const unsubscribe = subscribeToNetworkChanges(() => {
      void getExistingWifiHostIp()
        .then(
          (hostIp) => hostIp !== endpointRef.current?.hostIp,
          () => true
        )
        .then((changed) => {
          if (active && changed) setRestartKey((key) => key + 1);
        });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [connectionMode]);

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
  }, [connectionMode, restartKey]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let stopHost: (() => void) | null = null;

    setEndpoint(null);
    if (
      connectionMode === "hotspot" &&
      Platform.OS === "android" &&
      !androidHotspot
    ) {
      return undefined;
    }
    if (
      connectionMode === "hotspot" &&
      Platform.OS === "ios" &&
      (!isValidWifiSsid(manualSsid) || !isValidHotspotPassword(manualPassword))
    ) {
      return undefined;
    }
    setSetupError(null);

    // The current code, or a recently replaced one still inside its grace.
    const authorize = (received: WebRtcSessionAuth) => {
      if (isAuthorizedPeer(sessionAuthOf(identityRef.current), received)) {
        return true;
      }
      const retired = retiredInvites.current.get(received.matchId);
      return (
        retired !== undefined &&
        retired.acceptUntil > Date.now() &&
        isAuthorizedPeer(sessionAuthOf(retired.identity), received)
      );
    };

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

        const host = await startNativeWebRtcDuelHost(authorize, {
          signal: controller.signal
        });
        stopHost = host.stop;
        if (!active) {
          host.stop();
          return;
        }
        const listening: DuelConnectionInfo = {
          ...connection,
          signalPort: host.port
        };
        setEndpoint(listening);

        void host.connection.then(
          ({ connection: duelConnection, auth }) => {
            if (!active) {
              duelConnection.disconnect();
              return;
            }
            const scanned =
              auth.matchId === identityRef.current.matchId
                ? identityRef.current
                : (retiredInvites.current.get(auth.matchId)?.identity ??
                  identityRef.current);
            if (listening.mode === "hotspot") hotspotHandedOff.current = true;
            adoptDuelConnection(duelConnection);
            onHostConnected?.(duelConnection.channel, {
              ...scanned,
              connection: listening
            });
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
    manualPassword,
    manualSsid,
    onHostConnected,
    restartKey
  ]);

  useEffect(() => {
    setSecondsLeft(
      Math.max(0, Math.ceil((identity.expiresAt - Date.now()) / 1000))
    );
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

  const invite = useMemo<QrInvitePayload | null>(
    () => (endpoint ? { ...identity, connection: endpoint } : null),
    [endpoint, identity]
  );

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
            {/* CutCornerSurface wraps children in its own View, so the layout
                styles have to live on an inner View to reach them. */}
            <View style={styles.instructionsContent}>
              <Text style={styles.instructions}>
                Enable Personal Hotspot in iOS Settings, then enter its Wi-Fi
                name and password below.
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
            </View>
          </CutCornerSurface>
        ) : null}

        <CutCornerSurface
          corner="large"
          style={styles.qrCard}
        >
          <View style={styles.qrContent}>
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
          </View>
        </CutCornerSurface>
        <CutCornerButton
          label="Generate New Code"
          onPress={generateNewCode}
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
    padding: 14
  },
  instructionsContent: {
    gap: 10
  },
  qrCard: {
    minHeight: 310,
    paddingVertical: 28
  },
  qrContent: {
    alignItems: "center",
    gap: 14
  },
  qrWrapper: {
    backgroundColor: colors.text,
    borderRadius: 4,
    padding: 16
  }
});
