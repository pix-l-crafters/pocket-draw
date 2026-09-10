import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { BarcodeScanningResult } from "expo-camera";

import { CutCornerButton } from "../../components/CutCornerButton";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusTag } from "../../components/StatusTag";
import { colors } from "../../theme/tokens";
import type { ChallengeHandoff } from "../../contracts/challengeHandoff";
import { parseQrInvite } from "../qr/utils/qr.validation";
import type { QrValidationErrorCode } from "../qr/types/qr.types";
import { OpponentPopup } from "./components/OpponentPopup";

const ERROR_MESSAGES: Record<QrValidationErrorCode, string> = {
  TOO_LARGE: "That code isn't a Pocket Draw invite.",
  MALFORMED_JSON: "That code isn't a Pocket Draw invite.",
  INVALID_PAYLOAD: "That code isn't a Pocket Draw invite.",
  UNSUPPORTED_VERSION: "This invite was made by a newer app version.",
  UNSUPPORTED_TRANSPORT: "This invite uses an unsupported connection type.",
  EXPIRED: "This invite has expired. Ask them to generate a new one.",
  INVALID_TIME: "This invite's clock looks wrong. Try scanning again.",
  SELF_INVITE: "You can't scan your own invite."
};

type QrScannerScreenProps = {
  currentUser: { displayName: string; uid: string };
  onChallengeSent: (handoff: ChallengeHandoff) => void;
};

export function QrScannerScreen({
  currentUser,
  onChallengeSent
}: QrScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedInvite, setScannedInvite] = useState<{
    hostPlayerId: string;
    hostPlayerName: string;
  } | null>(null);

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (scannedInvite) {
        return;
      }

      const result = parseQrInvite(data, currentUser.uid, Date.now());
      if (!result.ok) {
        setScanError(ERROR_MESSAGES[result.code]);
        return;
      }

      setScanError(null);
      setScannedInvite({
        hostPlayerId: result.value.hostPlayerId,
        hostPlayerName: result.value.hostPlayerName ?? "Player"
      });
    },
    [currentUser.uid, scannedInvite]
  );

  const resetScan = useCallback(() => {
    setScannedInvite(null);
    setScanError(null);
  }, []);

  const confirmChallenge = useCallback(() => {
    if (!scannedInvite) {
      return;
    }
    onChallengeSent({
      challengerId: currentUser.uid,
      scannedPlayerId: scannedInvite.hostPlayerId,
      roundCount: 3
    });
    resetScan();
  }, [currentUser.uid, onChallengeSent, resetScan, scannedInvite]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          kicker="Challenge"
          subtitle="Camera access is needed to scan an opponent's QR code."
          title="Scan to Challenge"
        />
        <CutCornerButton
          label="Grant Camera Access"
          onPress={() => void requestPermission()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        kicker="Challenge"
        subtitle="Point your camera at an opponent's QR code."
        title="Scan to Challenge"
      />
      <View style={styles.cameraWrapper}>
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scannedInvite ? undefined : handleBarcodeScanned}
          style={StyleSheet.absoluteFill}
        />
      </View>
      {scanError ? <StatusTag tone="warning">{scanError}</StatusTag> : null}
      {scannedInvite ? (
        <OpponentPopup
          onCancel={resetScan}
          onChallenge={confirmChallenge}
          scannedPlayerId={scannedInvite.hostPlayerId}
          scannedPlayerName={scannedInvite.hostPlayerName}
          visible
        />
      ) : null}
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
  cameraWrapper: {
    aspectRatio: 3 / 4,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative"
  }
});
