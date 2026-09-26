import type { DuelConnectionInfo } from "./duelConnection";

// Contract between the QR scan + challenge send flow (Tingyue, 3.2, 3.4-3.6)
// and the duel session, connecting over WebRTC (3.8).

export interface ChallengeHandoff {
  challengerId: string;
  scannedPlayerId: string;
  scannedPlayerName: string;
  roundCount: 3;
  // From the scanned QrInvitePayload — required to authenticate signaling and
  // open the duel session.
  matchId: string;
  challengeToken: string;
  discoveryToken: string;
  connection: DuelConnectionInfo;
}

// The match format is fixed at three regular rounds. A tied match gets one
// tiebreaker, which is controlled by the round loop rather than this handoff.
