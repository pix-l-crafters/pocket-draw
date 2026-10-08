import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import BleManager, { type Peripheral } from "react-native-ble-manager";
import { Button, Card, Text } from "react-native-paper";

import { PermissionNotice } from "../../components/PermissionNotice";
import {
  bluetoothPermissions,
  ensureAndroidPermissions,
  type PermissionOutcome
} from "../../lib/appPermissions";
import { useForegroundRecheck } from "../../lib/useForegroundRecheck";
import { colors } from "../../theme/tokens";

export function BleScreen() {
  const [status, setStatus] = useState("Initializing Bluetooth...");
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Peripheral[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [permission, setPermission] = useState<PermissionOutcome | null>(null);
  // Bumped to re-run the init effect once a refused permission is granted.
  const [initAttempt, setInitAttempt] = useState(0);

  const retryInit = useCallback(() => setInitAttempt((n) => n + 1), []);
  const retryAfterSettings = useCallback(() => {
    if (permission && !permission.granted) retryInit();
  }, [permission, retryInit]);
  useForegroundRecheck(retryAfterSettings);

  useEffect(() => {
    const subscriptions = [
      BleManager.onDiscoverPeripheral((peripheral) => {
        setDevices((prev) => {
          const next = new Map(prev.map((item) => [item.id, item]));
          next.set(peripheral.id, peripheral);
          return [...next.values()];
        });
      }),
      BleManager.onStopScan(() => {
        setIsScanning(false);
        setStatus("Scan finished");
      })
    ];

    const initialize = async () => {
      try {
        const outcome = await ensureAndroidPermissions(bluetoothPermissions());
        setPermission(outcome);
        if (!outcome.granted) {
          setStatus("Bluetooth permissions denied");
          return;
        }

        await BleManager.start({ showAlert: true });
        setIsReady(true);
        setStatus("Bluetooth ready");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown Bluetooth error";
        setStatus(`Bluetooth init failed: ${message}`);
      }
    };

    void initialize();

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [initAttempt]);

  const startScan = async () => {
    if (!isReady || isScanning) {
      return;
    }

    setDevices([]);
    setStatus("Scanning for BLE devices...");
    setIsScanning(true);
    try {
      await BleManager.scan({ seconds: 5, allowDuplicates: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown scan error";
      setIsScanning(false);
      setStatus(`Scan failed: ${message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text
        style={styles.title}
        variant="titleMedium"
      >
        BLE Demo (react-native-ble-manager)
      </Text>
      <Text
        style={styles.status}
        variant="bodyMedium"
      >
        {status}
      </Text>
      {permission && !permission.granted ? (
        <PermissionNotice
          canAskAgain={permission.canAskAgain}
          capability="Bluetooth"
          message="Scanning for nearby players needs Bluetooth access."
          onRetry={retryInit}
        />
      ) : (
        <Button
          disabled={!isReady || isScanning}
          mode="contained"
          onPress={() => void startScan()}
          style={styles.scanButton}
        >
          {isScanning ? "Scanning..." : "Scan for 5 seconds"}
        </Button>
      )}
      <FlatList
        contentContainerStyle={styles.list}
        data={devices}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text
            style={styles.emptyText}
            variant="bodySmall"
          >
            {isScanning ? "Looking for devices..." : "No devices found yet"}
          </Text>
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Title
              subtitle={`${item.id} | RSSI: ${item.rssi}`}
              title={
                item.name ?? item.advertising?.localName ?? "Unnamed device"
              }
            />
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    padding: 16
  },
  title: {
    color: colors.text,
    fontWeight: "600",
    marginBottom: 4
  },
  status: {
    color: colors.textMuted60,
    marginBottom: 12
  },
  scanButton: {
    marginBottom: 12
  },
  list: {
    gap: 8,
    paddingBottom: 24
  },
  emptyText: {
    color: colors.textMuted45,
    marginTop: 24,
    textAlign: "center"
  },
  card: {
    marginBottom: 8
  }
});
