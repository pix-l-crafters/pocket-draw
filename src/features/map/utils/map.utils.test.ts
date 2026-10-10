import type { NearbyPlayer } from "../types/map.types";
import {
  distanceBetweenCoordinatesMetres,
  spreadOverlappingPlayerMarkers
} from "./map.utils";

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
  test("moves a single player away from You at the same coordinate", () => {
    const position = { latitude: -37.8, longitude: 144.9 };
    const displayed = spreadOverlappingPlayerMarkers(
      [samePlacePlayers[0]],
      position
    );

    expect(displayed).toHaveLength(1);
    const separation = distanceBetweenCoordinatesMetres(
      position,
      displayed[0].coordinate
    );
    expect(separation).toBeGreaterThan(39);
    expect(separation).toBeLessThan(41);
  });

  test("matches rounded GPS coordinates but spreads from the exact You position", () => {
    const position = { latitude: -37.8004, longitude: 144.9004 };
    const displayed = spreadOverlappingPlayerMarkers(
      [samePlacePlayers[0]],
      position
    );
    const separation = distanceBetweenCoordinatesMetres(
      position,
      displayed[0].coordinate
    );

    expect(separation).toBeGreaterThan(39);
    expect(separation).toBeLessThan(41);
  });

  test("keeps multiple players separated from You and stable across snapshot order", () => {
    const position = { latitude: -37.8, longitude: 144.9 };
    const displayed = spreadOverlappingPlayerMarkers(
      samePlacePlayers,
      position
    );
    const reversed = spreadOverlappingPlayerMarkers(
      [...samePlacePlayers].reverse(),
      position
    );
    const coordinateByUid = (players: NearbyPlayer[]) =>
      Object.fromEntries(
        players.map(({ uid, coordinate }) => [uid, coordinate])
      );

    expect(displayed).toHaveLength(3);
    expect(coordinateByUid(reversed)).toEqual(coordinateByUid(displayed));
    displayed.forEach(({ coordinate }, index) => {
      expect(
        distanceBetweenCoordinatesMetres(position, coordinate)
      ).toBeGreaterThan(39);
      displayed.slice(index + 1).forEach((other) => {
        expect(
          distanceBetweenCoordinatesMetres(coordinate, other.coordinate)
        ).toBeGreaterThan(39);
      });
    });
  });

  test("preserves source player data and the exact You coordinate", () => {
    const position = { latitude: -37.8004, longitude: 144.9004 };
    const originalPosition = { ...position };
    const originalPlayers = JSON.stringify(samePlacePlayers);
    const displayed = spreadOverlappingPlayerMarkers(
      samePlacePlayers,
      position
    );

    expect(position).toEqual(originalPosition);
    expect(JSON.stringify(samePlacePlayers)).toBe(originalPlayers);
    expect(
      displayed.map(({ uid, displayName, lastSeen }) => ({
        uid,
        displayName,
        lastSeen
      }))
    ).toEqual(
      samePlacePlayers.map(({ uid, displayName, lastSeen }) => ({
        uid,
        displayName,
        lastSeen
      }))
    );
  });

  test("leaves other rounded-location groups on the existing spreading path", () => {
    const position = { latitude: -37.801, longitude: 144.901 };
    expect(spreadOverlappingPlayerMarkers(samePlacePlayers, position)).toEqual(
      spreadOverlappingPlayerMarkers(samePlacePlayers)
    );
    expect(
      spreadOverlappingPlayerMarkers([samePlacePlayers[0]], position)[0]
    ).toBe(samePlacePlayers[0]);
  });

  test("keeps the previous behavior when the current location is unavailable", () => {
    expect(spreadOverlappingPlayerMarkers(samePlacePlayers, null)).toEqual(
      spreadOverlappingPlayerMarkers(samePlacePlayers)
    );
    expect(spreadOverlappingPlayerMarkers([samePlacePlayers[0]], null)[0]).toBe(
      samePlacePlayers[0]
    );
  });

  test("does not add You to an empty player list", () => {
    expect(
      spreadOverlappingPlayerMarkers([], { latitude: -37.8, longitude: 144.9 })
    ).toEqual([]);
  });

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
