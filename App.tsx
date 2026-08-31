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

import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { MapScreen } from "./src/features/map/MapScreen";
import { appTheme } from "./src/theme/appTheme";

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Open up App.tsx to start working on your app!</Text>
      <Text>Mobark was here from ios</Text>
      <StatusBar style="auto" />
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
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <MapScreen currentUser={null} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
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
