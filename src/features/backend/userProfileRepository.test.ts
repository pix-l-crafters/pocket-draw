import { doc, getDoc, setDoc } from "firebase/firestore";

import { userProfileRepository } from "./userProfileRepository";

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn()
}));

jest.mock("../../lib/firebase", () => ({
  db: { name: "test-database" }
}));

const uid = "player-123";
const profileReference = { path: "users/player-123" };

function mockSnapshot(data: Record<string, unknown> | undefined) {
  jest.mocked(getDoc).mockResolvedValue({
    data: () => data
  } as never);
}

describe("userProfileRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(doc).mockReturnValue(profileReference as never);
    jest.mocked(setDoc).mockResolvedValue(undefined as never);
  });

  describe("syncUserProfile", () => {
    test("creates the document when none exists", async () => {
      mockSnapshot(undefined);

      await userProfileRepository.syncUserProfile(uid, "Quick Draw");

      expect(setDoc).toHaveBeenCalledWith(profileReference, {
        displayName: "Quick Draw"
      });
    });

    test("skips the write when the stored name already matches", async () => {
      mockSnapshot({ displayName: "Quick Draw" });

      await userProfileRepository.syncUserProfile(uid, "Quick Draw");

      expect(setDoc).not.toHaveBeenCalled();
    });

    // The rules admit `displayName` only, so the write must carry nothing else.
    test("writes only the name when it changed", async () => {
      mockSnapshot({ displayName: "Quick Draw" });

      await userProfileRepository.syncUserProfile(uid, "Fast Hands");

      expect(setDoc).toHaveBeenCalledWith(profileReference, {
        displayName: "Fast Hands"
      });
    });

    test("trims the name before comparing and writing", async () => {
      mockSnapshot({ displayName: "Quick Draw" });

      await userProfileRepository.syncUserProfile(uid, "  Quick Draw  ");

      expect(setDoc).not.toHaveBeenCalled();
    });

    test("rejects a blank name", async () => {
      await expect(
        userProfileRepository.syncUserProfile(uid, "   ")
      ).rejects.toThrow("A display name is required");
    });
  });

  describe("getUserProfile", () => {
    test("returns the stored profile", async () => {
      mockSnapshot({ displayName: "Quick Draw" });

      await expect(userProfileRepository.getUserProfile(uid)).resolves.toEqual({
        uid,
        displayName: "Quick Draw"
      });
    });

    test("returns null when the document is missing", async () => {
      mockSnapshot(undefined);

      await expect(
        userProfileRepository.getUserProfile(uid)
      ).resolves.toBeNull();
    });

    test("returns null for a malformed document instead of throwing", async () => {
      mockSnapshot({ displayName: 42 });

      await expect(
        userProfileRepository.getUserProfile(uid)
      ).resolves.toBeNull();
    });
  });
});
