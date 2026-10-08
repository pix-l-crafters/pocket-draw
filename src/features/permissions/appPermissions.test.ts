import {
  bluetoothPermissions,
  ensureAndroidPermissions,
  nearbyWifiPermissions,
  PermissionDeniedError
} from "./appPermissions";

const mockPlatform = { OS: "android", Version: 33 };
const mockCheck = jest.fn<Promise<boolean>, [string]>();
const mockRequestMultiple = jest.fn<
  Promise<Record<string, string>>,
  [string[]]
>();

jest.mock("react-native", () => ({
  get Platform() {
    return mockPlatform;
  },
  PermissionsAndroid: {
    PERMISSIONS: {
      ACCESS_FINE_LOCATION: "android.permission.ACCESS_FINE_LOCATION",
      BLUETOOTH_CONNECT: "android.permission.BLUETOOTH_CONNECT",
      BLUETOOTH_SCAN: "android.permission.BLUETOOTH_SCAN",
      NEARBY_WIFI_DEVICES: "android.permission.NEARBY_WIFI_DEVICES"
    },
    RESULTS: {
      DENIED: "denied",
      GRANTED: "granted",
      NEVER_ASK_AGAIN: "never_ask_again"
    },
    check: (permission: string) => mockCheck(permission),
    requestMultiple: (permissions: string[]) => mockRequestMultiple(permissions)
  }
}));

describe("ensureAndroidPermissions", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPlatform.OS = "android";
    mockPlatform.Version = 33;
  });

  it("does not prompt for permissions that are already granted", async () => {
    mockCheck.mockResolvedValue(true);

    await expect(
      ensureAndroidPermissions(["android.permission.BLUETOOTH_SCAN"])
    ).resolves.toEqual({ granted: true, canAskAgain: true });
    expect(mockRequestMultiple).not.toHaveBeenCalled();
  });

  it("requests only the missing permissions", async () => {
    mockCheck.mockImplementation(
      async (permission) => permission === "android.permission.BLUETOOTH_SCAN"
    );
    mockRequestMultiple.mockResolvedValue({
      "android.permission.BLUETOOTH_CONNECT": "granted"
    });

    await expect(
      ensureAndroidPermissions([
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.BLUETOOTH_CONNECT"
      ])
    ).resolves.toEqual({ granted: true, canAskAgain: true });
    expect(mockRequestMultiple).toHaveBeenCalledWith([
      "android.permission.BLUETOOTH_CONNECT"
    ]);
  });

  it("reports a denial the user can still be asked about", async () => {
    mockCheck.mockResolvedValue(false);
    mockRequestMultiple.mockResolvedValue({
      "android.permission.BLUETOOTH_SCAN": "denied"
    });

    await expect(
      ensureAndroidPermissions(["android.permission.BLUETOOTH_SCAN"])
    ).resolves.toEqual({ granted: false, canAskAgain: true });
  });

  it("reports a permanent denial when any permission says never ask again", async () => {
    mockCheck.mockResolvedValue(false);
    mockRequestMultiple.mockResolvedValue({
      "android.permission.BLUETOOTH_SCAN": "granted",
      "android.permission.BLUETOOTH_CONNECT": "never_ask_again"
    });

    await expect(
      ensureAndroidPermissions([
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.BLUETOOTH_CONNECT"
      ])
    ).resolves.toEqual({ granted: false, canAskAgain: false });
  });

  it("does not read a missing response as a grant", async () => {
    mockCheck.mockResolvedValue(false);
    mockRequestMultiple.mockResolvedValue({});

    await expect(
      ensureAndroidPermissions(["android.permission.BLUETOOTH_SCAN"])
    ).resolves.toEqual({ granted: false, canAskAgain: true });
  });

  it("is a no-op off Android, where these permissions do not exist", async () => {
    mockPlatform.OS = "ios";

    await expect(
      ensureAndroidPermissions(["android.permission.BLUETOOTH_SCAN"])
    ).resolves.toEqual({ granted: true, canAskAgain: true });
    expect(mockCheck).not.toHaveBeenCalled();
  });
});

describe("permission sets per Android version", () => {
  beforeEach(() => {
    mockPlatform.OS = "android";
  });

  it("uses the dedicated Bluetooth permissions from Android 12", () => {
    mockPlatform.Version = 31;
    expect(bluetoothPermissions()).toEqual([
      "android.permission.BLUETOOTH_SCAN",
      "android.permission.BLUETOOTH_CONNECT"
    ]);
  });

  it("falls back to fine location for Bluetooth before Android 12", () => {
    mockPlatform.Version = 30;
    expect(bluetoothPermissions()).toEqual([
      "android.permission.ACCESS_FINE_LOCATION"
    ]);
  });

  it("uses nearby Wi-Fi devices from Android 13", () => {
    mockPlatform.Version = 33;
    expect(nearbyWifiPermissions()).toEqual([
      "android.permission.NEARBY_WIFI_DEVICES"
    ]);
  });

  it("falls back to fine location for Wi-Fi before Android 13", () => {
    mockPlatform.Version = 32;
    expect(nearbyWifiPermissions()).toEqual([
      "android.permission.ACCESS_FINE_LOCATION"
    ]);
  });
});

describe("PermissionDeniedError", () => {
  it("tells the player to retry when the prompt can come back", () => {
    const error = new PermissionDeniedError("Nearby Wi-Fi", true);

    expect(error.canAskAgain).toBe(true);
    expect(error.message).toContain("Nearby Wi-Fi");
    expect(error.message).toContain("try again");
  });

  it("points at Settings once the prompt will not come back", () => {
    const error = new PermissionDeniedError("Nearby Wi-Fi", false);

    expect(error.message).toContain("Settings");
  });
});
