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

function getWifiConnector(): WifiConnector {
  return require("react-native-wifi-reborn").default as WifiConnector;
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
