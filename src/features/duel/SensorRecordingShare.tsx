import { useState } from "react";
import { Text, View } from "react-native";

import { CutCornerButton } from "../../components/CutCornerButton";
import { shareLatestSensorRecording } from "./sensorRecording";

export function SensorRecordingShare() {
  const [hint, setHint] = useState<string | null>(null);
  if (!__DEV__) return null;
  return (
    <View>
      <CutCornerButton
        label="Share latest sensor JSON"
        onPress={async () => {
          const result = await shareLatestSensorRecording();
          setHint(
            result === "empty"
              ? "Finish a recording first."
              : result === "error"
                ? "Could not share the recording. Try again."
                : null
          );
        }}
      />
      {hint && <Text>{hint}</Text>}
    </View>
  );
}
