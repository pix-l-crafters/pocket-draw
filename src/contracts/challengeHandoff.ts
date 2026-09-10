// Contract between the QR scan (Tingyue, 3.2) and the challenge send /
// round selector / BLE session (Siheng, 3.4-3.6, 3.8).

export interface ChallengeHandoff {
  challengerId: string;
  scannedPlayerId: string;
  roundCount: 3 | 5 | 7;
}

// TODO(tingyue): once 3.2 lands, wire the real scan result here and delete
// mocks/mockChallengeHandoff.ts.
