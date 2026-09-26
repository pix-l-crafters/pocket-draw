export type ExistingWifiConnection = {
  mode: "existingWifi";
  hostIp: string;
  signalPort: number;
};

export type DuelConnectionInfo = ExistingWifiConnection;
