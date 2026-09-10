export interface RaiseGestureSpec {
  /** Minimum resultant acceleration, measured in g-force. */
  accelerationThresholdG: number;
  /** Time the threshold must remain crossed before a raise is accepted. */
  minimumDurationMs: number;
  /** Lockout after a valid raise to suppress duplicate sensor events. */
  debounceMs: number;
}

/**
 * Approved ticket 4.9 raise-to-threshold gesture.
 *
 * A player draws by raising the phone from the down/resting pose until the
 * resultant accelerometer magnitude reaches 1.8g for at least 80ms. A 300ms
 * debounce prevents the same physical movement from registering twice.
 */
export const RAISE_GESTURE_SPEC: Readonly<RaiseGestureSpec> = Object.freeze({
  accelerationThresholdG: 1.8,
  minimumDurationMs: 80,
  debounceMs: 300
});
