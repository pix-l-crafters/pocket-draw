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
      expect(classifyAimZone("bodyshot", heading, self, north)).toBe(expected);
    }
  );

  test("preserves the supplied pitch zone instead of promoting it", () => {
    expect(classifyAimZone("headshot", 0, self, north)).toBe("headshot");
    expect(classifyAimZone("miss", 0, self, north)).toBe("miss");
    expect(classifyAimZone("headshot", 180, self, north)).toBe("miss");
  });

  test.each([
    [90, { latitude: 0, longitude: 0.001, accuracy: 1 }],
    [180, { latitude: -0.001, longitude: 0, accuracy: 1 }],
    [270, { latitude: 0, longitude: -0.001, accuracy: 1 }]
  ])("uses clockwise compass bearing %s", (heading, opponent) => {
    expect(classifyAimZone("bodyshot", heading, self, opponent)).toBe(
      "bodyshot"
    );
  });

  test("uses the spherical initial bearing, not a flat latitude/longitude angle", () => {
    const origin = { latitude: 60, longitude: 0, accuracy: 1 };
    const opponent = { latitude: 61, longitude: 1, accuracy: 1 };
    // The initial great-circle bearing is about 25.8°, not the planar 45°.
    expect(classifyAimZone("headshot", 26, origin, opponent)).toBe("headshot");
    expect(classifyAimZone("headshot", 60, origin, opponent)).toBe("miss");
  });

  test("takes the short route across the international date line", () => {
    const west = { latitude: 0, longitude: 179.999, accuracy: 1 };
    const east = { latitude: 0, longitude: -179.999, accuracy: 1 };
    expect(classifyAimZone("bodyshot", 90, west, east)).toBe("bodyshot");
    expect(classifyAimZone("bodyshot", 270, west, east)).toBe("miss");
    expect(classifyAimZone("bodyshot", 270, east, west)).toBe("bodyshot");
  });

  test.each([null, undefined, NaN, Infinity, -1, 360, 361])(
    "rejects missing or invalid true heading %s",
    (heading) => {
      expect(classifyAimZone("bodyshot", heading, self, north)).toBe("miss");
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
    expect(classifyAimZone("bodyshot", 0, position, north)).toBe("miss");
    expect(classifyAimZone("bodyshot", 0, self, position)).toBe("miss");
  });

  test("rejects coincident, longitude-equivalent, and antipodal coordinates", () => {
    expect(classifyAimZone("bodyshot", 0, self, self)).toBe("miss");
    expect(
      classifyAimZone(
        "bodyshot",
        0,
        { ...self, longitude: -180 },
        { ...self, longitude: 180 }
      )
    ).toBe("miss");
    expect(
      classifyAimZone("bodyshot", 90, self, { ...self, longitude: 180 })
    ).toBe("miss");
  });

  test("rejects separation hidden inside the combined GPS uncertainty", () => {
    // These readings are about 111m apart, but their uncertainty disks overlap.
    expect(
      classifyAimZone(
        "bodyshot",
        0,
        { ...self, accuracy: 60 },
        { ...north, accuracy: 60 }
      )
    ).toBe("miss");
    expect(
      classifyAimZone(
        "bodyshot",
        0,
        { ...self, accuracy: 50 },
        { ...north, accuracy: 50 }
      )
    ).toBe("bodyshot");
  });
});
