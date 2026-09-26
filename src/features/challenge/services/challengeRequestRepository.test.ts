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
      challengeToken: "0123456789abcdef0123456789abcdef",
      challengerId: "challenger-123",
      connection: {
        mode: "existingWifi",
        hostIp: "192.168.1.42",
        signalPort: 43123
      },
      discoveryToken: "discovery-token-123",
      matchId: "match-123",
      roundCount: 5,
      scannedPlayerId: "opponent-456",
      scannedPlayerName: "Opponent"
    });

    expect(addDoc).toHaveBeenCalledWith(collectionReference, {
      challengeToken: "0123456789abcdef0123456789abcdef",
      challengerId: "challenger-123",
      connection: {
        mode: "existingWifi",
        hostIp: "192.168.1.42",
        signalPort: 43123
      },
      discoveryToken: "discovery-token-123",
      matchId: "match-123",
      roundCount: 5,
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
