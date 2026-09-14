import type { DuelSessionTransport } from "./duelSessionTransport";

/**
 * Real BLE-backed transport — NOT implemented yet.
 *
 * `react-native-ble-manager` (the only BLE dependency) has no peripheral /
 * advertising API, so the host phone cannot broadcast its `discoveryToken` for
 * the guest to find. See the map-duel design doc §9: solving this is a separate,
 * time-boxed spike (a different library, a small native module, or the
 * documented same-Wi-Fi fallback) before this transport can be written.
 *
 * Until then `useDuelSession` uses `mockDuelSessionTransport`. The scanner logic
 * in `BleScreen.tsx` is the starting point for the guest side once the host side
 * is solved.
 */
export const bleDuelSessionTransport: DuelSessionTransport = {
  connect() {
    return Promise.reject(
      new Error(
        "BLE duel transport is not implemented — peripheral-mode discovery is unsolved (see design doc §9)."
      )
    );
  }
};
