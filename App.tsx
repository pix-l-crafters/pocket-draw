import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { PaperProvider, SegmentedButtons } from "react-native-paper";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { BleScreen } from "./src/features/ble/BleScreen";
import { MapScreen } from "./src/features/map/MapScreen";
import { appTheme } from "./src/theme/appTheme";

export default function App() {
  const [activeTab, setActiveTab] = useState<"map" | "ble">("map");

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <SafeAreaView edges={["top"]} style={styles.container}>
          <View style={styles.switcherContainer}>
            <SegmentedButtons
              buttons={[
                { value: "map", label: "Map" },
                { value: "ble", label: "BLE Scanner" }
              ]}
              onValueChange={(val) => setActiveTab(val as "map" | "ble")}
              value={activeTab}
            />
          </View>
          <View style={styles.screenContainer}>
            {activeTab === "map" ? (
              <MapScreen currentUser={null} />
            ) : (
              <BleScreen />
            )}
          </View>
        </SafeAreaView>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  switcherContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fff"
  },
  screenContainer: {
    flex: 1
  }
});
