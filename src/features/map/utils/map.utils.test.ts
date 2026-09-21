import type { NearbyPlayer } from "../types/map.types";
import { spreadOverlappingPlayerMarkers } from "./map.utils";

const samePlacePlayers: NearbyPlayer[] = [
  {
    uid: "player-c",
    displayName: "Charlie",
    coordinate: { latitude: -37.8, longitude: 144.9 },
    lastSeen: new Date("2026-09-21T00:00:00.000Z")
  },
  {
    uid: "player-a",
    displayName: "Alex",
    coordinate: { latitude: -37.8, longitude: 144.9 },
    lastSeen: new Date("2026-09-21T00:00:00.000Z")
  },
  {
    uid: "player-b",
    displayName: "Blair",
    coordinate: { latitude: -37.8, longitude: 144.9 },
    lastSeen: new Date("2026-09-21T00:00:00.000Z")
  }
];

describe("spreadOverlappingPlayerMarkers", () => {
  test("gives every player at the same published coordinate a stable visible position", () => {
    const displayed = spreadOverlappingPlayerMarkers(samePlacePlayers);
    const displayedInReverse = spreadOverlappingPlayerMarkers(
      [...samePlacePlayers].reverse()
    );
    const coordinateKeys = displayed.map(
      ({ coordinate }) => `${coordinate.latitude},${coordinate.longitude}`
    );
    const coordinateByUid = Object.fromEntries(
      displayed.map(({ coordinate, uid }) => [uid, coordinate])
    );
    const reversedCoordinateByUid = Object.fromEntries(
      displayedInReverse.map(({ coordinate, uid }) => [uid, coordinate])
    );

    expect(new Set(coordinateKeys).size).toBe(samePlacePlayers.length);
    expect(reversedCoordinateByUid).toEqual(coordinateByUid);
    expect(
      samePlacePlayers.every(
        ({ coordinate }) =>
          coordinate.latitude === -37.8 && coordinate.longitude === 144.9
      )
    ).toBe(true);
  });
});
