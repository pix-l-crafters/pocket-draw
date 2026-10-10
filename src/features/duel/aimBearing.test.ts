import { classifyAimZone } from "./aimBearing";

const self = { latitude: 0, longitude: 0, accuracy: 1 };
const north = { latitude: 0.001, longitude: 0, accuracy: 1 };

describe("classifyAimZone", () => {
  test.each([
    [0, "bodyshot"],
    [30, "bodyshot"],
    [330, "bodyshot"],
    [359, "bodyshot"],
    [30.001, "miss"],
    [329.999, "miss"],
    [90, "miss"],
    [180, "miss"]
  ] as const)(
    "classifies heading %s around north as %s",
    (heading, expected) => {
      expect(
        classifyAimZone({ zone: "bodyshot" }, heading, self, north).zone
      ).toBe(expected);
    }
  );

  test("preserves the supplied pitch zone instead of promoting it", () => {
    expect(classifyAimZone({ zone: "headshot" }, 0, self, north).zone).toBe(
      "headshot"
    );
    expect(classifyAimZone({ zone: "miss" }, 0, self, north).zone).toBe("miss");
    expect(classifyAimZone({ zone: "headshot" }, 180, self, north).zone).toBe(
      "miss"
    );
  });

  test.each([
    [90, { latitude: 0, longitude: 0.001, accuracy: 1 }],
    [180, { latitude: -0.001, longitude: 0, accuracy: 1 }],
    [270, { latitude: 0, longitude: -0.001, accuracy: 1 }]
  ])("uses clockwise compass bearing %s", (heading, opponent) => {
    expect(
      classifyAimZone({ zone: "bodyshot" }, heading, self, opponent).zone
    ).toBe("bodyshot");
  });

  test("uses the spherical initial bearing, not a flat latitude/longitude angle", () => {
    const origin = { latitude: 60, longitude: 0, accuracy: 1 };
    const opponent = { latitude: 61, longitude: 1, accuracy: 1 };
    // The initial great-circle bearing is about 25.8°, not the planar 45°.
    expect(
      classifyAimZone({ zone: "headshot" }, 26, origin, opponent).zone
    ).toBe("headshot");
    expect(
      classifyAimZone({ zone: "headshot" }, 60, origin, opponent).zone
    ).toBe("miss");
  });

  test("takes the short route across the international date line", () => {
    const west = { latitude: 0, longitude: 179.999, accuracy: 1 };
    const east = { latitude: 0, longitude: -179.999, accuracy: 1 };
    expect(classifyAimZone({ zone: "bodyshot" }, 90, west, east).zone).toBe(
      "bodyshot"
    );
    expect(classifyAimZone({ zone: "bodyshot" }, 270, west, east).zone).toBe(
      "miss"
    );
    expect(classifyAimZone({ zone: "bodyshot" }, 270, east, west).zone).toBe(
      "bodyshot"
    );
  });

  test.each([null, undefined, NaN, Infinity, -1, 360, 361])(
    "rejects missing or invalid true heading %s",
    (heading) => {
      expect(
        classifyAimZone({ zone: "bodyshot" }, heading, self, north).zone
      ).toBe("miss");
    }
  );

  test.each([
    null,
    undefined,
    { ...north, latitude: NaN },
    { ...north, latitude: Infinity },
    { ...north, latitude: 90.01 },
    { ...north, latitude: -90.01 },
    { ...north, longitude: NaN },
    { ...north, longitude: Infinity },
    { ...north, longitude: 180.01 },
    { ...north, longitude: -180.01 },
    { ...north, accuracy: null },
    { ...north, accuracy: 0 },
    { ...north, accuracy: -1 },
    { ...north, accuracy: NaN },
    { ...north, accuracy: Infinity }
  ])("rejects unusable GPS on either side: %s", (position) => {
    expect(classifyAimZone({ zone: "bodyshot" }, 0, position, north).zone).toBe(
      "miss"
    );
    expect(classifyAimZone({ zone: "bodyshot" }, 0, self, position).zone).toBe(
      "miss"
    );
  });

  test("keeps the pitch result for coincident GPS fixes but rejects antipodal coordinates", () => {
    expect(classifyAimZone({ zone: "bodyshot" }, 0, self, self).zone).toBe(
      "bodyshot"
    );
    expect(
      classifyAimZone(
        { zone: "bodyshot" },
        0,
        { ...self, longitude: -180 },
        { ...self, longitude: 180 }
      ).zone
    ).toBe("bodyshot");
    expect(
      classifyAimZone({ zone: "bodyshot" }, 90, self, {
        ...self,
        longitude: 180
      }).zone
    ).toBe("miss");
  });

  test("keeps a calibrated hit when nearby players' GPS uncertainty overlaps", () => {
    // Players are five metres apart, within ordinary phone GPS uncertainty.
    expect(
      classifyAimZone(
        { zone: "bodyshot" },
        0,
        { ...self, accuracy: 5 },
        { latitude: 0.000045, longitude: 0, accuracy: 5 }
      ).zone
    ).toBe("bodyshot");
  });
  test("only trustworthy geometry records off-target rather than unavailable tracking", () => {
    expect(classifyAimZone({ zone: "bodyshot" }, 180, self, north)).toEqual({
      zone: "miss",
      missReason: "offTarget"
    });
    // Antipodal fixes have no unique bearing, whichever reading is to blame.
    expect(
      classifyAimZone({ zone: "bodyshot" }, 180, self, {
        ...self,
        longitude: 180
      })
    ).toEqual({ zone: "miss", missReason: "trackingUnavailable" });
  });

  test("names the unusable reading, own location and compass first", () => {
    expect(classifyAimZone({ zone: "bodyshot" }, NaN, null, null)).toEqual({
      zone: "miss",
      missReason: "locationUnavailable"
    });
    for (const heading of [null, NaN, -1, 360]) {
      expect(
        classifyAimZone({ zone: "bodyshot" }, heading, self, null)
      ).toEqual({ zone: "miss", missReason: "compassUnavailable" });
    }
    expect(classifyAimZone({ zone: "bodyshot" }, 0, self, null)).toEqual({
      zone: "miss",
      missReason: "opponentLocationUnavailable"
    });
    expect(
      classifyAimZone({ zone: "bodyshot" }, 0, self, {
        ...north,
        accuracy: null
      })
    ).toEqual({ zone: "miss", missReason: "opponentLocationUnavailable" });
  });

  test("preserves known pitch misses even with unavailable or misaligned aim", () => {
    expect(
      classifyAimZone({ zone: "miss", missReason: "tooLow" }, null, null, null)
    ).toEqual({ zone: "miss", missReason: "tooLow" });
    expect(
      classifyAimZone({ zone: "miss", missReason: "tooHigh" }, 180, self, north)
    ).toEqual({ zone: "miss", missReason: "tooHigh" });
    expect(classifyAimZone({ zone: "miss" }, null, null, null)).toEqual({
      zone: "miss"
    });
  });
});
