import { Camera } from "expo-camera";
import {
  getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync
} from "expo-location";
import { Accelerometer } from "expo-sensors";

import {
  ensureAndroidPermissions,
  getAppPermissionStatuses,
  nearbyWifiPermissions,
  PermissionDeniedError
} from "./appPermissions";

const mockPlatform = { OS: "android", Version: 33 };
const mockCheck = jest.fn<Promise<boolean>, [string]>();
const mockRequestMultiple = jest.fn<
  Promise<Record<string, string>>,
  [string[]]
>();

jest.mock("expo-camera", () => ({
  Camera: {
    getCameraPermissionsAsync: jest.fn(),
    requestCameraPermissionsAsync: jest.fn()
  }
}));
jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn()
}));
jest.mock("expo-sensors", () => ({
  Accelerometer: {
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn()
  }
}));

jest.mock("react-native", () => ({
  get Platform() {
    return mockPlatform;
  },
  PermissionsAndroid: {
    PERMISSIONS: {
      ACCESS_FINE_LOCATION: "android.permission.ACCESS_FINE_LOCATION",
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
      ensureAndroidPermissions(["android.permission.NEARBY_WIFI_DEVICES"])
    ).resolves.toEqual({ granted: true, canAskAgain: true });
    expect(mockRequestMultiple).not.toHaveBeenCalled();
  });

  it("requests only the missing permissions", async () => {
    mockCheck.mockImplementation(
      async (permission) =>
        permission === "android.permission.NEARBY_WIFI_DEVICES"
    );
    mockRequestMultiple.mockResolvedValue({
      "android.permission.ACCESS_FINE_LOCATION": "granted"
    });

    await expect(
      ensureAndroidPermissions([
        "android.permission.NEARBY_WIFI_DEVICES",
        "android.permission.ACCESS_FINE_LOCATION"
      ])
    ).resolves.toEqual({ granted: true, canAskAgain: true });
    expect(mockRequestMultiple).toHaveBeenCalledWith([
      "android.permission.ACCESS_FINE_LOCATION"
    ]);
  });

  it("reports a denial the user can still be asked about", async () => {
    mockCheck.mockResolvedValue(false);
    mockRequestMultiple.mockResolvedValue({
      "android.permission.NEARBY_WIFI_DEVICES": "denied"
    });

    await expect(
      ensureAndroidPermissions(["android.permission.NEARBY_WIFI_DEVICES"])
    ).resolves.toEqual({ granted: false, canAskAgain: true });
  });

  it("reports a permanent denial when any permission says never ask again", async () => {
    mockCheck.mockResolvedValue(false);
    mockRequestMultiple.mockResolvedValue({
      "android.permission.NEARBY_WIFI_DEVICES": "granted",
      "android.permission.ACCESS_FINE_LOCATION": "never_ask_again"
    });

    await expect(
      ensureAndroidPermissions([
        "android.permission.NEARBY_WIFI_DEVICES",
        "android.permission.ACCESS_FINE_LOCATION"
      ])
    ).resolves.toEqual({ granted: false, canAskAgain: false });
  });

  it("does not read a missing response as a grant", async () => {
    mockCheck.mockResolvedValue(false);
    mockRequestMultiple.mockResolvedValue({});

    await expect(
      ensureAndroidPermissions(["android.permission.NEARBY_WIFI_DEVICES"])
    ).resolves.toEqual({ granted: false, canAskAgain: true });
  });

  it("is a no-op off Android, where these permissions do not exist", async () => {
    mockPlatform.OS = "ios";

    await expect(
      ensureAndroidPermissions(["android.permission.NEARBY_WIFI_DEVICES"])
    ).resolves.toEqual({ granted: true, canAskAgain: true });
    expect(mockCheck).not.toHaveBeenCalled();
  });
});

describe("permission sets per Android version", () => {
  beforeEach(() => {
    mockPlatform.OS = "android";
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

describe("getAppPermissionStatuses", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPlatform.OS = "android";
    mockPlatform.Version = 33;
    jest
      .mocked(Camera.getCameraPermissionsAsync)
      .mockResolvedValue({ granted: true } as never);
    jest
      .mocked(getForegroundPermissionsAsync)
      .mockResolvedValue({ granted: false } as never);
    jest
      .mocked(Accelerometer.getPermissionsAsync)
      .mockResolvedValue({ granted: true } as never);
  });

  it("reads every status without requesting a permission", async () => {
    mockCheck.mockResolvedValue(false);

    await expect(getAppPermissionStatuses()).resolves.toEqual({
      Camera: "granted",
      Motion: "granted",
      Location: "notGranted",
      "Nearby Wi-Fi": "notGranted"
    });
    expect(mockCheck).toHaveBeenCalledWith(
      "android.permission.NEARBY_WIFI_DEVICES"
    );
    expect(mockRequestMultiple).not.toHaveBeenCalled();
    expect(Camera.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(Accelerometer.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("uses the existing API-level Wi-Fi permission selection", async () => {
    mockPlatform.Version = 32;
    mockCheck.mockResolvedValue(true);

    await expect(getAppPermissionStatuses()).resolves.toMatchObject({
      "Nearby Wi-Fi": "granted"
    });
    expect(mockCheck).toHaveBeenCalledWith(
      "android.permission.ACCESS_FINE_LOCATION"
    );
  });

  it("marks Android-only Wi-Fi permission as not required on iOS", async () => {
    mockPlatform.OS = "ios";

    await expect(getAppPermissionStatuses()).resolves.toMatchObject({
      "Nearby Wi-Fi": "notRequired"
    });
    expect(mockCheck).not.toHaveBeenCalled();
  });

  it("keeps other statuses visible if one read fails", async () => {
    mockCheck.mockResolvedValue(true);
    jest
      .mocked(Camera.getCameraPermissionsAsync)
      .mockRejectedValue(new Error("read failed"));

    await expect(getAppPermissionStatuses()).resolves.toEqual({
      Camera: "unavailable",
      Motion: "granted",
      Location: "notGranted",
      "Nearby Wi-Fi": "granted"
    });
  });
});
