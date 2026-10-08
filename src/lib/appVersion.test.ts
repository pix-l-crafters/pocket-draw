import Constants from "expo-constants";

import { getAppVersion } from "./appVersion";

jest.mock("expo-constants", () => ({ expoConfig: null }));

const constants = Constants as unknown as {
  expoConfig: { version?: string } | null;
};

describe("getAppVersion", () => {
  beforeEach(() => {
    constants.expoConfig = null;
  });

  test("reports the version of the installed app", () => {
    constants.expoConfig = { version: "1.2.3" };

    expect(getAppVersion()).toBe("1.2.3");
  });

  test("reports nothing when the manifest has no version", () => {
    constants.expoConfig = {};

    expect(getAppVersion()).toBeUndefined();
  });

  test("reports nothing when there is no manifest", () => {
    expect(getAppVersion()).toBeUndefined();
  });
});
