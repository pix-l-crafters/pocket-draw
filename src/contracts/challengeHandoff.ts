// Contract between the QR scan + challenge send flow (Tingyue, 3.2,
// 3.4-3.6) and the duel session (Siheng, 3.8).

export interface ChallengeHandoff {
  challengerId: string;
  scannedPlayerId: string;
  scannedPlayerName: string;
  roundCount: 3;
  // From the scanned QrInvitePayload — needed to open the duel session (3.8).
  matchId: string;
  discoveryToken: string;
}

// The match format is fixed at three regular rounds. A tied match gets one
// tiebreaker, which is controlled by the round loop rather than this handoff.
