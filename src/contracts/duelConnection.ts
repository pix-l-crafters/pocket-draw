export type ExistingWifiConnection = {
  mode: "existingWifi";
  hostIp: string;
  signalPort: number;
};

export type HotspotConnection = {
  mode: "hotspot";
  ssid: string;
  password: string;
  hostIp: string;
  signalPort: number;
};

export type DuelConnectionInfo = ExistingWifiConnection | HotspotConnection;
