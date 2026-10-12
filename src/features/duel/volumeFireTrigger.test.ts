import { subscribeVolumeFire } from "./volumeFireTrigger";

const mockNativeListeners = new Set<
  (event: { direction: "up" | "down" }) => void
>();

jest.mock("expo", () => ({
  requireNativeModule: () => ({
    addListener: (
      _name: string,
      listener: (event: { direction: "up" | "down" }) => void
    ) => {
      mockNativeListeners.add(listener);
      return { remove: () => mockNativeListeners.delete(listener) };
    }
  })
}));

it("forwards the native volume direction and removes its listener", () => {
  const onButton = jest.fn();
  const unsubscribe = subscribeVolumeFire(onButton);
  mockNativeListeners.forEach((listener) => listener({ direction: "up" }));
  mockNativeListeners.forEach((listener) => listener({ direction: "down" }));
  expect(onButton.mock.calls.map(([event]) => event.direction)).toEqual([
    "up",
    "down"
  ]);
  unsubscribe();
  expect(mockNativeListeners.size).toBe(0);
});
