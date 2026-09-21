import { classifyZone, computeRaiseFraction } from "./pitchZoneClassifier";
import { ZONE_POINTS } from "../../contracts/roundOutcome";

describe("computeRaiseFraction", () => {
  it("returns 0 at the ready pose", () => {
    expect(computeRaiseFraction(10, 10, 60)).toBe(0);
  });

  it("returns 1 at the calibrated shoulder pose", () => {
    expect(computeRaiseFraction(60, 10, 60)).toBe(1);
  });

  it("interpolates linearly between ready and shoulder", () => {
    expect(computeRaiseFraction(35, 10, 60)).toBeCloseTo(0.5);
  });

  it("extrapolates above 1 when raised past the shoulder pose", () => {
    expect(computeRaiseFraction(70, 10, 60)).toBeCloseTo(1.2);
  });

  it("throws when the calibrated arc has zero range", () => {
    expect(() => computeRaiseFraction(10, 10, 10)).toThrow(/calibrated arc/i);
  });
});

describe("classifyZone", () => {
  it("classifies a fraction well below the bodyshot band as a miss", () => {
    expect(classifyZone(0.5)).toBe("miss");
  });

  it("classifies just below the bodyshot lower bound as a miss", () => {
    expect(classifyZone(0.79)).toBe("miss");
  });

  it("classifies the bodyshot lower bound as a bodyshot", () => {
    expect(classifyZone(0.8)).toBe("bodyshot");
  });

  it("classifies the calibrated shoulder pose (f=1) as a bodyshot", () => {
    expect(classifyZone(1.0)).toBe("bodyshot");
  });

  it("classifies just above the shoulder pose as a headshot", () => {
    expect(classifyZone(1.01)).toBe("headshot");
  });

  it("classifies the top of the headshot band as a headshot", () => {
    expect(classifyZone(1.2)).toBe("headshot");
  });

  it("classifies past the headshot band as a miss", () => {
    expect(classifyZone(1.21)).toBe("miss");
  });

  it("classifies a negative fraction as a miss", () => {
    expect(classifyZone(-0.3)).toBe("miss");
  });
});

describe("ZONE_POINTS", () => {
  it("maps each zone to its Gameplay v2 point value", () => {
    expect(ZONE_POINTS).toEqual({ miss: 0, bodyshot: 1, headshot: 2 });
  });
});
