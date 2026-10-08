import type { DuelChannel } from "../../contracts/duelChannel";

interface ClockOffsetSample {
  offsetMs: number;
  rttMs: number;
}

const DEFAULT_SAMPLE_COUNT = 5;
const SAMPLE_TIMEOUT_MS = 2_000;

/**
 * Ping-pong RTT clock-offset calibration (NTP-style). Either side answers pings
 * passively; whichever side calls `calibrate()` learns how far ahead (or
 * behind) the other side's clock is, so it can correct timestamps it receives
 * from that peer.
 */
export class ClockOffsetCalibrator {
  private offsetMs = 0;
  private disposed = false;
  private readonly unsubscribeFromChannel: () => void;
  private cancelPendingSample: ((error: Error) => void) | null = null;

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
      if (this.disposed) {
        throw new Error("Clock calibration was cancelled.");
      }
      samples.push(await this.runOneSample());
    }

    const best = samples.reduce((min, sample) =>
      sample.rttMs < min.rttMs ? sample : min
    );
    this.offsetMs = best.offsetMs;
    return this.offsetMs;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribeFromChannel();
    this.cancelPendingSample?.(new Error("Clock calibration was cancelled."));
  }

  private runOneSample(): Promise<ClockOffsetSample> {
    let resolveSample!: (sample: ClockOffsetSample) => void;
    let rejectSample!: (error: Error) => void;
    const promise = new Promise<ClockOffsetSample>((resolve, reject) => {
      resolveSample = resolve;
      rejectSample = reject;
    });
    const pendingPingTimes = new Set<number>();
    let unsubscribe: (() => void) | undefined;
    let timeout: ReturnType<typeof setTimeout>;
    let retryTimer: ReturnType<typeof setInterval>;
    const finish = (callback: () => void) => {
      clearTimeout(timeout);
      clearInterval(retryTimer);
      unsubscribe?.();
      this.cancelPendingSample = null;
      callback();
    };
    const sendPing = () => {
      const t0 = this.now();
      pendingPingTimes.add(t0);
      try {
        this.channel.send({ type: "clockPing", t0 });
      } catch {
        finish(() =>
          rejectSample(new Error("Clock calibration could not send a ping."))
        );
      }
    };
    unsubscribe = this.channel.onMessage((message) => {
      if (message.type !== "clockPong") return;
      if (!pendingPingTimes.has(message.t0)) {
        return;
      }
      const t3 = this.now();
      finish(() =>
        resolveSample({
          offsetMs: (message.t1 - message.t0 - (t3 - message.t2)) / 2,
          rttMs: t3 - message.t0
        })
      );
    });
    this.cancelPendingSample = (error) => finish(() => rejectSample(error));
    timeout = setTimeout(() => {
      finish(() => rejectSample(new Error("Clock calibration timed out.")));
    }, SAMPLE_TIMEOUT_MS);
    retryTimer = setInterval(sendPing, 250);
    sendPing();
    return promise;
  }
}
