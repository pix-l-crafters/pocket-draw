import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "../theme/tokens";
import { DisplayHeading } from "./DisplayHeading";
import { KickerLabel } from "./KickerLabel";

type ScreenHeaderProps = {
  kicker: string;
  subtitle?: string;
  title: string;
};

export function ScreenHeader({ kicker, subtitle, title }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <KickerLabel>{kicker}</KickerLabel>
      <DisplayHeading size={34} style={styles.title}>
        {title}
      </DisplayHeading>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12
  },
  title: {
    marginTop: 8
  },
  subtitle: {
    color: colors.textMuted45,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10
  }
});
