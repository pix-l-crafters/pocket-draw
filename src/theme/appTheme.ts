import { MD3DarkTheme, type MD3Theme } from "react-native-paper";

import { colors } from "./tokens";

export const appTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 4,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.accent,
    onPrimary: colors.background,
    primaryContainer: colors.surface,
    onPrimaryContainer: colors.text,
    secondary: colors.success,
    onSecondary: colors.background,
    secondaryContainer: colors.surface,
    onSecondaryContainer: colors.text,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surface,
    onSurface: colors.text,
    onSurfaceVariant: colors.textMuted60,
    outline: colors.border,
    outlineVariant: colors.border,
    error: "#D92D20",
    onError: colors.text,
    errorContainer: colors.surface,
    onErrorContainer: "#FF8A80"
  }
};
