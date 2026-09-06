import { MD3LightTheme, type MD3Theme } from "react-native-paper";

export const appTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 4,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#6941C6",
    onPrimary: "#FFFFFF",
    primaryContainer: "#E9D7FE",
    onPrimaryContainer: "#3E1C96",
    secondary: "#1570EF",
    onSecondary: "#FFFFFF",
    secondaryContainer: "#D1E9FF",
    onSecondaryContainer: "#1849A9",
    background: "#F2F4F7",
    surface: "#FFFFFF",
    surfaceVariant: "#EAECF0",
    onSurface: "#101828",
    onSurfaceVariant: "#475467",
    outline: "#98A2B3",
    outlineVariant: "#D0D5DD",
    error: "#D92D20",
    onError: "#FFFFFF",
    errorContainer: "#FEE4E2",
    onErrorContainer: "#912018"
  }
};
