import type { DuelChannel } from "../../contracts/duelChannel";

export const MAX_RECONNECT_ATTEMPTS = 2;
export const RECONNECT_TIMEOUT_MS = 3_000;

export interface DisconnectContext {
  phase: "round" | "match";
  roundNumber?: number;
}

export type DisconnectRecoveryState =
  | { status: "retrying"; attempt: number; maxAttempts: number }
  | { status: "recovered"; attempts: number }
  | { status: "aborted"; attempts: number; context: DisconnectContext };

export type ReconnectAttempt = (signal: AbortSignal) => Promise<boolean>;

export class DuelDisconnectRecovery {
  private activeRecovery: Promise<DisconnectRecoveryState> | null = null;
  private currentAttempt: AbortController | null = null;
  private disposed = false;
  private readonly listeners = new Set<
    (state: DisconnectRecoveryState) => void
  >();

  constructor(
    private readonly channel: DuelChannel,
    private readonly reconnect: ReconnectAttempt,
    private readonly onAbort: (context: DisconnectContext) => void = () => {}
  ) {}

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
    this.listeners.clear();
  }

  private async runRecovery(
    context: DisconnectContext
  ): Promise<DisconnectRecoveryState> {
    if (this.channel.isConnected()) {
      return this.publish({ status: "recovered", attempts: 0 });
    }

    for (let attempt = 1; attempt <= MAX_RECONNECT_ATTEMPTS; attempt += 1) {
      this.publish({
        status: "retrying",
        attempt,
        maxAttempts: MAX_RECONNECT_ATTEMPTS
      });

      if ((await this.runAttempt()) && this.channel.isConnected()) {
        return this.publish({ status: "recovered", attempts: attempt });
      }

      if (this.disposed) {
        break;
      }
    }

    const state: DisconnectRecoveryState = {
      status: "aborted",
      attempts: MAX_RECONNECT_ATTEMPTS,
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
      }, RECONNECT_TIMEOUT_MS);

      this.reconnect(controller.signal)
        .then(finish)
        .catch(() => finish(false));
    });
  }

  private publish(state: DisconnectRecoveryState): DisconnectRecoveryState {
    this.listeners.forEach((listener) => listener(state));
    return state;
  }
}
