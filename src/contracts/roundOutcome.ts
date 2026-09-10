// Contract between round detection (Tianze: raise/fire/false-start, tickets
// 4.10-4.13; Tanachat: tie handling, ticket 4.15) and the round loop /
// result screen (Mobark, tickets 4.16-4.17).

export type RoundOutcome =
  | {
      kind: "win";
      winnerId: string;
      reactionMs: number;
      opponentReactionMs: number;
    }
  | { kind: "tie"; reactionMs: number }
  | { kind: "falseStart"; playerId: string };

// TODO(tianze/tanachat): once 4.10-4.15 land, replace mockRoundOutcome with
// the real detection pipeline and delete mocks/mockRoundOutcome.ts.
