import { getExistingWifiHostIp } from "./existingWifi";

describe("existing Wi-Fi discovery", () => {
  it("returns the device IPv4 address when Wi-Fi is connected", async () => {
    await expect(
      getExistingWifiHostIp({
        getNetworkStateAsync: async () => ({
          type: "WIFI",
          isConnected: true
        }),
        getIpAddressAsync: async () => "192.168.0.17"
      })
    ).resolves.toBe("192.168.0.17");
  });

  it.each([
    {
      state: { type: "CELLULAR", isConnected: true },
      ip: "10.0.0.2",
      message: "Connect this device to Wi-Fi"
    },
    {
      state: { type: "WIFI", isConnected: false },
      ip: "192.168.0.17",
      message: "Connect this device to Wi-Fi"
    },
    {
      state: { type: "WIFI", isConnected: true },
      ip: "0.0.0.0",
      message: "could not determine this device's Wi-Fi address"
    }
  ])(
    "rejects an unusable network snapshot %#",
    async ({ state, ip, message }) => {
      await expect(
        getExistingWifiHostIp({
          getNetworkStateAsync: async () => state,
          getIpAddressAsync: async () => ip
        })
      ).rejects.toThrow(message);
    }
  );
});
