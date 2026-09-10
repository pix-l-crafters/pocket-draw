import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { CutCornerButton } from "../../components/CutCornerButton";
import { CutCornerSurface } from "../../components/CutCornerSurface";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusTag } from "../../components/StatusTag";
import { colors } from "../../theme/tokens";
import type { QrInvitePayload } from "../qr/types/qr.types";
import {
  generateChallengeToken,
  generateDiscoveryToken,
  generateMatchId
} from "../qr/utils/qr.tokens";

const INVITE_LIFETIME_MS = 60_000;

type QrDisplayScreenProps = {
  currentUser: { displayName: string; uid: string };
};

function createInvite(
  hostUid: string,
  hostDisplayName: string
): QrInvitePayload {
  const issuedAt = Date.now();
  return {
    type: "pocket-draw/invite",
    version: 1,
    matchId: generateMatchId(),
    hostPlayerId: hostUid,
    hostPlayerName: hostDisplayName,
    challengeToken: generateChallengeToken(),
    issuedAt,
    expiresAt: issuedAt + INVITE_LIFETIME_MS,
    transport: "ble",
    ble: { discoveryToken: generateDiscoveryToken() }
  };
}

export function QrDisplayScreen({ currentUser }: QrDisplayScreenProps) {
  const [invite, setInvite] = useState<QrInvitePayload>(() =>
    createInvite(currentUser.uid, currentUser.displayName)
  );
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((invite.expiresAt - Date.now()) / 1000))
  );

  const regenerate = useCallback(() => {
    setInvite(createInvite(currentUser.uid, currentUser.displayName));
  }, [currentUser.displayName, currentUser.uid]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remainingMs = invite.expiresAt - Date.now();
      if (remainingMs <= 0) {
        regenerate();
        return;
      }
      setSecondsLeft(Math.ceil(remainingMs / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [invite.expiresAt, regenerate]);

  const encodedInvite = JSON.stringify(invite);

  return (
    <View style={styles.container}>
      <ScreenHeader
        kicker="Challenge"
        subtitle="Have an opponent scan this to send you a challenge."
        title="Your QR Code"
      />
      <CutCornerSurface corner="large" style={styles.qrCard}>
        <View style={styles.qrWrapper}>
          <QRCode
            backgroundColor={colors.text}
            color={colors.background}
            size={220}
            value={encodedInvite}
          />
        </View>
        <StatusTag tone={secondsLeft <= 10 ? "warning" : "muted"}>
          {`Refreshes in ${secondsLeft}s`}
        </StatusTag>
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
    paddingVertical: 28
  },
  qrWrapper: {
    backgroundColor: colors.text,
    borderRadius: 4,
    padding: 16
  }
});
