import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";

import { challengeRequestRepository } from "./challengeRequestRepository";

jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  serverTimestamp: jest.fn(),
  Timestamp: {
    fromMillis: jest.fn()
  }
}));

jest.mock("../../../lib/firebase", () => ({
  db: { name: "test-database" }
}));

describe("challengeRequestRepository", () => {
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
      challengerId: "challenger-123",
      scannedPlayerId: "opponent-456",
      roundCount: 5
    });

    expect(addDoc).toHaveBeenCalledWith(collectionReference, {
      challengerId: "challenger-123",
      scannedPlayerId: "opponent-456",
      roundCount: 5,
      status: "pending",
      createdAt,
      expiresAt
    });

    expect(result).toEqual({
      requestId: "request-123"
    });
  });
});
