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
        // An empty value makes Expo omit com.google.android.geo.API_KEY, and
        // MapView then crashes on launch. A placeholder keeps the process up;
        // tiles stay grey until GOOGLE_MAPS_ANDROID_API_KEY is set.
        // Not EXPO_PUBLIC_: it belongs in AndroidManifest.xml, not the JS bundle.
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY || "dev-placeholder"
      }
    }
  }
});
