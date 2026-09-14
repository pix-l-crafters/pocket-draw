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
  | {
      kind: "tie";
      reactionMs: number;
      opponentReactionMs: number;
      pointsEach: 1;
    }
  | { kind: "falseStart"; playerId: string };

// Producer implementation: src/features/duel/roundJudge.ts.
// TODO(mobark): once the producer branch lands, replace mockRoundOutcome with
// the real pipeline and delete mocks/mockRoundOutcome.ts.
