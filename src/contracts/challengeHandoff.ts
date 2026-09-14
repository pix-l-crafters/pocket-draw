// Contract between the QR scan + challenge send / round selector (Tingyue,
// 3.2, 3.4-3.6) and the BLE duel session (Siheng, 3.8).

export interface ChallengeHandoff {
  challengerId: string;
  scannedPlayerId: string;
  scannedPlayerName: string;
  roundCount: 3 | 5 | 7;
  // From the scanned QrInvitePayload — needed to open the duel session (3.8).
  matchId: string;
  discoveryToken: string;
}

// TODO(tingyue): 3.2 lands the real scan; 3.4-3.6 pick roundCount and must
// forward scannedPlayerName + matchId + ble.discoveryToken from parseQrInvite's
// result.value / scanned invite into this handoff. Then delete
// mocks/mockChallengeHandoff.ts.
