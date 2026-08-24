import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import BleManager, { type Peripheral } from "react-native-ble-manager";
import {
  Button,
  FlatList,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  View
} from "react-native";

export default function App() {
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
      <Text style={styles.title}>BLE Demo (react-native-ble-manager)</Text>
      <Text style={styles.status}>{status}</Text>
      <Button
        title={isScanning ? "Scanning..." : "Scan for 5 seconds"}
        onPress={() => void startScan()}
        disabled={!isReady || isScanning}
      />
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {isScanning ? "Looking for devices..." : "No devices found yet"}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.deviceRow}>
            <Text style={styles.deviceName}>
              {item.name ?? item.advertising.localName ?? "Unnamed device"}
            </Text>
            <Text style={styles.deviceMeta}>
              {item.id} | RSSI: {item.rssi}
            </Text>
          </View>
        )}
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 56,
    paddingHorizontal: 16
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8
  },
  status: {
    marginBottom: 16
  },
  list: {
    paddingTop: 16,
    paddingBottom: 24
  },
  emptyText: {
    color: "#666"
  },
  deviceRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee"
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "500"
  },
  deviceMeta: {
    color: "#444",
    marginTop: 2
  }
});
