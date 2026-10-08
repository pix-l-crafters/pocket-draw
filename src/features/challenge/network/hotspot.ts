import { Platform } from "react-native";

import type {
  DuelConnectionInfo,
  HotspotConnection
} from "../../../contracts/duelConnection";
import {
  ensureAndroidPermissions,
  nearbyWifiPermissions,
  PermissionDeniedError,
  type PermissionOutcome
} from "../../../lib/appPermissions";
import {
  isUsableIpv4Address,
  isValidHotspotPassword,
  isValidWifiSsid
} from "../../qr/utils/ip.validation";
import type { DuelSessionTransport } from "../session/duelSessionTransport";

export type HotspotNetwork = {
  ssid: string;
  password: string;
  hostIp: string;
};

type WifiConnector = {
  connectToProtectedWifiSSID(options: {
    ssid: string;
    password: string;
    isWEP: false;
    isHidden: false;
    timeout: number;
  }): Promise<void>;
};

type HotspotReleaseDependencies = {
  platform: typeof Platform.OS;
  stopHostedHotspot: () => void;
  leaveNetwork: (ssid: string) => Promise<unknown>;
};

/** Joining a hotspot needs the same nearby-Wi-Fi grant as creating one. */
type JoinHotspotDependencies = WifiConnector & {
  ensurePermission: () => Promise<PermissionOutcome>;
};

type AndroidHotspotDependencies = {
  requestPermission: () => Promise<PermissionOutcome>;
  startAsync: () => Promise<HotspotNetwork>;
  stop: () => void;
};

function abortError(): Error {
  const error = new Error("Connection attempt cancelled.");
  error.name = "AbortError";
  return error;
}

// The hotspot this device joined as a guest. The OS keeps the device on it
// after the duel unless the app leaves explicitly, and a local-only hotspot
// has no internet, so match results could not reach Firestore.
let joinedHotspotSsid: string | null = null;

function getWifiConnector(): WifiConnector {
  return require("react-native-wifi-reborn").default as WifiConnector;
}

function getWifiReleaser(): {
  disconnect: () => Promise<boolean>;
  disconnectFromSSID: (ssid: string) => Promise<void>;
} {
  return require("react-native-wifi-reborn").default;
}

function nativeJoinDependencies(): JoinHotspotDependencies {
  return {
    ...getWifiConnector(),
    ensurePermission: ensureNearbyWifiPermission
  };
}

function getLocalOnlyHotspotModule(): {
  startAsync: () => Promise<HotspotNetwork>;
  stop: () => void;
} {
  return require("../../../../modules/local-only-hotspot").default;
}

function ensureNearbyWifiPermission(): Promise<PermissionOutcome> {
  return ensureAndroidPermissions(nearbyWifiPermissions());
}

function nativeAndroidDependencies(): AndroidHotspotDependencies {
  const hotspot = getLocalOnlyHotspotModule();
  return {
    requestPermission: ensureNearbyWifiPermission,
    startAsync: hotspot.startAsync,
    stop: hotspot.stop
  };
}

function assertValidHotspotNetwork(network: HotspotNetwork): void {
  if (
    !isValidWifiSsid(network.ssid) ||
    !isValidHotspotPassword(network.password) ||
    !isUsableIpv4Address(network.hostIp)
  ) {
    throw new Error("Android returned unusable hotspot credentials.");
  }
}

export async function startAndroidLocalOnlyHotspot(
  dependencies: AndroidHotspotDependencies = nativeAndroidDependencies()
): Promise<HotspotNetwork> {
  const permission = await dependencies.requestPermission();
  if (!permission.granted) {
    throw new PermissionDeniedError(
      "Nearby Wi-Fi",
      permission.canAskAgain,
      "Nearby Wi-Fi permission is required to create a hotspot."
    );
  }
  const network = await dependencies.startAsync();
  assertValidHotspotNetwork(network);
  return network;
}

export function stopAndroidLocalOnlyHotspot(
  dependencies: Pick<
    AndroidHotspotDependencies,
    "stop"
  > = nativeAndroidDependencies()
): void {
  dependencies.stop();
}

export async function joinHotspot(
  connection: HotspotConnection,
  dependencies: JoinHotspotDependencies = nativeJoinDependencies()
): Promise<void> {
  const permission = await dependencies.ensurePermission();
  if (!permission.granted) {
    throw new PermissionDeniedError(
      "Nearby Wi-Fi",
      permission.canAskAgain,
      `Nearby Wi-Fi permission is required to join ${connection.ssid}.`
    );
  }

  await dependencies.connectToProtectedWifiSSID({
    ssid: connection.ssid,
    password: connection.password,
    isWEP: false,
    isHidden: false,
    timeout: 15
  });
  joinedHotspotSsid = connection.ssid;
}

function nativeReleaseDependencies(): HotspotReleaseDependencies {
  return {
    platform: Platform.OS,
    stopHostedHotspot: () => getLocalOnlyHotspotModule().stop(),
    leaveNetwork: (ssid) =>
      Platform.OS === "android"
        ? getWifiReleaser().disconnect()
        : getWifiReleaser().disconnectFromSSID(ssid)
  };
}

/**
 * Undoes whatever hotspot networking a duel set up: an Android host stops its
 * local-only hotspot, and a guest leaves the hotspot it joined. Safe to call
 * when neither applies. Failures are swallowed — the duel is over and the OS
 * reclaims both when the app exits.
 */
export async function releaseHotspotNetworks(
  dependencies: HotspotReleaseDependencies = nativeReleaseDependencies()
): Promise<void> {
  if (dependencies.platform === "android") {
    try {
      dependencies.stopHostedHotspot();
    } catch {
      // Nothing was hosted, or the module is already torn down.
    }
  }
  const ssid = joinedHotspotSsid;
  joinedHotspotSsid = null;
  if (!ssid) return;
  try {
    await dependencies.leaveNetwork(ssid);
  } catch {
    // The device already left the hotspot.
  }
}

export function withNetworkPreparation(
  connection: DuelConnectionInfo,
  transport: DuelSessionTransport,
  dependencies: JoinHotspotDependencies = nativeJoinDependencies()
): DuelSessionTransport {
  let prepared = connection.mode === "existingWifi";
  let preparation: Promise<void> | null = null;

  return {
    async connect(params, signal) {
      if (signal.aborted) throw abortError();
      if (!prepared && connection.mode === "hotspot") {
        preparation ??= joinHotspot(connection, dependencies)
          .then(() => {
            prepared = true;
          })
          .catch((error: unknown) => {
            preparation = null;
            throw error;
          });
        await preparation;
      }
      if (signal.aborted) throw abortError();
      return transport.connect(params, signal);
    }
  };
}

/**
 * Reconnects an established duel. On a hotspot a drop usually means this phone
 * left it (Android falls back to a network with internet), so each recovery
 * joins it again once; attempts within a recovery share that join.
 */
export function withReconnectPreparation(
  connection: DuelConnectionInfo,
  transport: DuelSessionTransport,
  dependencies: JoinHotspotDependencies = nativeJoinDependencies()
): DuelSessionTransport {
  let recovery: DuelSessionTransport | null = null;

  return {
    async connect(params, signal) {
      // Rejoining needs the same grant as the first join: the player may have
      // revoked it in Settings while the duel was running.
      recovery ??= withNetworkPreparation(connection, transport, dependencies);
      const established = await recovery.connect(params, signal);
      recovery = null;
      return established;
    }
  };
}
