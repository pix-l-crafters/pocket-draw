import type { DuelChannel } from "../../contracts/duelChannel";
import {
  FalseStartDetector,
  type FalseStartDetection
} from "./falseStartDetector";
import type { AccelerationSample } from "./raiseGestureDetector";

// Reports an early violation; the round producer enriches it with both shots.
export type FalseStartOutcome = { kind: "falseStart"; playerId: string };

export class FalseStartCoordinator {
  private outcome: FalseStartOutcome | null = null;
  private readonly offenders = new Set<string>();
  private roundStarted = false;
  private beforeFire = false;
  private readonly listeners = new Set<(outcome: FalseStartOutcome) => void>();
  private readonly unsubscribeFromChannel: () => void;

  constructor(
    private readonly channel: DuelChannel,
    private readonly localPlayerId: string,
    private readonly opponentPlayerId: string,
    private readonly detector = new FalseStartDetector()
  ) {
    this.unsubscribeFromChannel = channel.onMessage((message) => {
      if (message.type === "falseStart" && this.roundStarted) {
        this.acceptOutcome({
          kind: "falseStart",
          playerId: this.opponentPlayerId
        });
      }
    });
  }

  arm(): void {
    this.outcome = null;
    this.offenders.clear();
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

  private reportLocalViolation(atMs: number): FalseStartOutcome | null {
    if (
      !this.beforeFire ||
      this.offenders.has(this.localPlayerId) ||
      !Number.isFinite(atMs) ||
      atMs < 0
    ) {
      return null;
    }
    // A button press must also disarm movement detection for this round.
    this.detector.reset();
    const outcome: FalseStartOutcome = {
      kind: "falseStart",
      playerId: this.localPlayerId
    };
    this.acceptOutcome(outcome);
    if (this.channel.isConnected()) {
      this.channel.send({ type: "falseStart", atMs });
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
  }

  private acceptOutcome(outcome: FalseStartOutcome): void {
    if (this.offenders.has(outcome.playerId)) return;
    this.offenders.add(outcome.playerId);
    // Crossed early inputs must choose the same offender on both phones.
    // Both offenders' shots are suppressed, so neither scores in this case.
    if (!this.outcome || outcome.playerId < this.outcome.playerId) {
      this.outcome = outcome;
    }
    this.listeners.forEach((listener) => listener(this.outcome!));
  }
}
