import Constants from "expo-constants";

/**
 * Version of the installed app, read from the build's Expo manifest (which
 * carries `version` from app.json, kept current by `cog bump`), e.g. `"0.1.1"`.
 * `undefined` when the manifest carries no version — callers phrase the
 * absence.
 */
export function getAppVersion(): string | undefined {
  return Constants.expoConfig?.version;
}
