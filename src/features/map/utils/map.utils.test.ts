import type { MapViewport, NearbyPlayer } from "../types/map.types";
import {
  coarsenCoordinates,
  clusterPlayerMarkers,
  regionForCoordinates,
  spreadClusterMembers
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

describe("coarsenCoordinates", () => {
  test("keeps four decimal places in shared coordinates", () => {
    expect(
      coarsenCoordinates({ latitude: -37.800123, longitude: 144.900456 })
    ).toEqual({ latitude: -37.8001, longitude: 144.9005 });
  });
});

// 0.01° across 400 pt: 1 pt = 0.000025°, so 44 pt = 0.0011°.
const viewport: MapViewport = {
  latitude: -37.8,
  longitude: 144.9,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
  width: 400,
  height: 400
};

function playerAt(uid: string, latitude: number, longitude: number) {
  return {
    uid,
    displayName: uid,
    coordinate: { latitude, longitude },
    lastSeen: new Date("2026-09-21T00:00:00.000Z")
  };
}

const memberIds = (clusters: ReturnType<typeof clusterPlayerMarkers>) =>
  clusters.map(({ players }) => players.map(({ uid }) => uid));

describe("clusterPlayerMarkers", () => {
  test("merges players at the same published coordinate into one stable cluster", () => {
    const clusters = clusterPlayerMarkers(samePlacePlayers, viewport);
    const reversed = clusterPlayerMarkers(
      [...samePlacePlayers].reverse(),
      viewport
    );

    expect(memberIds(clusters)).toEqual([["player-a", "player-b", "player-c"]]);
    expect(clusters[0].id).toBe("player-a,player-b,player-c");
    expect(clusters[0].coordinate).toEqual({
      latitude: -37.8,
      longitude: 144.9
    });
    expect(reversed).toEqual(clusters);
  });

  test("merges players closer than the radius on screen and keeps distant ones apart", () => {
    const clusters = clusterPlayerMarkers(
      [
        playerAt("a", -37.8, 144.9),
        playerAt("b", -37.8005, 144.9), // 20 pt away
        playerAt("c", -37.803, 144.9) // 120 pt away
      ],
      viewport
    );

    expect(memberIds(clusters)).toEqual([["a", "b"], ["c"]]);
    expect(clusters[0].coordinate.latitude).toBeCloseTo(-37.80025, 6);
  });

  test("splits a cluster again when zoomed in", () => {
    const players = [
      playerAt("a", -37.8, 144.9),
      playerAt("b", -37.8005, 144.9)
    ];
    const zoomedIn = {
      ...viewport,
      latitudeDelta: 0.001,
      longitudeDelta: 0.001
    };

    expect(memberIds(clusterPlayerMarkers(players, zoomedIn))).toEqual([
      ["a"],
      ["b"]
    ]);
  });

  test("moves markers that would cover You straight above You", () => {
    const user = { latitude: -37.8, longitude: 144.9 };
    const clusters = clusterPlayerMarkers(
      [playerAt("a", -37.8, 144.9), playerAt("b", -37.8003, 144.9003)],
      viewport,
      user
    );

    expect(memberIds(clusters)).toEqual([["a", "b"]]);
    expect(clusters[0].coordinate.longitude).toBe(user.longitude);
    expect(clusters[0].coordinate.latitude).toBeCloseTo(-37.8 + 0.0011, 6);
  });

  test("moves a pin just below You whose body would cover You", () => {
    const user = { latitude: -37.8, longitude: 144.9 };
    // Tip 30 pt below You: the pin body reaches up over You.
    const [cluster] = clusterPlayerMarkers(
      [playerAt("a", -37.80075, 144.9)],
      viewport,
      user
    );

    expect(cluster.coordinate.latitude).toBeCloseTo(-37.8 + 0.0011, 6);
  });

  test("leaves a pin just above You, which points away from You", () => {
    const user = { latitude: -37.8, longitude: 144.9 };
    const player = playerAt("a", -37.79925, 144.9); // tip 30 pt above You

    expect(clusterPlayerMarkers([player], viewport, user)[0].coordinate).toBe(
      player.coordinate
    );
  });

  test("leaves players away from You at their published coordinate", () => {
    const player = playerAt("a", -37.803, 144.9);
    const [cluster] = clusterPlayerMarkers([player], viewport, {
      latitude: -37.8,
      longitude: 144.9
    });

    expect(cluster.coordinate).toBe(player.coordinate);
  });

  test("does not modify the source players", () => {
    const original = JSON.stringify(samePlacePlayers);
    clusterPlayerMarkers(samePlacePlayers, viewport, {
      latitude: -37.8,
      longitude: 144.9
    });

    expect(JSON.stringify(samePlacePlayers)).toBe(original);
  });

  test("shows every player separately before the map size is known", () => {
    expect(
      memberIds(
        clusterPlayerMarkers(samePlacePlayers, { ...viewport, width: 0 })
      )
    ).toEqual([["player-a"], ["player-b"], ["player-c"]]);
  });

  test("returns nothing for no players", () => {
    expect(
      clusterPlayerMarkers([], viewport, { latitude: -37.8, longitude: 144.9 })
    ).toEqual([]);
  });
});

describe("spreadClusterMembers", () => {
  // 1 pt = 0.000025° in `viewport`.
  const toPoints = (degrees: number) => degrees / 0.000025;
  const [cluster] = clusterPlayerMarkers(samePlacePlayers, viewport);

  test("fans members out at least the radius apart and from the centre", () => {
    const spread = spreadClusterMembers(cluster, viewport);

    expect(spread.map(({ uid }) => uid)).toEqual([
      "player-a",
      "player-b",
      "player-c"
    ]);
    spread.forEach(({ coordinate }, index) => {
      const fromCentre = Math.hypot(
        toPoints(coordinate.longitude - cluster.coordinate.longitude),
        toPoints(coordinate.latitude - cluster.coordinate.latitude)
      );
      expect(fromCentre).toBeCloseTo(44, 6);
      spread.slice(index + 1).forEach((other) => {
        expect(
          Math.hypot(
            toPoints(coordinate.longitude - other.coordinate.longitude),
            toPoints(coordinate.latitude - other.coordinate.latitude)
          )
        ).toBeGreaterThanOrEqual(44 - 1e-6);
      });
    });
  });

  test("keeps neighbours apart in a larger cluster", () => {
    const six = Array.from({ length: 6 }, (_, index) =>
      playerAt(`p${index}`, -37.8, 144.9)
    );
    const [bigCluster] = clusterPlayerMarkers(six, viewport);
    const spread = spreadClusterMembers(bigCluster, viewport);

    spread.slice(1).forEach(({ coordinate }, index) => {
      const previous = spread[index].coordinate;
      expect(
        Math.hypot(
          toPoints(coordinate.longitude - previous.longitude),
          toPoints(coordinate.latitude - previous.latitude)
        )
      ).toBeGreaterThanOrEqual(44 - 1e-6);
    });
  });

  test("never fans members below the cluster, where You sits", () => {
    spreadClusterMembers(cluster, viewport).forEach(({ coordinate }) => {
      expect(coordinate.latitude).toBeGreaterThanOrEqual(
        cluster.coordinate.latitude - 1e-9
      );
    });
  });

  test("leaves single players and unmeasured maps unchanged", () => {
    const [single] = clusterPlayerMarkers([samePlacePlayers[0]], viewport);

    expect(spreadClusterMembers(single, viewport)).toBe(single.players);
    expect(spreadClusterMembers(cluster, { ...viewport, height: 0 })).toBe(
      cluster.players
    );
  });
});

describe("regionForCoordinates", () => {
  const size = { width: 400, height: 800 };

  test("centres on the players and frames them with a margin", () => {
    const region = regionForCoordinates(
      [
        { latitude: -37.8, longitude: 144.9 },
        { latitude: -37.81, longitude: 144.9 }
      ],
      size,
      0.001
    );

    expect(region.latitude).toBeCloseTo(-37.805, 9);
    expect(region.longitude).toBeCloseTo(144.9, 9);
    expect(region.latitudeDelta).toBeCloseTo(0.02, 9);
  });

  test("widens for an east-west spread to fit a narrow screen", () => {
    const region = regionForCoordinates(
      [
        { latitude: -37.8, longitude: 144.9 },
        { latitude: -37.8, longitude: 144.91 }
      ],
      size,
      0.001
    );

    expect(region.longitudeDelta).toBeCloseTo(0.02, 9);
  });

  test("never zooms tighter than the minimum span", () => {
    const region = regionForCoordinates(
      [
        { latitude: -37.8, longitude: 144.9 },
        { latitude: -37.8, longitude: 144.9 }
      ],
      size,
      0.001
    );

    expect(region.latitudeDelta).toBe(0.001);
    // Matches the screen aspect so the map need not reshape it.
    expect(region.longitudeDelta).toBeCloseTo(
      (0.001 * 0.5) / Math.cos((-37.8 * Math.PI) / 180),
      12
    );
  });
});
