import type { DuelChannel, DuelMessage } from "../../contracts/duelChannel";

export type DuelRole = "host" | "guest";
export type FireSignal = Extract<DuelMessage, { type: "fire" }>;
export type FireSignalListener = (signal: FireSignal) => void;

export class FireSignalCoordinator {
  private countdownComplete = false;
  private fireSignal: FireSignal | null = null;
  private readonly listeners = new Set<FireSignalListener>();
  private readonly unsubscribeFromChannel: () => void;

  constructor(
    private readonly channel: DuelChannel,
    private readonly role: DuelRole,
    private readonly now: () => number = Date.now
  ) {
    this.unsubscribeFromChannel = channel.onMessage((message) => {
      if (message.type === "fire" && this.role === "guest") {
        this.acceptFireSignal(message);
      }
    });
  }

  markCountdownComplete(): void {
    this.countdownComplete = true;
  }

  triggerFire(): FireSignal {
    if (this.role !== "host") {
      throw new Error("Only the duel host can trigger the FIRE signal.");
    }

    if (!this.countdownComplete) {
      throw new Error("The FIRE signal cannot trigger before countdown ends.");
    }

    if (!this.channel.isConnected()) {
      throw new Error("The FIRE signal cannot trigger while disconnected.");
    }

    if (this.fireSignal) {
      throw new Error("The FIRE signal has already triggered for this round.");
    }

    const signal: FireSignal = { type: "fire", atMs: this.now() };
    this.acceptFireSignal(signal);
    this.channel.send(signal);

    return signal;
  }

  getSignal(): FireSignal | null {
    return this.fireSignal;
  }

  onFire(listener: FireSignalListener): () => void {
    this.listeners.add(listener);

    if (this.fireSignal) {
      listener(this.fireSignal);
    }

    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.unsubscribeFromChannel();
    this.listeners.clear();
  }

  private acceptFireSignal(signal: FireSignal): void {
    if (this.fireSignal) {
      return;
    }

    this.fireSignal = signal;
    this.listeners.forEach((listener) => listener(signal));
  }
}
