import { PermissionsAndroid, Platform } from "react-native";

import type {
  DuelConnectionInfo,
  HotspotConnection
} from "../../../contracts/duelConnection";
import type { DuelSessionTransport } from "../session/duelSessionTransport";
import {
  isUsableIpv4Address,
  isValidHotspotPassword,
  isValidWifiSsid
} from "../../qr/utils/ip.validation";

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

type AndroidHotspotDependencies = {
  requestPermission: () => Promise<boolean>;
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

function getLocalOnlyHotspotModule(): {
  startAsync: () => Promise<HotspotNetwork>;
  stop: () => void;
} {
  return require("../../../../modules/local-only-hotspot").default;
}

async function requestAndroidHotspotPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const permission =
    Number(Platform.Version) >= 33
      ? PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES
      : PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function nativeAndroidDependencies(): AndroidHotspotDependencies {
  const hotspot = getLocalOnlyHotspotModule();
  return {
    requestPermission: requestAndroidHotspotPermission,
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
  if (!(await dependencies.requestPermission())) {
    throw new Error("Nearby Wi-Fi permission is required to create a hotspot.");
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
  connector: WifiConnector = getWifiConnector()
): Promise<void> {
  await connector.connectToProtectedWifiSSID({
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
  connector: WifiConnector = getWifiConnector()
): DuelSessionTransport {
  let prepared = connection.mode === "existingWifi";
  let preparation: Promise<void> | null = null;

  return {
    async connect(params, signal) {
      if (signal.aborted) throw abortError();
      if (!prepared && connection.mode === "hotspot") {
        preparation ??= joinHotspot(connection, connector)
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
