import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

import { CutCornerButton } from "../../components/CutCornerButton";
import { KickerLabel } from "../../components/KickerLabel";
import { ScreenHeader } from "../../components/ScreenHeader";
import {
  getAppPermissionStatuses,
  type AppPermissionStatus,
  type AppPermissionStatuses,
  type Capability
} from "../../lib/appPermissions";
import { useForegroundRecheck } from "../../lib/useForegroundRecheck";
import { colors, fonts } from "../../theme/tokens";

type PermissionStatusScreenProps = {
  onBack: () => void;
};

const capabilities: Capability[] = [
  "Camera",
  "Motion",
  "Location",
  "Nearby Wi-Fi"
];

const statusLabels: Record<AppPermissionStatus, string> = {
  granted: "Granted",
  notGranted: "Not granted",
  notRequired: "Not required",
  unavailable: "Unable to check"
};

export function PermissionStatusScreen({
  onBack
}: PermissionStatusScreenProps) {
  const [statuses, setStatuses] = useState<AppPermissionStatuses | null>(null);
  const requestId = useRef(0);

  const refresh = useCallback(() => {
    const currentRequest = ++requestId.current;
    void getAppPermissionStatuses().then((result) => {
      if (requestId.current === currentRequest) setStatuses(result);
    });
  }, []);

  useEffect(() => {
    refresh();
    return () => {
      requestId.current += 1;
    };
  }, [refresh]);
  useForegroundRecheck(refresh);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={styles.container}
    >
      <ScreenHeader
        kicker="Your Profile"
        subtitle="Current access only. This page never asks for a permission."
        title="Permissions"
      />

      <CutCornerButton
        label="Back to Profile"
        onPress={onBack}
      />

      <View style={styles.section}>
        <KickerLabel color={colors.textMuted45}>Permission status</KickerLabel>
        {statuses === null ? (
          <ActivityIndicator
            color={colors.accent}
            style={styles.loading}
          />
        ) : (
          <View accessibilityLiveRegion="polite">
            {capabilities.map((capability) => (
              <View
                key={capability}
                style={styles.row}
              >
                <Text style={styles.label}>{capability}</Text>
                <Text style={styles.value}>
                  {statusLabels[statuses[capability]]}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <CutCornerButton
        label="Open Settings"
        onPress={() => void Linking.openSettings()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 12
  },
  section: {
    marginTop: 6
  },
  loading: {
    marginTop: 20
  },
  row: {
    alignItems: "center",
    backgroundColor: colors.backgroundAlt,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 14
  },
  label: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fonts.body,
    fontSize: 15
  },
  value: {
    color: colors.textMuted60,
    fontFamily: fonts.mono,
    fontSize: 12,
    textAlign: "right"
  }
});
