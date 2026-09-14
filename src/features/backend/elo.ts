export const DEFAULT_ELO_RATING = 1500;
export const ELO_K_FACTOR = 40;

export type EloOutcome = "win" | "loss" | "draw";

export type EloUpdate = {
  playerRating: number;
  opponentRating: number;
  outcome: EloOutcome;
  kFactor?: number;
};

export function expectedScore(
  playerRating: number,
  opponentRating: number
): number {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
}

export function updateElo({
  playerRating,
  opponentRating,
  outcome,
  kFactor = ELO_K_FACTOR
}: EloUpdate): number {
  const actualScore = outcome === "win" ? 1 : outcome === "loss" ? 0 : 0.5;
  return Math.round(
    playerRating +
      kFactor * (actualScore - expectedScore(playerRating, opponentRating))
  );
}

export function updateEloPair(
  playerRating: number,
  opponentRating: number,
  outcome: EloOutcome,
  kFactor = ELO_K_FACTOR
): [number, number] {
  const player = updateElo({ playerRating, opponentRating, outcome, kFactor });
  const opponentOutcome: EloOutcome =
    outcome === "win" ? "loss" : outcome === "loss" ? "win" : "draw";
  const opponent = updateElo({
    playerRating: opponentRating,
    opponentRating: playerRating,
    outcome: opponentOutcome,
    kFactor
  });
  return [player, opponent];
}
