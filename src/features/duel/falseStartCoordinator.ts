import type { DuelChannel } from "../../contracts/duelChannel";
import {
  FalseStartDetector,
  type FalseStartDetection
} from "./falseStartDetector";
import type { AccelerationSample } from "./raiseGestureDetector";

// Reports an early violation; the round producer enriches it with both shots.
export type FalseStartOutcome =
  | { kind: "falseStart"; playerId: string }
  | { kind: "warning"; playerId: string; count: 1 };

export class FalseStartCoordinator {
  private outcome: FalseStartOutcome | null = null;
  private readonly offenders = new Set<string>();
  private readonly reported = new Set<string>();
  private readonly warningCounts: Record<string, number>;
  private attempt = 0;
  private roundStarted = false;
  private beforeFire = false;
  private readonly listeners = new Set<(outcome: FalseStartOutcome) => void>();
  private readonly unsubscribeFromChannel: () => void;

  constructor(
    private readonly channel: DuelChannel,
    private readonly localPlayerId: string,
    private readonly opponentPlayerId: string,
    private readonly detector = new FalseStartDetector(),
    warningCounts: Record<string, number> = {}
  ) {
    this.warningCounts = { ...warningCounts };
    this.unsubscribeFromChannel = channel.onMessage((message) => {
      if (
        message.type === "falseStart" &&
        this.roundStarted &&
        (message.attempt ?? 0) === this.attempt &&
        Number.isFinite(message.atMs) &&
        message.atMs >= 0
      ) {
        this.acceptViolation(this.opponentPlayerId, message.count ?? 2);
      }
    });
  }

  arm(attempt = 0): void {
    this.outcome = null;
    this.offenders.clear();
    this.reported.clear();
    this.attempt = attempt;
    this.roundStarted = true;
    this.beforeFire = true;
    this.detector.arm();
  }

  markFire(atMs: number): void {
    this.beforeFire = false;
    this.detector.markFire(atMs);
  }

  processLocalSample(sample: AccelerationSample): FalseStartOutcome | null {
    if (!Number.isFinite(sample.atMs) || sample.atMs < 0) return null;
    const detection: FalseStartDetection | null = this.detector.process(sample);
    if (!detection) {
      return null;
    }

    return this.reportLocalViolation(detection.atMs);
  }

  processLocalFire(atMs: number): FalseStartOutcome | null {
    return this.reportLocalViolation(atMs);
  }

  hasFalseStarted(playerId: string): boolean {
    return this.offenders.has(playerId);
  }

  getWarningCount(playerId: string): number {
    return this.warningCounts[playerId] ?? 0;
  }

  private reportLocalViolation(atMs: number): FalseStartOutcome | null {
    if (
      !this.beforeFire ||
      this.reported.has(this.localPlayerId) ||
      !Number.isFinite(atMs) ||
      atMs < 0
    ) {
      return null;
    }
    // A button press must also disarm movement detection for this round.
    this.detector.reset();
    const count = (this.getWarningCount(this.localPlayerId) === 0 ? 1 : 2) as
      | 1
      | 2;
    const outcome = this.acceptViolation(this.localPlayerId, count)!;
    if (this.channel.isConnected()) {
      this.channel.send({
        type: "falseStart",
        atMs,
        attempt: this.attempt,
        count
      });
    }
    return outcome;
  }

  getOutcome(): FalseStartOutcome | null {
    return this.outcome;
  }

  onOutcome(listener: (outcome: FalseStartOutcome) => void): () => void {
    this.listeners.add(listener);
    if (this.outcome) {
      listener(this.outcome);
    }

    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.unsubscribeFromChannel();
    this.listeners.clear();
    this.detector.reset();
    this.roundStarted = false;
    this.beforeFire = false;
    this.offenders.clear();
    this.reported.clear();
  }

  private acceptViolation(
    playerId: string,
    count: 1 | 2
  ): FalseStartOutcome | null {
    if (this.reported.has(playerId)) return null;
    this.reported.add(playerId);
    const outcome: FalseStartOutcome =
      count === 1
        ? { kind: "warning", playerId, count: 1 }
        : { kind: "falseStart", playerId };
    this.warningCounts[playerId] = 1;
    if (count === 2) this.offenders.add(playerId);
    if (
      !this.outcome ||
      (outcome.kind === "falseStart" &&
        (this.outcome.kind === "warning" || playerId < this.outcome.playerId))
    ) {
      this.outcome = outcome;
    }
    this.listeners.forEach((listener) => listener(outcome));
    return outcome;
  }
}
