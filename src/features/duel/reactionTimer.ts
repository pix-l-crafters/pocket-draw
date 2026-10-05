export interface ReactionCapture {
  fireAtMs: number;
  raisedAtMs: number;
  reactionMs: number;
}

export class ReactionTimer {
  private capture: ReactionCapture | null = null;
  private fireAtMs: number | null = null;

  start(fireAtMs: number): void {
    if (!Number.isFinite(fireAtMs)) {
      throw new Error("FIRE time must be a finite millisecond timestamp.");
    }

    this.fireAtMs = fireAtMs;
    this.capture = null;
  }

  captureRaise(raisedAtMs: number): ReactionCapture | null {
    if (this.fireAtMs === null) {
      throw new Error("Reaction timing cannot start before FIRE.");
    }

    if (!Number.isFinite(raisedAtMs) || raisedAtMs < this.fireAtMs) {
      return null;
    }

    if (this.capture) {
      return this.capture;
    }

    this.capture = {
      fireAtMs: this.fireAtMs,
      raisedAtMs,
      reactionMs: raisedAtMs - this.fireAtMs
    };
    return this.capture;
  }

  getCapture(): ReactionCapture | null {
    return this.capture;
  }

  reset(): void {
    this.capture = null;
    this.fireAtMs = null;
  }
}
