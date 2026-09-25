import type { DuelChannel } from "../../contracts/duelChannel";

interface ClockOffsetSample {
  offsetMs: number;
  rttMs: number;
}

const DEFAULT_SAMPLE_COUNT = 5;

/**
 * Ping-pong RTT clock-offset calibration (NTP-style). Either side answers
 * pings passively; whichever side calls `calibrate()` learns how far ahead
 * (or behind) the other side's clock is, so it can correct timestamps it
 * receives from that peer.
 */
export class ClockOffsetCalibrator {
  private offsetMs = 0;
  private readonly unsubscribeFromChannel: () => void;

  constructor(
    private readonly channel: DuelChannel,
    private readonly now: () => number = Date.now
  ) {
    this.unsubscribeFromChannel = channel.onMessage((message) => {
      if (message.type !== "clockPing") return;
      const t1 = this.now();
      this.channel.send({
        type: "clockPong",
        t0: message.t0,
        t1,
        t2: this.now()
      });
    });
  }

  getOffsetMs(): number {
    return this.offsetMs;
  }

  // Runs `sampleCount` sequential ping/pong round trips and keeps the offset
  // from the lowest-RTT sample, since a shorter round trip is less likely to
  // be skewed by transport jitter.
  async calibrate(sampleCount = DEFAULT_SAMPLE_COUNT): Promise<number> {
    const samples: ClockOffsetSample[] = [];
    for (let i = 0; i < sampleCount; i += 1) {
      samples.push(await this.runOneSample());
    }

    const best = samples.reduce((min, sample) =>
      sample.rttMs < min.rttMs ? sample : min
    );
    this.offsetMs = best.offsetMs;
    return this.offsetMs;
  }

  dispose(): void {
    this.unsubscribeFromChannel();
  }

  private runOneSample(): Promise<ClockOffsetSample> {
    return new Promise((resolve) => {
      const t0 = this.now();
      const unsubscribe = this.channel.onMessage((message) => {
        if (message.type !== "clockPong" || message.t0 !== t0) return;
        const t3 = this.now();
        unsubscribe();
        resolve({
          offsetMs: (message.t1 - t0 - (t3 - message.t2)) / 2,
          rttMs: t3 - t0
        });
      });
      this.channel.send({ type: "clockPing", t0 });
    });
  }
}
