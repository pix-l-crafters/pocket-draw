import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { MapScreen } from "./src/features/map/MapScreen";
import { appTheme } from "./src/theme/appTheme";

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <MapScreen />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
