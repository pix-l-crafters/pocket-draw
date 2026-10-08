import * as Network from "expo-network";

import { isUsableIpv4Address } from "../../qr/utils/ip.validation";

type NetworkSnapshot = {
  type?: string;
  isConnected?: boolean;
};

type ExistingWifiDependencies = {
  getNetworkStateAsync: () => Promise<NetworkSnapshot>;
  getIpAddressAsync: () => Promise<string>;
};

const nativeDependencies: ExistingWifiDependencies = {
  getNetworkStateAsync: Network.getNetworkStateAsync,
  getIpAddressAsync: Network.getIpAddressAsync
};

function isOnWifi(state: NetworkSnapshot): boolean {
  return state.type === "WIFI" && state.isConnected === true;
}

export async function getExistingWifiHostIp(
  dependencies: ExistingWifiDependencies = nativeDependencies
): Promise<string> {
  const state = await dependencies.getNetworkStateAsync();
  if (!isOnWifi(state)) {
    throw new Error("Connect this device to Wi-Fi before creating an invite.");
  }

  const hostIp = await dependencies.getIpAddressAsync();
  if (!isUsableIpv4Address(hostIp)) {
    throw new Error(
      "Pocket Draw could not determine this device's Wi-Fi address."
    );
  }
  return hostIp;
}

/**
 * The guest side of a shared-Wi-Fi invite. Without this, a guest on mobile data
 * burns every retry on TCP timeouts before seeing a generic failure.
 */
export async function assertConnectedToWifi(
  dependencies: Pick<
    ExistingWifiDependencies,
    "getNetworkStateAsync"
  > = nativeDependencies
): Promise<void> {
  if (!isOnWifi(await dependencies.getNetworkStateAsync())) {
    throw new Error("Join the same Wi-Fi as your opponent, then try again.");
  }
}

export function subscribeToNetworkChanges(onChange: () => void): () => void {
  const subscription = Network.addNetworkStateListener(() => onChange());
  return () => subscription.remove();
}
