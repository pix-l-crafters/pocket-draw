import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

import { registerUser, syncUserProfileFromAuth, updateUsername } from "./auth";
import { auth } from "./firebase";
import { userProfileRepository } from "../features/backend/userProfileRepository";

jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
  EmailAuthProvider: { credential: jest.fn() },
  reauthenticateWithCredential: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  updatePassword: jest.fn(),
  updateProfile: jest.fn()
}));

jest.mock("./firebase", () => ({
  auth: { currentUser: null }
}));

jest.mock("../features/backend/userProfileRepository", () => ({
  userProfileRepository: { syncUserProfile: jest.fn() }
}));

const mutableAuth = auth as { currentUser: unknown };
const syncUserProfile = jest.mocked(userProfileRepository.syncUserProfile);

/** Lets the fire-and-forget mirror settle before assertions run. */
const flushMicrotasks = () => new Promise(process.nextTick);

describe("auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mutableAuth.currentUser = null;
    syncUserProfile.mockResolvedValue(undefined);
    jest.mocked(updateProfile).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("registerUser", () => {
    test("names the account and mirrors it to the public profile", async () => {
      const user = { uid: "player-123" };
      jest
        .mocked(createUserWithEmailAndPassword)
        .mockResolvedValue({ user } as never);

      await registerUser("player@example.com", "hunter2", "Quick Draw");
      await flushMicrotasks();

      expect(updateProfile).toHaveBeenCalledWith(user, {
        displayName: "Quick Draw"
      });
      expect(syncUserProfile).toHaveBeenCalledWith("player-123", "Quick Draw");
    });

    test("still succeeds when mirroring the public profile fails", async () => {
      const user = { uid: "player-123" };
      jest
        .mocked(createUserWithEmailAndPassword)
        .mockResolvedValue({ user } as never);
      syncUserProfile.mockRejectedValue(new Error("offline"));

      await expect(
        registerUser("player@example.com", "hunter2", "Quick Draw")
      ).resolves.toBeDefined();
      await flushMicrotasks();
    });
  });

  describe("updateUsername", () => {
    test("updates Auth before mirroring", async () => {
      const user = { uid: "player-123" };
      mutableAuth.currentUser = user;

      await updateUsername("Fast Hands");
      await flushMicrotasks();

      expect(updateProfile).toHaveBeenCalledWith(user, {
        displayName: "Fast Hands"
      });
      expect(syncUserProfile).toHaveBeenCalledWith("player-123", "Fast Hands");
    });

    test("refuses to run while signed out", async () => {
      await expect(updateUsername("Fast Hands")).rejects.toThrow(
        "while signed out"
      );
    });
  });

  describe("syncUserProfileFromAuth", () => {
    test("backfills the profile for a named account", async () => {
      mutableAuth.currentUser = {
        uid: "player-123",
        displayName: "Quick Draw",
        email: "player@example.com"
      };

      syncUserProfileFromAuth();
      await flushMicrotasks();

      expect(syncUserProfile).toHaveBeenCalledWith("player-123", "Quick Draw");
    });

    // Guards a PII leak: `users/{uid}` is readable by every signed-in player,
    // so an unnamed legacy account must not fall back to its email address.
    test("writes nothing for an account with no display name", async () => {
      mutableAuth.currentUser = {
        uid: "player-123",
        displayName: null,
        email: "player@example.com"
      };

      syncUserProfileFromAuth();
      await flushMicrotasks();

      expect(syncUserProfile).not.toHaveBeenCalled();
    });

    test("writes nothing while signed out", async () => {
      syncUserProfileFromAuth();
      await flushMicrotasks();

      expect(syncUserProfile).not.toHaveBeenCalled();
    });
  });
});
