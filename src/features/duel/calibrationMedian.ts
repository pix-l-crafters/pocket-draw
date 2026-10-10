export const CALIBRATION_WINDOW_MS = 350;
export const MIN_CALIBRATION_READINGS = 3;
const MAX_READINGS = 32;

/**
 * Only original motion callbacks contribute; accelerometer callbacks validate
 * pose.
 */
export class CalibrationMedian {
  private readings: { pitch: number; atMs: number }[] = [];

  clear(): void {
    this.readings = [];
  }

  sample(pitch: number | null, atMs: number, validPose: boolean): void {
    if (!validPose || pitch === null || !Number.isFinite(pitch)) {
      this.clear();
      return;
    }
    this.prune(atMs);
    this.readings.push({ pitch, atMs });
    if (this.readings.length > MAX_READINGS) this.readings.shift();
  }

  estimate(nowMs: number) {
    this.prune(nowMs);
    if (this.readings.length < MIN_CALIBRATION_READINGS) return null;
    const sorted = this.readings
      .map(({ pitch }) => pitch)
      .sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return {
      pitch:
        sorted.length % 2
          ? sorted[middle]
          : (sorted[middle - 1] + sorted[middle]) / 2,
      count: sorted.length,
      spanMs:
        this.readings[this.readings.length - 1].atMs - this.readings[0].atMs
    };
  }

  private prune(nowMs: number): void {
    this.readings = this.readings.filter(
      ({ atMs }) => nowMs >= atMs && nowMs - atMs <= CALIBRATION_WINDOW_MS
    );
  }
}
