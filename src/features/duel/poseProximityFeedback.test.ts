import { PoseProximityFeedback } from "./poseProximityFeedback";

describe("PoseProximityFeedback", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("changes from a sustained buzz to increasingly frequent pulses", () => {
    const pulse = jest.fn();
    const feedback = new PoseProximityFeedback(pulse);

    feedback.update(0.01, 0.05);
    jest.advanceTimersByTime(1_000);
    const farCount = pulse.mock.calls.length;

    feedback.update(0.03, 0.05);
    jest.advanceTimersByTime(1_000);
    const approachingCount = pulse.mock.calls.length - farCount;

    feedback.update(0.045, 0.05);
    jest.advanceTimersByTime(1_000);
    const nearCount = pulse.mock.calls.length - farCount - approachingCount;

    expect(farCount).toBeGreaterThan(nearCount);
    expect(nearCount).toBeGreaterThan(approachingCount);
  });

  it("stops immediately for valid or missing readings and stays stopped after disposal", () => {
    const pulse = jest.fn();
    const feedback = new PoseProximityFeedback(pulse);
    feedback.update(0.01, 0.05);
    feedback.update(0.05, 0.05);
    const countAtValid = pulse.mock.calls.length;
    jest.advanceTimersByTime(2_000);
    expect(pulse).toHaveBeenCalledTimes(countAtValid);

    feedback.update(0.02, 0.05);
    feedback.update(null, 0.05);
    const countAtMissing = pulse.mock.calls.length;
    jest.advanceTimersByTime(2_000);
    expect(pulse).toHaveBeenCalledTimes(countAtMissing);

    feedback.update(0.01, 0.05);
    feedback.dispose();
    const countAtDisposal = pulse.mock.calls.length;
    jest.advanceTimersByTime(2_000);
    feedback.update(0.01, 0.05);
    expect(pulse).toHaveBeenCalledTimes(countAtDisposal);
  });

  it("stops buzzing if motion readings stop arriving", () => {
    const pulse = jest.fn();
    const feedback = new PoseProximityFeedback(pulse);
    feedback.update(0.01, 0.05);

    jest.advanceTimersByTime(2_500);
    const countAtStall = pulse.mock.calls.length;
    jest.advanceTimersByTime(1_000);
    expect(pulse).toHaveBeenCalledTimes(countAtStall);
  });
});
