import { CalibrationMedian } from "./calibrationMedian";

it.each([
  [[1, 1.1, 9], 1.1],
  [[1, 1.1, 1.2, 9], 1.15]
])("uses the recent median for %j", (values, expected) => {
  const median = new CalibrationMedian();
  values.forEach((value, i) => median.sample(value, 100 + i * 20, true));
  expect(median.estimate(200)?.pitch).toBeCloseTo(expected);
});

it("rejects insufficient, invalid and stale readings and clears invalid poses", () => {
  const median = new CalibrationMedian();
  median.sample(1, 100, true);
  median.sample(1, 120, true);
  expect(median.estimate(120)).toBeNull();
  median.sample(NaN, 140, true);
  expect(median.estimate(140)).toBeNull();
  [200, 220, 240].forEach((at) => median.sample(1, at, true));
  expect(median.estimate(240)?.count).toBe(3);
  expect(median.estimate(591)).toBeNull();
  [600, 620, 640].forEach((at) => median.sample(1, at, true));
  median.sample(1, 650, false);
  expect(median.estimate(650)).toBeNull();
  [700, 720, 740].forEach((at) => median.sample(1, at, true));
  median.clear();
  expect(median.estimate(740)).toBeNull();
});
