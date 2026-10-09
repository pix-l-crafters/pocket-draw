import type { RoundOutcome } from "../../contracts/roundOutcome";
import { TIE_WINDOW_MS } from "./roundJudge";

export function roundTieDescription(
  outcome: Extract<RoundOutcome, { kind: "tie" }>
): string {
  return outcome.zone === "miss"
    ? "Both missed · 0 points each"
    : `Both ${outcome.zone}s within ${TIE_WINDOW_MS} ms · ${outcome.pointsEach} ${outcome.pointsEach === 1 ? "point" : "points"} each`;
}
