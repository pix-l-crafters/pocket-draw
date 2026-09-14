import type { DuelChannel } from "../../contracts/duelChannel";
import type { RoundOutcome } from "../../contracts/roundOutcome";
import {
  FalseStartDetector,
  type FalseStartDetection
} from "./falseStartDetector";
import type { AccelerationSample } from "./raiseGestureDetector";

export type FalseStartOutcome = Extract<RoundOutcome, { kind: "falseStart" }>;

export class FalseStartCoordinator {
  private outcome: FalseStartOutcome | null = null;
  private readonly listeners = new Set<(outcome: FalseStartOutcome) => void>();
  private readonly unsubscribeFromChannel: () => void;

  constructor(
    private readonly channel: DuelChannel,
    private readonly localPlayerId: string,
    private readonly opponentPlayerId: string,
    private readonly detector = new FalseStartDetector()
  ) {
    this.unsubscribeFromChannel = channel.onMessage((message) => {
      if (message.type === "falseStart") {
        this.acceptOutcome({
          kind: "falseStart",
          playerId: this.opponentPlayerId
        });
      }
    });
  }

  arm(): void {
    this.outcome = null;
    this.detector.arm();
  }

  markFire(atMs: number): void {
    this.detector.markFire(atMs);
  }

  processLocalSample(sample: AccelerationSample): FalseStartOutcome | null {
    const detection: FalseStartDetection | null = this.detector.process(sample);
    if (!detection) {
      return null;
    }

    const outcome: FalseStartOutcome = {
      kind: "falseStart",
      playerId: this.localPlayerId
    };
    this.acceptOutcome(outcome);

    if (this.channel.isConnected()) {
      this.channel.send({ type: "falseStart", atMs: detection.atMs });
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
  }

  private acceptOutcome(outcome: FalseStartOutcome): void {
    if (this.outcome) {
      return;
    }

    this.outcome = outcome;
    this.listeners.forEach((listener) => listener(outcome));
  }
}
