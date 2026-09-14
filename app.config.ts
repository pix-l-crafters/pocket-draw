import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Extends app.json so native Google Maps can read the API key at prebuild time.
 * Android always uses Google Maps for react-native-maps; without this meta-data
 * the MapView crashes with IllegalStateException: API key not found.
 *
 * Reuses EXPO_PUBLIC_FIREBASE_API_KEY (same Google Cloud project). Enable
 * "Maps SDK for Android" on that key if the map is blank after rebuild.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim() || undefined;

  return {
    ...config,
    name: config.name ?? "Pocket Draw",
    slug: config.slug ?? "pocket-draw",
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          ...config.android?.config?.googleMaps,
          ...(googleMapsApiKey ? { apiKey: googleMapsApiKey } : {})
        }
      }
    },
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        ...(googleMapsApiKey ? { googleMapsApiKey } : {})
      }
    }
  };
};
