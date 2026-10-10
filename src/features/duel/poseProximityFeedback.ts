export type ProximityBand = "far" | "approaching" | "near";

const PULSE_INTERVAL_MS: Record<ProximityBand, number> = {
  far: 100,
  approaching: 650,
  near: 250
};
const MAX_READING_AGE_MS = 2_000;

/** Sends feedback only while the shoulder pose is short of the valid arc. */
export class PoseProximityFeedback {
  private band: ProximityBand | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private disposed = false;
  private lastReadingAtMs = 0;

  constructor(private readonly pulse: (band: ProximityBand) => void) {}

  update(arc: number | null, minimumArc: number): void {
    if (this.disposed) return;
    if (arc === null || !Number.isFinite(arc) || arc >= minimumArc) {
      this.stop();
      return;
    }
    this.lastReadingAtMs = Date.now();

    const nextBand: ProximityBand =
      arc < minimumArc * 0.4
        ? "far"
        : arc < minimumArc * 0.8
          ? "approaching"
          : "near";
    if (this.band === nextBand) return;

    this.stop();
    this.band = nextBand;
    this.pulse(nextBand);
    this.timer = setInterval(() => {
      if (Date.now() - this.lastReadingAtMs >= MAX_READING_AGE_MS) {
        this.stop();
      } else if (!this.disposed && this.band === nextBand) {
        this.pulse(nextBand);
      }
    }, PULSE_INTERVAL_MS[nextBand]);
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.band = null;
  }

  dispose(): void {
    this.stop();
    this.disposed = true;
  }
}
