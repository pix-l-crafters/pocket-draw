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

export async function getExistingWifiHostIp(
  dependencies: ExistingWifiDependencies = nativeDependencies
): Promise<string> {
  const state = await dependencies.getNetworkStateAsync();
  if (state.type !== "WIFI" || state.isConnected !== true) {
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

export function subscribeToNetworkChanges(onChange: () => void): () => void {
  const subscription = Network.addNetworkStateListener(() => onChange());
  return () => subscription.remove();
}
