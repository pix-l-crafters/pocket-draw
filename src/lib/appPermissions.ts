import { PermissionsAndroid, Platform, type Permission } from "react-native";

/**
 * The permission-gated capabilities this app uses, named as a player would say
 * them. A closed set so a typo can't reach the UI copy, which interpolates it.
 */
export type Capability = "Bluetooth" | "Camera" | "Motion" | "Nearby Wi-Fi";

/** The result of checking a capability's permissions, and prompting if needed. */
export type PermissionOutcome = {
  granted: boolean;
  /**
   * False once the OS will no longer show a prompt ("never ask again" on
   * Android, any denial on iOS) — from then on only Settings can grant it.
   */
  canAskAgain: boolean;
};

/** A fresh object each call, so no caller can mutate a shared result. */
function granted(): PermissionOutcome {
  return { granted: true, canAskAgain: true };
}

/**
 * Thrown when a flow cannot continue because the capability it needs was
 * refused. Carries `canAskAgain` so the screen can offer the right recovery —
 * another prompt, or a trip to Settings — instead of dead-ending the player.
 */
export class PermissionDeniedError extends Error {
  constructor(
    readonly capability: Capability,
    readonly canAskAgain: boolean,
    private readonly reason = `${capability} access is needed to continue.`
  ) {
    super(
      canAskAgain
        ? `${reason} Allow it and try again.`
        : `${reason} Turn it on in Settings, then come back and try again.`
    );
    this.name = "PermissionDeniedError";
  }
}

/**
 * Checks each Android runtime permission and prompts only for the ones that are
 * missing, so a flow never re-asks for something the player already allowed. A
 * no-op on other platforms, where these permissions have no equivalent.
 */
export async function ensureAndroidPermissions(
  permissions: Permission[]
): Promise<PermissionOutcome> {
  if (Platform.OS !== "android") {
    return granted();
  }

  const states = await Promise.all(
    permissions.map(async (permission) => ({
      permission,
      granted: await PermissionsAndroid.check(permission)
    }))
  );
  const missing = states
    .filter((state) => !state.granted)
    .map((state) => state.permission);

  if (missing.length === 0) {
    return granted();
  }

  const results = Object.values(
    await PermissionsAndroid.requestMultiple(missing)
  );

  return {
    // The length check matters: `every` on an empty list is true, which would
    // otherwise read a missing response as a grant.
    granted:
      results.length === missing.length &&
      results.every((result) => result === PermissionsAndroid.RESULTS.GRANTED),
    canAskAgain: results.every(
      (result) => result !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
    )
  };
}

/** BLE scanning moved off location onto its own permissions in Android 12. */
export function bluetoothPermissions(): Permission[] {
  return Number(Platform.Version) >= 31
    ? [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      ]
    : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
}

/** Wi-Fi peer discovery moved onto NEARBY_WIFI_DEVICES in Android 13. */
export function nearbyWifiPermissions(): Permission[] {
  return Number(Platform.Version) >= 33
    ? [PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES]
    : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
}
