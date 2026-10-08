import { isTopEdgeDown, isTopEdgeForward, PoseHold } from "./calibrationPose";

describe("calibration pose", () => {
  it("requires the requested edge direction on both platforms", () => {
    expect(isTopEdgeDown(0, 0.9, 0, "ios")).toBe(true);
    expect(isTopEdgeDown(0, -0.9, 0, "android")).toBe(true);
    expect(isTopEdgeDown(0, -0.9, 0, "ios")).toBe(false);
    expect(isTopEdgeForward(0, 0, 0.95)).toBe(true);
    expect(isTopEdgeForward(0.95, 0, 0)).toBe(true);
    expect(isTopEdgeForward(0, 0.9, 0)).toBe(false);
  });

  it("accepts only after two seconds of steady valid samples", () => {
    const hold = new PoseHold();
    for (let atMs = 0; atMs <= 1_000; atMs += 100) {
      expect(hold.sample(true, 0.22, atMs)).toBe(false);
    }
    expect(hold.sample(false, 0.2, 1_500)).toBe(false);
    for (let atMs = 1_600; atMs < 3_600; atMs += 100) {
      expect(hold.sample(true, 0.22, atMs)).toBe(false);
    }
    expect(hold.sample(true, 0.22, 3_600)).toBe(true);
  });
});
