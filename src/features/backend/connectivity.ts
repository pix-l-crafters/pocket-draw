import {
  addNetworkStateListener,
  getNetworkStateAsync,
  type NetworkState
} from "expo-network";

function isOnline(state: NetworkState): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

export async function isNetworkAvailable(): Promise<boolean> {
  try {
    return isOnline(await getNetworkStateAsync());
  } catch {
    // Unknown connectivity still permits a write; transport errors queue it.
    return true;
  }
}

export function subscribeNetworkChanges(
  listener: (online: boolean) => void
): () => void {
  const subscription = addNetworkStateListener((state) =>
    listener(isOnline(state))
  );
  return () => subscription.remove();
}
