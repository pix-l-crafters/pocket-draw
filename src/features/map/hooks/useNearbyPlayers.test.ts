import { act, renderHook } from "@testing-library/react-native";

import { presenceRepository } from "../services/presenceRepository";
import type { Coordinates, NearbyPlayer } from "../types/map.types";
import { useNearbyPlayers } from "./useNearbyPlayers";

jest.mock("../services/presenceRepository", () => ({
  presenceRepository: { subscribeToVisiblePresence: jest.fn() }
}));

type Handlers = Parameters<
  typeof presenceRepository.subscribeToVisiblePresence
>[0];

const origin: Coordinates = { latitude: 0, longitude: 0 };
const now = new Date("2026-10-10T01:00:00Z");

function player(
  uid: string,
  coordinate: Coordinates,
  lastSeen = now
): NearbyPlayer {
  return { uid, displayName: uid, coordinate, lastSeen };
}

describe("useNearbyPlayers", () => {
  let handlers: Handlers;
  let unsubscribe: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    jest.clearAllMocks();
    unsubscribe = jest.fn();
    jest
      .mocked(presenceRepository.subscribeToVisiblePresence)
      .mockImplementation((listeners) => {
        handlers = listeners;
        return unsubscribe;
      });
  });

  afterEach(() => jest.useRealTimers());

  it("counts only players within 500 metres while retaining distant map players", async () => {
    const view = await renderHook(() => useNearbyPlayers("self", origin));
    await act(async () => {
      handlers.onData([
        player("beside", origin),
        player("inside", { latitude: 0.0044965, longitude: 0 }),
        player("outside", { latitude: 0.0044967, longitude: 0 }),
        player("far", { latitude: 0.01, longitude: 0 })
      ]);
    });

    expect(view.result.current?.nearbyPlayers?.map(({ uid }) => uid)).toEqual([
      "beside",
      "inside"
    ]);
    expect(view.result.current?.status).toBe("ready");
    expect(view.result.current).toMatchObject({
      status: "ready",
      players: [
        { uid: "beside" },
        { uid: "inside" },
        { uid: "outside" },
        { uid: "far" }
      ]
    });
  });

  it("accounts for longitude distances at the player's latitude", async () => {
    const view = await renderHook(() =>
      useNearbyPlayers("self", { latitude: 60, longitude: 0 })
    );
    await act(async () => {
      // At 60 degrees latitude, this is about 445 metres east.
      handlers.onData([
        player("east", { latitude: 60, longitude: 0.008 }),
        player("north", { latitude: 60.006, longitude: 0 })
      ]);
    });
    expect(view.result.current?.nearbyPlayers?.map(({ uid }) => uid)).toEqual([
      "east"
    ]);
  });

  it("excludes the current player and presence older than three minutes", async () => {
    const view = await renderHook(() => useNearbyPlayers("self", origin));
    await act(async () => {
      handlers.onData([
        player("self", origin),
        player("active", origin, new Date(now.getTime() - 180_000)),
        player("stale", origin, new Date(now.getTime() - 180_001))
      ]);
    });
    expect(view.result.current?.nearbyPlayers?.map(({ uid }) => uid)).toEqual([
      "active"
    ]);
  });

  it("does not report an empty nearby result before location is available", async () => {
    const view = await renderHook(() => useNearbyPlayers("self", null));
    await act(async () => handlers.onData([player("visible", origin)]));

    expect(view.result.current?.nearbyPlayers).toBeNull();
    expect(view.result.current).toMatchObject({
      status: "ready",
      players: [{ uid: "visible" }]
    });
  });

  it("recalculates nearby players when location becomes available or changes", async () => {
    const view = await renderHook(
      ({ position }: { position: Coordinates | null }) =>
        useNearbyPlayers("self", position),
      { initialProps: { position: null } }
    );
    await act(async () => {
      handlers.onData([
        player("start", origin),
        player("destination", { latitude: 0.01, longitude: 0 })
      ]);
    });
    await view.rerender({ position: origin });
    expect(view.result.current?.nearbyPlayers?.map(({ uid }) => uid)).toEqual([
      "start"
    ]);
    await view.rerender({ position: { latitude: 0.01, longitude: 0 } });
    expect(view.result.current?.nearbyPlayers?.map(({ uid }) => uid)).toEqual([
      "destination"
    ]);
    await view.rerender({ position: null });
    expect(view.result.current?.nearbyPlayers).toBeNull();
    expect(presenceRepository.subscribeToVisiblePresence).toHaveBeenCalledTimes(
      1
    );
  });

  it("removes expired players without waiting for another snapshot", async () => {
    const view = await renderHook(() => useNearbyPlayers("self", origin));
    await act(async () => handlers.onData([player("active", origin)]));
    await act(async () => jest.advanceTimersByTime(240_000));

    expect(view.result.current?.nearbyPlayers).toEqual([]);
    expect(view.result.current).toMatchObject({ status: "ready", players: [] });
  });

  it("removes players when they disappear from visible presence", async () => {
    const view = await renderHook(() => useNearbyPlayers("self", origin));
    await act(async () => handlers.onData([player("active", origin)]));
    await act(async () => handlers.onData([]));
    expect(view.result.current?.nearbyPlayers).toEqual([]);
  });

  it("keeps loading until the first snapshot even after the stale timer runs", async () => {
    const view = await renderHook(() => useNearbyPlayers("self", origin));
    await act(async () => jest.advanceTimersByTime(60_000));
    expect(view.result.current?.status).toBe("loading");
    expect(view.result.current?.nearbyPlayers).toBeNull();
  });

  it("does not replace a subscription error with a zero-player result on a timer", async () => {
    const view = await renderHook(() => useNearbyPlayers("self", origin));
    await act(async () => handlers.onError(new Error("Connection lost")));
    await act(async () => jest.advanceTimersByTime(60_000));
    expect(view.result.current).toEqual({
      status: "error",
      message: "Connection lost",
      nearbyPlayers: null
    });
  });

  it("releases the subscription and timer when the map unmounts", async () => {
    const intervals = jest.spyOn(globalThis, "setInterval");
    const clear = jest.spyOn(globalThis, "clearInterval");
    const view = await renderHook(() => useNearbyPlayers("self", origin));
    const timerIndex = intervals.mock.calls.findIndex(
      ([, delay]) => delay === 60_000
    );
    expect(timerIndex).toBeGreaterThanOrEqual(0);
    const timer = intervals.mock.results[timerIndex].value;
    await view.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledWith(timer);
    intervals.mockRestore();
    clear.mockRestore();
  });
});
