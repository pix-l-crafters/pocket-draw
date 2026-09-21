import type { ConfigContext, ExpoConfig } from "expo/config";

// Static config lives in app.json. This file exists only to inject values that
// must not be committed. Expo CLI loads `.env` locally; EAS builds read the
// same variable from the project's EAS environment variables.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "Pocket Draw",
  slug: config.slug ?? "pocket-draw",
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        // Maps SDK for Android renders a blank grey map without this key.
        // Not EXPO_PUBLIC_: it belongs in AndroidManifest.xml, not the JS bundle.
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY
      }
    }
  }
});
