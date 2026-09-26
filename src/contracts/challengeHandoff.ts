import type { DuelConnectionInfo } from "./duelConnection";

// Contract between QR scan, challenge selection, and the local duel session.

export interface ChallengeHandoff {
  challengerId: string;
  scannedPlayerId: string;
  scannedPlayerName: string;
  roundCount: 3 | 5 | 7;
  // From the scanned QrInvitePayload — required to authenticate signaling.
  matchId: string;
  challengeToken: string;
  discoveryToken: string;
  connection: DuelConnectionInfo;
}
