/**
 * Connectivity helpers for offline match-result upload (5.3).
 *
 * TODO(mihir): add `@react-native-community/netinfo` via
 * `npx expo install @react-native-community/netinfo` and replace the
 * optimistic fallback below. Without NetInfo we assume online and rely on
 * Firestore write failures to enqueue.
 */

export async function isNetworkAvailable(): Promise<boolean> {
  // Optimistic fallback until NetInfo is installed.
  return true;
}

export function subscribeNetworkChanges(
  _listener: (online: boolean) => void
): () => void {
  // No-op until NetInfo is available.
  return () => undefined;
}
