import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  Timestamp,
  updateDoc
} from "firebase/firestore";

import { challengeRequestRepository } from "./challengeRequestRepository";

// Test-only hotspot passphrase.
const FIXTURE_PASSPHRASE = "draw-4821";

jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  Timestamp: {
    fromMillis: jest.fn()
  }
}));

jest.mock("../../../lib/firebase", () => ({
  db: { name: "test-database" }
}));

describe("challengeRequestRepository", () => {
  beforeEach(() => jest.clearAllMocks());

  test.each(["", " ", "another/request"])(
    "rejects invalid request ID %p",
    async (id) => {
      await expect(
        challengeRequestRepository.updateStatus(id, "accepted")
      ).rejects.toThrow("A valid challenge request ID is required.");
      expect(updateDoc).not.toHaveBeenCalled();
    }
  );

  test("propagates a failed status save", async () => {
    const error = new Error("Write denied");
    jest.mocked(updateDoc).mockRejectedValueOnce(error);
    await expect(
      challengeRequestRepository.updateStatus("request-123", "declined")
    ).rejects.toBe(error);
  });

  test.each(["accepted", "declined"] as const)(
    "saves %s on the specific request document",
    async (status) => {
      const reference = { id: "request-123" };
      jest.mocked(doc).mockReturnValue(reference as never);
      await challengeRequestRepository.updateStatus("request-123", status);
      expect(doc).toHaveBeenCalledWith(
        { name: "test-database" },
        "challengeRequests",
        "request-123"
      );
      expect(updateDoc).toHaveBeenCalledWith(reference, { status });
    }
  );

  test("creates a pending challenge and returns its request ID", async () => {
    const collectionReference = { name: "challengeRequests" };
    const createdAt = { type: "server-timestamp" };
    const expiresAt = { type: "expiry-timestamp" };

    jest.mocked(collection).mockReturnValue(collectionReference as never);
    jest.mocked(serverTimestamp).mockReturnValue(createdAt as never);
    jest.mocked(Timestamp.fromMillis).mockReturnValue(expiresAt as never);
    jest.mocked(addDoc).mockResolvedValue({
      id: "request-123"
    } as never);

    const result = await challengeRequestRepository.sendChallenge({
      challengeToken: "0123456789abcdef0123456789abcdef",
      challengerId: "challenger-123",
      connection: {
        mode: "hotspot",
        ssid: "PocketDraw-A1B2",
        password: FIXTURE_PASSPHRASE,
        hostIp: "192.168.43.1",
        signalPort: 43123
      },
      discoveryToken: "discovery-token-123",
      matchId: "match-123",
      scannedPlayerId: "opponent-456",
      scannedPlayerName: "Opponent"
    });

    expect(addDoc).toHaveBeenCalledWith(collectionReference, {
      challengerId: "challenger-123",
      matchId: "match-123",
      scannedPlayerId: "opponent-456",
      scannedPlayerName: "Opponent",
      status: "pending",
      createdAt,
      expiresAt
    });

    expect(result).toEqual({
      requestId: "request-123"
    });
  });
});
