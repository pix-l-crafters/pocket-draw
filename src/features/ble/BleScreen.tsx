import { useEffect, useState } from "react";
import {
  FlatList,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  View
} from "react-native";
import BleManager, { type Peripheral } from "react-native-ble-manager";
import { Button, Card, Text } from "react-native-paper";

export function BleScreen() {
  const [status, setStatus] = useState("Initializing Bluetooth...");
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Peripheral[]>([]);
  const [isReady, setIsReady] = useState(false);

  async function requestBluetoothPermissions() {
    if (Platform.OS !== "android") {
      return true;
    }

    if (Platform.Version >= 31) {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      ]);
      return (
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
          PermissionsAndroid.RESULTS.GRANTED
      );
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

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
        const hasPermissions = await requestBluetoothPermissions();
        if (!hasPermissions) {
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
  }, []);

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
      <Text style={styles.title} variant="titleMedium">
        BLE Demo (react-native-ble-manager)
      </Text>
      <Text style={styles.status} variant="bodyMedium">
        {status}
      </Text>
      <Button
        disabled={!isReady || isScanning}
        mode="contained"
        onPress={() => void startScan()}
        style={styles.scanButton}
      >
        {isScanning ? "Scanning..." : "Scan for 5 seconds"}
      </Button>
      <FlatList
        contentContainerStyle={styles.list}
        data={devices}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText} variant="bodySmall">
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
    flex: 1,
    padding: 16,
    backgroundColor: "#F2F4F7"
  },
  title: {
    fontWeight: "600",
    marginBottom: 4
  },
  status: {
    marginBottom: 12,
    color: "#475467"
  },
  scanButton: {
    marginBottom: 12
  },
  list: {
    paddingBottom: 24,
    gap: 8
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    marginTop: 24
  },
  card: {
    marginBottom: 8
  }
});
