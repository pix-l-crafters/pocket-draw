import type { DuelChannel } from "../../contracts/duelChannel";
import type { RoundLoopState } from "./roundLoop";

// Half a minute or more in all: long enough for the opponent's phone to notice
// the same drop and start listening again, short enough not to feel stuck.
export const MAX_RECONNECT_ATTEMPTS = 10;
export const RECONNECT_TIMEOUT_MS = 5_000;
/**
 * Attempts start at least this far apart. A refused connection fails instantly,
 * and without pacing the whole budget would go in a few seconds.
 */
export const RECONNECT_ATTEMPT_INTERVAL_MS = 3_000;

export type RecoveryTiming = {
  maxAttempts: number;
  attemptTimeoutMs: number;
  attemptIntervalMs: number;
};

export interface DisconnectContext {
  phase: "round" | "match";
  roundNumber?: number;
  /**
   * In-progress score/round history, carried through so a caller can resume the
   * match instead of restarting it once the channel reconnects.
   */
  matchState?: RoundLoopState;
}

export type DisconnectRecoveryState =
  | {
      status: "retrying";
      attempt: number;
      maxAttempts: number;
      context: DisconnectContext;
    }
  | { status: "recovered"; attempts: number; context: DisconnectContext }
  | { status: "aborted"; attempts: number; context: DisconnectContext };

export type ReconnectAttempt = (signal: AbortSignal) => Promise<boolean>;

export class DuelDisconnectRecovery {
  private activeRecovery: Promise<DisconnectRecoveryState> | null = null;
  private currentAttempt: AbortController | null = null;
  private cancelPause: (() => void) | null = null;
  private disposed = false;
  private readonly timing: RecoveryTiming;
  private readonly listeners = new Set<
    (state: DisconnectRecoveryState) => void
  >();

  constructor(
    private readonly channel: DuelChannel,
    private readonly reconnect: ReconnectAttempt,
    private readonly onAbort: (context: DisconnectContext) => void = () => {},
    timing: Partial<RecoveryTiming> = {}
  ) {
    this.timing = {
      maxAttempts: MAX_RECONNECT_ATTEMPTS,
      attemptTimeoutMs: RECONNECT_TIMEOUT_MS,
      attemptIntervalMs: RECONNECT_ATTEMPT_INTERVAL_MS,
      ...timing
    };
  }

  recover(context: DisconnectContext): Promise<DisconnectRecoveryState> {
    if (this.disposed) {
      throw new Error("Disconnect recovery has been disposed.");
    }

    if (!this.activeRecovery) {
      this.activeRecovery = this.runRecovery(context).finally(() => {
        this.activeRecovery = null;
      });
    }

    return this.activeRecovery;
  }

  onState(listener: (state: DisconnectRecoveryState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.disposed = true;
    this.currentAttempt?.abort();
    this.currentAttempt = null;
    this.cancelPause?.();
    this.listeners.clear();
  }

  private async runRecovery(
    context: DisconnectContext
  ): Promise<DisconnectRecoveryState> {
    if (this.channel.isConnected()) {
      return this.publish({ status: "recovered", attempts: 0, context });
    }

    const { maxAttempts } = this.timing;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      this.publish({
        status: "retrying",
        attempt,
        maxAttempts,
        context
      });

      const startedAt = Date.now();
      if ((await this.runAttempt()) && this.channel.isConnected()) {
        return this.publish({
          status: "recovered",
          attempts: attempt,
          context
        });
      }

      if (attempt < maxAttempts) {
        await this.pause(
          startedAt + this.timing.attemptIntervalMs - Date.now()
        );
      }
      if (this.disposed) {
        break;
      }
    }

    const state: DisconnectRecoveryState = {
      status: "aborted",
      attempts: maxAttempts,
      context
    };
    this.onAbort(context);
    return this.publish(state);
  }

  private runAttempt(): Promise<boolean> {
    const controller = new AbortController();
    this.currentAttempt = controller;

    return new Promise((resolve) => {
      let settled = false;
      const finish = (result: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (this.currentAttempt === controller) {
          this.currentAttempt = null;
        }
        resolve(result);
      };
      const timeout = setTimeout(() => {
        controller.abort();
        finish(false);
      }, this.timing.attemptTimeoutMs);

      this.reconnect(controller.signal)
        .then(finish)
        .catch(() => finish(false));
    });
  }

  private pause(ms: number): Promise<void> {
    if (ms <= 0 || this.disposed) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(done, ms);
      function done() {
        clearTimeout(timer);
        resolve();
      }
      this.cancelPause = () => {
        this.cancelPause = null;
        done();
      };
    });
  }

  private publish(state: DisconnectRecoveryState): DisconnectRecoveryState {
    this.listeners.forEach((listener) => listener(state));
    return state;
  }
}
