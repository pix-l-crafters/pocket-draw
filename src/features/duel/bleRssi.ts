import BleManager from "react-native-ble-manager";

import type { RssiReader } from "./PreRound";

/** Creates the live RSSI reader for a connected BLE peripheral. */
export function createBleRssiReader(peripheralId: string): RssiReader {
  return async () => {
    const peripheral = await BleManager.readRSSI(peripheralId);
    return peripheral.rssi;
  };
}
