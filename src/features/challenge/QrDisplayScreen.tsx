import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { CutCornerButton } from "../../components/CutCornerButton";
import { CutCornerSurface } from "../../components/CutCornerSurface";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusTag } from "../../components/StatusTag";
import type { DuelChannel } from "../../contracts/duelChannel";
import { colors } from "../../theme/tokens";
import type { QrInvitePayload } from "../qr/types/qr.types";
import {
  generateChallengeToken,
  generateDiscoveryToken,
  generateMatchId
} from "../qr/utils/qr.tokens";
import {
  getExistingWifiHostIp,
  subscribeToNetworkChanges
} from "./network/existingWifi";
import { startNativeWebRtcDuelHost } from "./webrtc/nativeWebRtcTransport";

const INVITE_LIFETIME_MS = 60_000;

type QrDisplayScreenProps = {
  currentUser: { displayName: string; uid: string };
  onHostConnected?: (channel: DuelChannel, invite: QrInvitePayload) => void;
};

type InviteIdentity = Omit<QrInvitePayload, "connection">;

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
  const [identity, setIdentity] = useState<InviteIdentity>(() =>
    createInviteIdentity(currentUser.uid, currentUser.displayName)
  );
  const [invite, setInvite] = useState<QrInvitePayload | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((identity.expiresAt - Date.now()) / 1000))
  );

  const regenerate = useCallback(() => {
    setInvite(null);
    setIdentity(createInviteIdentity(currentUser.uid, currentUser.displayName));
  }, [currentUser.displayName, currentUser.uid]);

  useEffect(() => subscribeToNetworkChanges(regenerate), [regenerate]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let stopHost: (() => void) | null = null;

    setSetupError(null);
    setSecondsLeft(
      Math.max(0, Math.ceil((identity.expiresAt - Date.now()) / 1000))
    );

    const startHost = async () => {
      try {
        const hostIp = await getExistingWifiHostIp();
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
          connection: {
            mode: "existingWifi",
            hostIp,
            signalPort: host.port
          }
        };
        setInvite(readyInvite);

        void host.connection.then(
          (connection) => {
            if (active) onHostConnected?.(connection.channel, readyInvite);
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
  }, [identity, onHostConnected]);

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

  return (
    <View style={styles.container}>
      <ScreenHeader
        kicker="Challenge"
        subtitle="Keep both devices on the same Wi-Fi, then have your opponent scan this code."
        title="Your QR Code"
      />
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
        ) : invite ? (
          <StatusTag tone={secondsLeft <= 10 ? "warning" : "muted"}>
            {`Ready on ${invite.connection.hostIp}:${invite.connection.signalPort} · refreshes in ${secondsLeft}s`}
          </StatusTag>
        ) : (
          <StatusTag>Starting local connection…</StatusTag>
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
